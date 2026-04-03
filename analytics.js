// analytics.js - аналитические функции для Memory Chatbot
// Структурированное извлечение и хранение знаний

// ==================== EVIDENCE VALIDATION ====================
/**
 * Проверяет, что цитата действительно принадлежит пользователю
 */
function isUserQuote(quote, history) {
    if (!quote || !history || history.length === 0) return false;
    
    const quoteLower = quote.toLowerCase().trim();
    
    if (quoteLower.length < 5) return false;
    
    const userMessages = history.filter(msg => msg.role === 'user');
    
    for (const msg of userMessages) {
        const msgLower = msg.content.toLowerCase();
        
        if (msgLower.includes(quoteLower)) {
            return true;
        }
        
        const cleanQuote = quoteLower.replace(/[.,!?;:'"«»—–\-]/g, '').trim();
        const cleanMsg = msgLower.replace(/[.,!?;:'"«»—–\-]/g, '').trim();
        
        if (cleanQuote.length >= 10 && cleanMsg.includes(cleanQuote)) {
            return true;
        }
        
        if (cleanQuote.length >= 15) {
            const quoteStart = cleanQuote.substring(0, Math.min(20, cleanQuote.length));
            if (cleanMsg.includes(quoteStart)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Фильтрует evidence, оставляя только цитаты пользователя
 */
function filterUserEvidence(evidence, history) {
    if (!evidence || !Array.isArray(evidence)) return [];
    return evidence.filter(quote => isUserQuote(quote, history));
}

/**
 * Фильтрует элементы контакта, оставляя только с валидными цитатами
 */
function filterSocialItems(items, history) {
    if (!items || !Array.isArray(items)) return [];
    
    return items.filter(item => {
        const validEvidence = filterUserEvidence(item.evidence, history);
        if (validEvidence.length > 0) {
            item.evidence = validEvidence;
            return true;
        }
        return false;
    });
}

// ==================== FACTS EXTRACTION & INTEGRATION ====================
async function extractFactsInformation(history) {
    console.log('[FACTS] extractFactsInformation CALLED');
    
    if (history.length < 1) {
        console.log('[FACTS] No history, skipping');
        return;
    }

    const dialogText = history.map(msg => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    }).join('\n\n');

    const currentData = getFactsData();
    const existingFacts = currentData.facts.filter(f => !f.superseded);
    
    let existingFactsList = '(no existing facts)';
    if (existingFacts.length > 0) {
        existingFactsList = existingFacts.map((f, i) => 
            `${i + 1}. "${f.text}" [${f.confidence}]`
        ).join('\n');
    }

    const langInstruction = currentLanguage !== 'en' 
        ? `Write fact texts in ${getLanguageName()}.` 
        : '';

    const prompt = `You are analyzing a conversation to extract FACTS about the user.

=== DIALOGUE ===
${dialogText}

=== EXISTING FACTS IN DATABASE ===
${existingFactsList}

=== YOUR TASK ===
Extract concrete, specific facts about the user:
- Name, age, location, nationality
- Job, profession, workplace, position
- Interests, hobbies, preferences
- Important life details (family status, pets, etc.)

=== CRITICAL RULES ===
1. Extract ONLY from what USER said (not assistant's assumptions)
2. Each fact must have DIRECT QUOTE from USER as evidence — copy-paste exactly
3. If fact UPDATES existing one → set "updatesFactIndex" to that fact's number
4. If fact CONTRADICTS existing one → set "supersedesFactIndex" to mark old as outdated
5. TO SAVE SPACE: You CAN combine 2-3 related minor existing facts into one broader, comprehensive fact.
   - Set "combinesFactIndices": [1, 3] to mark those old facts as superseded.
6. Don't duplicate existing facts.

=== CONFIDENCE LEVELS ===
• "high" — explicit, clear statement
• "medium" — implied but fairly certain
• "low" — uncertain, might be misinterpreted

=== RESPONSE FORMAT ===
Return ONLY valid JSON, no markdown:
{
    "facts": [
        {
            "text": "Clear, specific fact statement",
            "evidence": ["exact quote from USER's message"],
            "confidence": "low|medium|high",
            "updatesFactIndex": null,
            "supersedesFactIndex": null,
            "combinesFactIndices": null
        }
    ]
}

If no new facts found: {"facts": []}
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2, true);
        console.log('[FACTS] Raw response:', result.substring(0, 500));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.facts && parsed.facts.length > 0) {
            console.log('[FACTS] Extracted:', parsed.facts.length);
            integrateFactsData(parsed.facts, currentData, history);
        } else {
            console.log('[FACTS] No new facts found');
        }
    } catch (error) {
        console.error('[FACTS] Extraction failed:', error.message);
    }
}

function integrateFactsData(newFacts, currentData, history) {
    const messageCount = getMessageCounter();
    const data = { ...currentData, facts: [...currentData.facts] };
    
    console.log('[FACTS] Integrating', newFacts.length, 'new facts');
    
    for (const newFact of newFacts) {
        const validEvidence = filterUserEvidence(newFact.evidence, history);
        console.log(`[FACTS] Evidence validation: ${newFact.evidence?.length || 0} → ${validEvidence.length}`);
        
        // Обработка combinesFactIndices (Объединение мелких фактов)
        if (newFact.combinesFactIndices && Array.isArray(newFact.combinesFactIndices)) {
            const activeFacts = data.facts.filter(f => !f.superseded);
            for (const idx of newFact.combinesFactIndices) {
                const realIdx = idx - 1;
                if (realIdx >= 0 && realIdx < activeFacts.length) {
                    const factToSupersede = activeFacts[realIdx];
                    const actualIdx = data.facts.findIndex(f => f.id === factToSupersede.id);
                    if (actualIdx !== -1) {
                        data.facts[actualIdx].superseded = true;
                        data.facts[actualIdx].updatedAt = messageCount;
                        console.log('[FACTS] Combined away:', data.facts[actualIdx].text.substring(0, 30));
                    }
                }
            }
        }

        // Обработка supersedes
        if (newFact.supersedesFactIndex !== null && newFact.supersedesFactIndex !== undefined) {
            const idx = newFact.supersedesFactIndex - 1;
            const activeFactsBeforeSupersede = data.facts.filter(f => !f.superseded);
            if (idx >= 0 && idx < activeFactsBeforeSupersede.length) {
                const factToSupersede = activeFactsBeforeSupersede[idx];
                const realIdx = data.facts.findIndex(f => f.id === factToSupersede.id);
                if (realIdx !== -1) {
                    data.facts[realIdx].superseded = true;
                    data.facts[realIdx].updatedAt = messageCount;
                    console.log('[FACTS] Superseded:', data.facts[realIdx].text.substring(0, 30));
                }
            }
        }
        
        // Обработка updates
        if (newFact.updatesFactIndex !== null && newFact.updatesFactIndex !== undefined) {
            const idx = newFact.updatesFactIndex - 1;
            const activeFacts = data.facts.filter(f => !f.superseded);
            if (idx >= 0 && idx < activeFacts.length) {
                const factToUpdate = activeFacts[idx];
                const realIdx = data.facts.findIndex(f => f.id === factToUpdate.id);
                if (realIdx !== -1 && validEvidence.length > 0) {
                    const existingEvidence = data.facts[realIdx].evidence || [];
                    data.facts[realIdx].evidence = [...new Set([...existingEvidence, ...validEvidence])].slice(0, LIMITS.evidencePerItem);
                    data.facts[realIdx].updatedAt = messageCount;
                    
                    if (data.facts[realIdx].evidence.length >= 2 && data.facts[realIdx].confidence === 'low') {
                        data.facts[realIdx].confidence = 'medium';
                    }
                    if (data.facts[realIdx].evidence.length >= 3 && data.facts[realIdx].confidence === 'medium') {
                        data.facts[realIdx].confidence = 'high';
                    }
                    
                    console.log('[FACTS] Updated:', data.facts[realIdx].text.substring(0, 30));
                    continue;
                } else if (validEvidence.length === 0) {
                    console.log('[FACTS] Update skipped - no valid evidence');
                    continue;
                }
            }
        }
        
        if (validEvidence.length === 0) {
            console.log('[FACTS] New fact skipped - no valid user evidence:', newFact.text?.substring(0, 30));
            continue;
        }
        
        const isDuplicate = data.facts.some(f => 
            !f.superseded && 
            (f.text.toLowerCase().includes(newFact.text.toLowerCase().substring(0, 20)) ||
             newFact.text.toLowerCase().includes(f.text.toLowerCase().substring(0, 20)))
        );
        
        if (isDuplicate) {
            console.log('[FACTS] Duplicate skipped:', newFact.text.substring(0, 30));
            continue;
        }
        
        const fact = {
            id: generateId('fact'),
            text: newFact.text,
            evidence: validEvidence.slice(0, LIMITS.evidencePerItem),
            confidence: newFact.confidence || 'medium',
            createdAt: messageCount,
            updatedAt: messageCount,
            superseded: false
        };
        
        data.facts.push(fact);
        console.log('[FACTS] Added:', fact.text.substring(0, 40), `(${validEvidence.length} evidence)`);
    }
    
    // Всегда вызываем тримминг, чтобы очищать superseded мусор
    trimFactsByImportance(data);
    
    setFactsData(data);
    console.log('[FACTS] Total facts (active):', data.facts.filter(f => !f.superseded).length);
}

function trimFactsByImportance(data) {
    const active = data.facts.filter(f => !f.superseded);
    const superseded = data.facts.filter(f => f.superseded);
    
    // Оставляем только 3 последних удаленных/объединенных факта для истории, остальные стираем навсегда
    const keepSuperseded = superseded.slice(-3);
    
    if (active.length <= LIMITS.facts) {
        data.facts = [...active, ...keepSuperseded];
        return;
    }
    
    const currentMsgCount = getMessageCounter();
    
    const scored = active.map(f => {
        // Базовая оценка (чем выше уверенность и больше доказательств, тем лучше)
        const baseScore = (CONFIDENCE_LEVELS.indexOf(f.confidence) + 1) * 10 + (f.evidence?.length || 0) * 5;
        
        // Иммунитет для новичков (Recency Bonus)
        const age = currentMsgCount - (f.createdAt || currentMsgCount);
        const recencyBonus = age < 30 ? 50 : (age < 100 ? 20 : 0);
        
        return {
            fact: f,
            score: baseScore + recencyBonus
        };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const keepActive = scored.slice(0, LIMITS.facts).map(s => s.fact);
    
    data.facts = [...keepActive, ...keepSuperseded];
    console.log(`[FACTS] Trimmed to ${keepActive.length} active facts (kept ${keepSuperseded.length} superseded)`);
}

// ==================== TRAITS EXTRACTION & INTEGRATION ====================
async function extractTraitsInformation(history) {
    console.log('[TRAITS] extractTraitsInformation CALLED');
    
    if (history.length < 1) {
        console.log('[TRAITS] No history, skipping');
        return;
    }

    const dialogText = history.map(msg => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    }).join('\n\n');

    const currentData = getTraitsData();
    const existingTraits = currentData.traits.filter(t => !t.superseded);
    
    let existingTraitsList = '(no existing traits)';
    if (existingTraits.length > 0) {
        existingTraitsList = existingTraits.map((t, i) => 
            `${i + 1}. "${t.text}" [${t.confidence}]`
        ).join('\n');
    }

    const langInstruction = currentLanguage !== 'en' 
        ? `Write trait texts in ${getLanguageName()}.` 
        : '';

    const prompt = `You are a psychologist analyzing a conversation to extract PERSONALITY TRAITS of the user.

=== DIALOGUE ===
${dialogText}

=== EXISTING TRAITS IN DATABASE ===
${existingTraitsList}

=== YOUR TASK ===
Extract personality characteristics. 
CRITICAL REQUIREMENT FOR BREVITY: Traits MUST be extremely concise. Maximum 1 short sentence or a phrase. DO NOT write long paragraphs or stories. Long traits become obsolete too quickly.

=== CRITICAL RULES ===
1. Base traits on USER'S actual behavior and words.
2. Direct quote from USER is required as evidence.
3. Keep the text SHORT, CONCISE, and TO THE POINT (e.g. "Analytical thinker", "Values honesty over comfort").
4. You CAN combine related existing traits into a clearer one:
   - Set "combinesTraitIndices": [2, 5] to mark old ones as superseded.
5. If new info REFINES existing trait → set "updatesTraitIndex".

=== CONFIDENCE LEVELS ===
• "high" — clear pattern visible across multiple statements
• "medium" — reasonable inference from 1-2 observations  
• "low" — single instance, might not be representative

=== GOOD TRAIT EXAMPLES (Short & Concise) ===
✓ "Аналитическое мышление"
✓ "Интроверт, раскрывается в близком кругу"
✓ "Перфекционист в работе"
✓ "Склонен к самоиронии"

=== BAD TRAIT EXAMPLES (Too long or vague) ===
✗ "Пользователь сказал, что он работает на заводе и поэтому он очень устает по вечерам, что делает его раздражительным." (Too long, contains facts, not a pure trait)
✗ "Хороший человек" (Too vague)
✗ "Любит музыку" (This is a FACT, not a trait)

=== RESPONSE FORMAT ===
Return ONLY valid JSON:
{
    "traits": [
        {
            "text": "Very short, nuanced personality trait",
            "evidence": ["exact quote from USER showing this trait"],
            "confidence": "low|medium|high",
            "updatesTraitIndex": null,
            "combinesTraitIndices": null
        }
    ]
}

If no new traits: {"traits": []}
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2, true);
        console.log('[TRAITS] Raw response:', result.substring(0, 500));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.traits && parsed.traits.length > 0) {
            console.log('[TRAITS] Extracted:', parsed.traits.length);
            integrateTraitsData(parsed.traits, currentData, history);
        } else {
            console.log('[TRAITS] No new traits found');
        }
    } catch (error) {
        console.error('[TRAITS] Extraction failed:', error.message);
    }
}

function integrateTraitsData(newTraits, currentData, history) {
    const messageCount = getMessageCounter();
    const data = { ...currentData, traits: [...currentData.traits] };
    
    console.log('[TRAITS] Integrating', newTraits.length, 'new traits');
    
    for (const newTrait of newTraits) {
        const validEvidence = filterUserEvidence(newTrait.evidence, history);
        console.log(`[TRAITS] Evidence validation: ${newTrait.evidence?.length || 0} → ${validEvidence.length}`);
        
        // Обработка combines
        if (newTrait.combinesTraitIndices && Array.isArray(newTrait.combinesTraitIndices)) {
            const activeTraits = data.traits.filter(t => !t.superseded);
            for (const idx of newTrait.combinesTraitIndices) {
                const realIdx = idx - 1;
                if (realIdx >= 0 && realIdx < activeTraits.length) {
                    const traitToSupersede = activeTraits[realIdx];
                    const actualIdx = data.traits.findIndex(t => t.id === traitToSupersede.id);
                    if (actualIdx !== -1) {
                        data.traits[actualIdx].superseded = true;
                        data.traits[actualIdx].updatedAt = messageCount;
                        console.log('[TRAITS] Combined away:', data.traits[actualIdx].text.substring(0, 30));
                    }
                }
            }
        }
        
        // Обработка updates
        if (newTrait.updatesTraitIndex !== null && newTrait.updatesTraitIndex !== undefined) {
            const idx = newTrait.updatesTraitIndex - 1;
            const activeTraits = data.traits.filter(t => !t.superseded);
            if (idx >= 0 && idx < activeTraits.length) {
                const traitToUpdate = activeTraits[idx];
                const realIdx = data.traits.findIndex(t => t.id === traitToUpdate.id);
                if (realIdx !== -1 && validEvidence.length > 0) {
                    const existingEvidence = data.traits[realIdx].evidence || [];
                    data.traits[realIdx].evidence = [...new Set([...existingEvidence, ...validEvidence])].slice(0, LIMITS.evidencePerItem);
                    data.traits[realIdx].updatedAt = messageCount;
                    
                    if (data.traits[realIdx].evidence.length >= 2 && data.traits[realIdx].confidence === 'low') {
                        data.traits[realIdx].confidence = 'medium';
                    }
                    if (data.traits[realIdx].evidence.length >= 3 && data.traits[realIdx].confidence === 'medium') {
                        data.traits[realIdx].confidence = 'high';
                    }
                    
                    console.log('[TRAITS] Updated:', data.traits[realIdx].text.substring(0, 30));
                    continue;
                } else if (validEvidence.length === 0) {
                    console.log('[TRAITS] Update skipped - no valid evidence');
                    continue;
                }
            }
        }
        
        if (validEvidence.length === 0) {
            console.log('[TRAITS] New trait skipped - no valid user evidence:', newTrait.text?.substring(0, 30));
            continue;
        }
        
        const isDuplicate = data.traits.some(t => 
            !t.superseded && 
            (t.text.toLowerCase().includes(newTrait.text.toLowerCase().substring(0, 15)) ||
             newTrait.text.toLowerCase().includes(t.text.toLowerCase().substring(0, 15)))
        );
        
        if (isDuplicate) {
            console.log('[TRAITS] Duplicate skipped:', newTrait.text.substring(0, 30));
            continue;
        }
        
        const trait = {
            id: generateId('trait'),
            text: newTrait.text,
            evidence: validEvidence.slice(0, LIMITS.evidencePerItem),
            confidence: newTrait.confidence || 'medium',
            createdAt: messageCount,
            updatedAt: messageCount,
            superseded: false
        };
        
        data.traits.push(trait);
        console.log('[TRAITS] Added:', trait.text.substring(0, 40), `(${validEvidence.length} evidence)`);
    }
    
    trimTraitsByImportance(data);
    
    setTraitsData(data);
    console.log('[TRAITS] Total traits (active):', data.traits.filter(t => !t.superseded).length);
}

function trimTraitsByImportance(data) {
    const active = data.traits.filter(t => !t.superseded);
    const superseded = data.traits.filter(t => t.superseded);
    
    const keepSuperseded = superseded.slice(-3); // Оставляем только 3 для истории
    
    if (active.length <= LIMITS.traits) {
        data.traits = [...active, ...keepSuperseded];
        return;
    }
    
    const currentMsgCount = getMessageCounter();
    
    const scored = active.map(t => {
        const baseScore = (CONFIDENCE_LEVELS.indexOf(t.confidence) + 1) * 10 + (t.evidence?.length || 0) * 5;
        
        // Иммунитет для новичков (Recency Bonus)
        const age = currentMsgCount - (t.createdAt || currentMsgCount);
        const recencyBonus = age < 30 ? 50 : (age < 100 ? 20 : 0);
        
        return {
            trait: t,
            score: baseScore + recencyBonus
        };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const keepActive = scored.slice(0, LIMITS.traits).map(s => s.trait);
    
    data.traits = [...keepActive, ...keepSuperseded];
    console.log(`[TRAITS] Trimmed to ${keepActive.length} active traits (kept ${keepSuperseded.length} superseded)`);
}

// ==================== TIMELINE EXTRACTION & INTEGRATION ====================
async function extractTimelineInformation(history) {
    console.log('[TIMELINE] extractTimelineInformation CALLED');
    
    if (history.length < 1) {
        console.log('[TIMELINE] No history, skipping');
        return;
    }

    const dialogText = history.map(msg => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    }).join('\n\n');

    const currentData = getTimelineData();
    const existingEvents = currentData.events.filter(e => !e.superseded);
    
    let existingEventsList = '(no existing events)';
    if (existingEvents.length > 0) {
        existingEventsList = existingEvents.map((e, i) => {
            const dateStr = e.date?.exact || e.date?.description || 'no date';
            return `${i + 1}. [${e.type}] "${e.text}" (${dateStr})`;
        }).join('\n');
    }

    const langInstruction = currentLanguage !== 'en' 
        ? `Write event texts in ${getLanguageName()}.` 
        : '';

    const prompt = `You are analyzing a conversation to extract TIMELINE EVENTS about the user's life.

=== DIALOGUE ===
${dialogText}

=== EXISTING TIMELINE ===
${existingEventsList}

=== YOUR TASK ===
Extract life events, ongoing periods, and future plans:

**EVENTS** (one-time occurrences):
- Graduated, moved, got married, got a job, etc.

**PERIODS** (durations with start, possibly ongoing):
- Working at company X, studying Y, living in Z, relationship status

**PLANS** (future intentions):
- Planning to move, want to learn, going to travel, etc.

=== CRITICAL RULES ===
1. Extract ONLY from USER's words, not assistant's
2. Each event must have DIRECT QUOTE from USER as evidence — copy-paste exactly
3. Determine TYPE: "event" (one-time), "period" (duration), "plan" (future)
4. For dates, capture what user said:
   - "exact": "2024-03-15" — if specific date mentioned
   - "description": "в детстве", "пару лет назад", "в следующем году" — for vague references
   - "precision": "exact" | "approximate" | "vague"
5. For periods: set "ongoing": true if still happening ("I work at..." = ongoing)
6. If updates existing event → set "updatesEventIndex"
7. If contradicts/outdates existing → set "supersedesEventIndex"

=== DATE EXAMPLES ===
• "I started in 2020" → date: {exact: "2020", precision: "approximate"}
• "When I was a kid" → date: {description: "в детстве", precision: "vague"}
• "Next summer" → date: {description: "следующим летом", precision: "approximate"}
• "March 15th" → date: {exact: "03-15", precision: "exact"}

=== IMPORTANT ===
Evidence must be USER's EXACT words. Not paraphrased!

=== RESPONSE FORMAT ===
Return ONLY valid JSON:
{
    "events": [
        {
            "text": "Event description",
            "type": "event|period|plan",
            "date": {
                "exact": "2024-03-15 or null",
                "description": "vague description or null",
                "precision": "exact|approximate|vague"
            },
            "endDate": null,
            "ongoing": false,
            "evidence": ["exact quote from USER"],
            "confidence": "low|medium|high",
            "updatesEventIndex": null,
            "supersedesEventIndex": null
        }
    ]
}

If no timeline info: {"events": []}
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2, true);
        console.log('[TIMELINE] Raw response:', result.substring(0, 500));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.events && parsed.events.length > 0) {
            console.log('[TIMELINE] Extracted:', parsed.events.length);
            integrateTimelineData(parsed.events, currentData, history);
        } else {
            console.log('[TIMELINE] No new events found');
        }
    } catch (error) {
        console.error('[TIMELINE] Extraction failed:', error.message);
    }
}

function integrateTimelineData(newEvents, currentData, history) {
    const messageCount = getMessageCounter();
    const data = { ...currentData, events: [...currentData.events] };
    
    console.log('[TIMELINE] Integrating', newEvents.length, 'new events');
    
    for (const newEvent of newEvents) {
        const validEvidence = filterUserEvidence(newEvent.evidence, history);
        console.log(`[TIMELINE] Evidence validation: ${newEvent.evidence?.length || 0} → ${validEvidence.length}`);
        
        // Обработка supersedes
        if (newEvent.supersedesEventIndex !== null && newEvent.supersedesEventIndex !== undefined) {
            const idx = newEvent.supersedesEventIndex - 1;
            const activeEvents = data.events.filter(e => !e.superseded);
            if (idx >= 0 && idx < activeEvents.length) {
                const eventToSupersede = activeEvents[idx];
                const realIdx = data.events.findIndex(e => e.id === eventToSupersede.id);
                if (realIdx !== -1) {
                    data.events[realIdx].superseded = true;
                    data.events[realIdx].updatedAt = messageCount;
                    console.log('[TIMELINE] Superseded:', data.events[realIdx].text.substring(0, 30));
                }
            }
        }
        
        // Обработка updates
        if (newEvent.updatesEventIndex !== null && newEvent.updatesEventIndex !== undefined) {
            const idx = newEvent.updatesEventIndex - 1;
            const activeEvents = data.events.filter(e => !e.superseded);
            if (idx >= 0 && idx < activeEvents.length) {
                const eventToUpdate = activeEvents[idx];
                const realIdx = data.events.findIndex(e => e.id === eventToUpdate.id);
                if (realIdx !== -1 && validEvidence.length > 0) {
                    const existingEvidence = data.events[realIdx].evidence || [];
                    data.events[realIdx].evidence = [...new Set([...existingEvidence, ...validEvidence])].slice(0, LIMITS.evidencePerItem);
                    data.events[realIdx].updatedAt = messageCount;
                    
                    if (newEvent.date?.exact && !data.events[realIdx].date?.exact) {
                        data.events[realIdx].date = newEvent.date;
                    }
                    
                    if (newEvent.ongoing !== undefined) {
                        data.events[realIdx].ongoing = newEvent.ongoing;
                    }
                    
                    console.log('[TIMELINE] Updated:', data.events[realIdx].text.substring(0, 30));
                    continue;
                } else if (validEvidence.length === 0) {
                    console.log('[TIMELINE] Update skipped - no valid evidence');
                    continue;
                }
            }
        }
        
        if (validEvidence.length === 0) {
            console.log('[TIMELINE] New event skipped - no valid user evidence:', newEvent.text?.substring(0, 30));
            continue;
        }
        
        const isDuplicate = data.events.some(e => 
            !e.superseded && 
            (e.text.toLowerCase().includes(newEvent.text.toLowerCase().substring(0, 15)) ||
             newEvent.text.toLowerCase().includes(e.text.toLowerCase().substring(0, 15)))
        );
        
        if (isDuplicate) {
            console.log('[TIMELINE] Duplicate skipped:', newEvent.text.substring(0, 30));
            continue;
        }
        
        const event = {
            id: generateId('event'),
            text: newEvent.text,
            type: newEvent.type || 'event',
            date: newEvent.date || { exact: null, description: null, precision: 'vague' },
            endDate: newEvent.endDate || null,
            ongoing: newEvent.ongoing || false,
            evidence: validEvidence.slice(0, LIMITS.evidencePerItem),
            confidence: newEvent.confidence || 'medium',
            createdAt: messageCount,
            updatedAt: messageCount,
            superseded: false
        };
        
        data.events.push(event);
        console.log('[TIMELINE] Added:', event.text.substring(0, 40), `(${validEvidence.length} evidence)`);
    }
    
    trimTimelineByImportance(data);
    
    setTimelineData(data);
    console.log('[TIMELINE] Total events (active):', data.events.filter(e => !e.superseded).length);
}

function trimTimelineByImportance(data) {
    const active = data.events.filter(e => !e.superseded);
    const superseded = data.events.filter(e => e.superseded);
    
    const keepSuperseded = superseded.slice(-3); // Оставляем только 3 для истории
    
    if (active.length <= LIMITS.timeline) {
        data.events = [...active, ...keepSuperseded];
        return;
    }
    
    const currentMsgCount = getMessageCounter();
    
    const scored = active.map(e => {
        let baseScore = (CONFIDENCE_LEVELS.indexOf(e.confidence) + 1) * 10;
        if (e.ongoing) baseScore += 30;
        if (e.type === 'plan') baseScore += 20;
        if (e.type === 'period') baseScore += 10;
        
        // Иммунитет для новичков (Recency Bonus)
        const age = currentMsgCount - (e.createdAt || currentMsgCount);
        const recencyBonus = age < 30 ? 50 : (age < 100 ? 20 : 0);
        
        return { event: e, score: baseScore + recencyBonus };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const keepActive = scored.slice(0, LIMITS.timeline).map(s => s.event);
    
    data.events = [...keepActive, ...keepSuperseded];
    console.log(`[TIMELINE] Trimmed to ${keepActive.length} active events (kept ${keepSuperseded.length} superseded)`);
}

// ==================== SOCIAL EXTRACTION & INTEGRATION ====================
async function extractSocialInformation(history) {
    console.log('[SOCIAL] extractSocialInformation CALLED');
    
    if (history.length < 1) {
        console.log('[SOCIAL] No history, skipping');
        return;
    }

    const dialogText = history.map(msg => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    }).join('\n\n');

    const currentData = getSocialData();
    
    let existingContactsList = '(no existing contacts)';
    if (currentData.contacts.length > 0) {
        existingContactsList = currentData.contacts.map(c => {
            const aliases = c.aliases?.length > 0 ? ` (aliases: ${c.aliases.join(', ')})` : '';
            return `• "${c.name}"${aliases} — ${c.relation}`;
        }).join('\n');
    }

    const langInstruction = currentLanguage !== 'en' 
        ? `Write in ${getLanguageName()}.` 
        : '';

    const prompt = `You are analyzing a conversation to extract information about PEOPLE mentioned by the user.

=== DIALOGUE ===
${dialogText}

=== EXISTING CONTACTS IN DATABASE ===
${existingContactsList}

=== YOUR TASK ===
Extract ALL information about people the user mentions:
1. NEW people not in database → create new contact
2. EXISTING people (match by name/alias/relation) → ADD new facts via possibleMergeWith

=== CRITICAL RULES ===
• Extract info ONLY from what USER said, not assistant
• Each fact/trait/interaction must have DIRECT QUOTE from USER — copy-paste exactly
• Match people intelligently:
  - "дочка", "daughter", "дочь" = same person if relation is family
  - "wife", "жена", "супруга" = same person  
  - "мой друг Саша" and "Саша" = likely same person
• When in doubt → MERGE (set possibleMergeWith to existing contact name)
• Extract EVERY detail mentioned about ANY person

=== WHAT TO EXTRACT ===
**Facts**: objective information (age, job, where they live, etc.)
**Traits**: personality characteristics (kind, stubborn, funny)
**Interactions**: what happened between user and this person

=== IMPORTANT ===
Evidence must be USER's EXACT words. Not paraphrased!

=== RESPONSE FORMAT ===
Return ONLY valid JSON:
{
    "contacts": [
        {
            "name": "Name as mentioned by user",
            "possibleAliases": ["other names/nicknames"],
            "relation": "family/friend/colleague/acquaintance/other",
            "sentiment": "positive/neutral/negative",
            "facts": [{"text": "fact about person", "evidence": ["exact USER quote"]}],
            "traits": [{"text": "personality trait", "evidence": ["exact USER quote"]}],
            "interactions": [{"text": "what happened", "evidence": ["exact USER quote"]}],
            "possibleMergeWith": "EXISTING contact name if same person, or null"
        }
    ]
}

If no people mentioned: {"contacts": []}
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2, true);
        console.log('[SOCIAL] Raw response:', result.substring(0, 500));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.contacts && parsed.contacts.length > 0) {
            console.log('[SOCIAL] Extracted:', parsed.contacts.length);
            integrateSocialData(parsed.contacts, history);
        } else {
            console.log('[SOCIAL] No people mentioned');
        }
    } catch (error) {
        console.error('[SOCIAL] Extraction failed:', error.message);
    }
}

function integrateSocialData(newContacts, history) {
    console.log('[SOCIAL] Integrating', newContacts.length, 'contacts');
    
    const data = getSocialData();
    const messageCount = getMessageCounter();
    
    for (const newContact of newContacts) {
        const validatedFacts = filterSocialItems(newContact.facts, history);
        const validatedTraits = filterSocialItems(newContact.traits, history);
        const validatedInteractions = filterSocialItems(newContact.interactions, history);
        
        const totalValidItems = validatedFacts.length + validatedTraits.length + validatedInteractions.length;
        
        console.log(`[SOCIAL] ${newContact.name}: validated items = ${totalValidItems}`);
        
        if (totalValidItems === 0) {
            console.log('[SOCIAL] Contact skipped - no valid user evidence:', newContact.name);
            continue;
        }
        
        let existingContact = null;
        
        if (newContact.possibleMergeWith) {
            existingContact = data.contacts.find(c => 
                c.name.toLowerCase() === newContact.possibleMergeWith.toLowerCase() ||
                (c.aliases || []).some(a => a.toLowerCase() === newContact.possibleMergeWith.toLowerCase())
            );
        }
        
        if (!existingContact) {
            existingContact = data.contacts.find(c => 
                c.name.toLowerCase() === newContact.name.toLowerCase() ||
                (c.aliases || []).some(a => a.toLowerCase() === newContact.name.toLowerCase())
            );
        }
        
        if (!existingContact && newContact.possibleAliases) {
            for (const alias of newContact.possibleAliases) {
                existingContact = data.contacts.find(c => 
                    c.name.toLowerCase() === alias.toLowerCase() ||
                    (c.aliases || []).some(a => a.toLowerCase() === alias.toLowerCase())
                );
                if (existingContact) break;
            }
        }
        
        if (!existingContact) {
            existingContact = findContactFuzzy(newContact.name, newContact.relation, data.contacts);
        }
        
        const validatedContact = {
            ...newContact,
            facts: validatedFacts,
            traits: validatedTraits,
            interactions: validatedInteractions
        };
        
        if (existingContact) {
            updateExistingContact(data, existingContact.id, validatedContact, messageCount);
        } else {
            const contact = createNewContact(validatedContact, messageCount);
            data.contacts.push(contact);
            console.log('[SOCIAL] Created:', contact.name);
        }
    }
    
    checkForMerges(data);
    trimContacts(data);
    setSocialData(data);
    
    console.log('[SOCIAL] Total contacts:', data.contacts.length);
}

function findContactFuzzy(name, relation, contacts) {
    if (!name || !contacts || contacts.length === 0) return null;
    
    const nameLower = name.toLowerCase().trim();
    
    const familySynonyms = [
        ['дочь', 'дочка', 'дочурка', 'daughter', 'child', 'kid', 'girl'],
        ['сын', 'сынок', 'son', 'child', 'kid', 'boy'],
        ['жена', 'супруга', 'wife', 'spouse'],
        ['муж', 'супруг', 'husband', 'spouse'],
        ['мама', 'мать', 'mom', 'mother', 'мамочка'],
        ['папа', 'отец', 'dad', 'father', 'батя'],
        ['бабушка', 'бабуля', 'grandmother', 'grandma'],
        ['дедушка', 'дедуля', 'grandfather', 'grandpa'],
        ['сестра', 'sister', 'сестрёнка'],
        ['брат', 'brother', 'братик']
    ];
    
    let synonymGroup = null;
    for (const group of familySynonyms) {
        if (group.some(s => nameLower.includes(s) || s.includes(nameLower))) {
            synonymGroup = group;
            break;
        }
    }
    
    for (const contact of contacts) {
        const contactNameLower = contact.name.toLowerCase().trim();
        const contactAliases = (contact.aliases || []).map(a => a.toLowerCase().trim());
        const allContactNames = [contactNameLower, ...contactAliases];
        
        if (synonymGroup && (contact.relation === relation || contact.relation === 'family' || relation === 'family')) {
            for (const contactName of allContactNames) {
                if (synonymGroup.some(s => contactName.includes(s) || s.includes(contactName))) {
                    return contact;
                }
            }
        }
        
        if (nameLower.length >= 3) {
            for (const contactName of allContactNames) {
                if (contactName.length >= 3) {
                    if (contactName.includes(nameLower) || nameLower.includes(contactName)) {
                        return contact;
                    }
                }
            }
        }
    }
    
    return null;
}

function updateExistingContact(data, contactId, newData, messageCount) {
    const contact = data.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    contact.lastMentioned = messageCount;
    
    if (newData.name && newData.name.toLowerCase() !== contact.name.toLowerCase()) {
        contact.aliases = contact.aliases || [];
        if (!contact.aliases.map(a => a.toLowerCase()).includes(newData.name.toLowerCase())) {
            contact.aliases.push(newData.name);
        }
    }
    
    if (newData.possibleAliases) {
        contact.aliases = contact.aliases || [];
        for (const alias of newData.possibleAliases) {
            if (!contact.aliases.map(a => a.toLowerCase()).includes(alias.toLowerCase()) &&
                alias.toLowerCase() !== contact.name.toLowerCase()) {
                contact.aliases.push(alias);
            }
        }
    }
    
    if (newData.sentiment && newData.sentiment !== 'neutral') {
        contact.sentiment = newData.sentiment;
    }
    if (newData.relation && newData.relation !== 'unknown' && 
        (!contact.relation || contact.relation === 'unknown')) {
        contact.relation = newData.relation;
    }
    
    contact.facts = contact.facts || [];
    for (const newFact of (newData.facts || [])) {
        const exists = contact.facts.some(f => 
            f.text.toLowerCase().includes(newFact.text.toLowerCase().substring(0, 15)) ||
            newFact.text.toLowerCase().includes(f.text.toLowerCase().substring(0, 15))
        );
        if (!exists) {
            contact.facts.push({
                text: newFact.text,
                evidence: (newFact.evidence || []).slice(0, LIMITS.evidencePerItem),
                strength: (newFact.evidence || []).length || 1
            });
        }
    }
    
    contact.traits = contact.traits || [];
    for (const newTrait of (newData.traits || [])) {
        const exists = contact.traits.some(t => 
            t.text.toLowerCase().includes(newTrait.text.toLowerCase().substring(0, 15)) ||
            newTrait.text.toLowerCase().includes(t.text.toLowerCase().substring(0, 15))
        );
        if (!exists) {
            contact.traits.push({
                text: newTrait.text,
                evidence: (newTrait.evidence || []).slice(0, LIMITS.evidencePerItem),
                strength: (newTrait.evidence || []).length || 1
            });
        }
    }
    
    contact.interactions = contact.interactions || [];
    for (const newInt of (newData.interactions || [])) {
        const exists = contact.interactions.some(i => 
            i.text.toLowerCase().includes(newInt.text.toLowerCase().substring(0, 15)) ||
            newInt.text.toLowerCase().includes(i.text.toLowerCase().substring(0, 15))
        );
        if (!exists) {
            contact.interactions.push({
                text: newInt.text,
                evidence: (newInt.evidence || []).slice(0, LIMITS.evidencePerItem),
                strength: (newInt.evidence || []).length || 1
            });
        }
    }
    
    console.log('[SOCIAL] Updated:', contact.name);
}

function createNewContact(data, messageCount) {
    return {
        id: generateId('contact'),
        name: data.name,
        aliases: data.possibleAliases || [],
        relation: data.relation || 'unknown',
        sentiment: data.sentiment || 'neutral',
        facts: (data.facts || []).map(f => ({
            text: f.text,
            evidence: (f.evidence || []).slice(0, LIMITS.evidencePerItem),
            strength: (f.evidence || []).length || 1
        })),
        traits: (data.traits || []).map(t => ({
            text: t.text,
            evidence: (t.evidence || []).slice(0, LIMITS.evidencePerItem),
            strength: (t.evidence || []).length || 1
        })),
        interactions: (data.interactions || []).map(i => ({
            text: i.text,
            evidence: (i.evidence || []).slice(0, LIMITS.evidencePerItem),
            strength: (i.evidence || []).length || 1
        })),
        createdAt: messageCount,
        lastMentioned: messageCount
    };
}

function trimContacts(data) {
    if (data.contacts.length <= SOCIAL_CONFIG.maxContacts) return;
    
    const currentMsgCount = getMessageCounter();
    
    const scored = data.contacts.map(c => {
        const baseScore = (c.facts?.length || 0) + (c.traits?.length || 0) + (c.interactions?.length || 0);
        
        // Иммунитет для недавно упомянутых людей или только что созданных
        const age = currentMsgCount - (c.lastMentioned || c.createdAt || currentMsgCount);
        const recencyBonus = age < 30 ? 50 : (age < 100 ? 20 : 0);
        
        return {
            contact: c,
            score: baseScore * 10 + recencyBonus // Умножаем на 10, чтобы выровнять вес фактов и бонуса
        };
    });
    
    scored.sort((a, b) => b.score - a.score);
    data.contacts = scored.slice(0, SOCIAL_CONFIG.maxContacts).map(s => s.contact);
    console.log('[SOCIAL] Trimmed to', data.contacts.length);
}

function checkForMerges(data) {
    if (data.contacts.length < 2) return;
    
    for (let i = 0; i < data.contacts.length; i++) {
        for (let j = i + 1; j < data.contacts.length; j++) {
            const c1 = data.contacts[i];
            const c2 = data.contacts[j];
            
            const c1Names = [c1.name.toLowerCase(), ...(c1.aliases || []).map(a => a.toLowerCase())];
            const c2Names = [c2.name.toLowerCase(), ...(c2.aliases || []).map(a => a.toLowerCase())];
            
            const overlap = c1Names.some(n => c2Names.includes(n));
            
            if (overlap) {
                console.log('[SOCIAL] Merging:', c1.name, '+', c2.name);
                
                c1.aliases = [...new Set([...(c1.aliases || []), c2.name, ...(c2.aliases || [])])];
                c1.aliases = c1.aliases.filter(a => a.toLowerCase() !== c1.name.toLowerCase());
                
                for (const f of (c2.facts || [])) {
                    if (!(c1.facts || []).some(x => x.text === f.text)) {
                        c1.facts = c1.facts || [];
                        c1.facts.push(f);
                    }
                }
                for (const t of (c2.traits || [])) {
                    if (!(c1.traits || []).some(x => x.text === t.text)) {
                        c1.traits = c1.traits || [];
                        c1.traits.push(t);
                    }
                }
                for (const int of (c2.interactions || [])) {
                    if (!(c1.interactions || []).some(x => x.text === int.text)) {
                        c1.interactions = c1.interactions || [];
                        c1.interactions.push(int);
                    }
                }
                
                c1.lastMentioned = Math.max(c1.lastMentioned || 0, c2.lastMentioned || 0);
                
                data.contacts.splice(j, 1);
                j--;
            }
        }
    }
}

// ==================== GAPS UPDATE ====================
async function runGapsUpdate() {
    const facts = getFactsForPrompt();
    const traits = getTraitsForPrompt();
    const timeline = getTimelineForPrompt();
    const hypotheses = getHypothesesForPrompt();
    const social = getSocialForPrompt();
    
    const hasData = [facts, traits, timeline].filter(k => k && k.length > 30).length;
    
    if (hasData < 1) {
        console.log('[GAPS] Not enough data');
        return;
    }
    
    const messageCount = getMessageCounter();
    
    const langInstruction = currentLanguage !== 'en' 
        ? `Write in ${getLanguageName()}.` 
        : '';
    
    const prompt = `You are analyzing what IMPORTANT information is MISSING about a user to help them effectively.

=== WHAT WE KNOW ===

**Facts:**
${facts || '(none yet)'}

**Personality Traits:**
${traits || '(none yet)'}

**Life Timeline:**
${timeline || '(none yet)'}

**Hypotheses:**
${hypotheses || '(none yet)'}

**Social Connections:**
${social || '(none yet)'}

=== YOUR TASK ===
Generate exactly 5 "white spots" — important topics we DON'T know about this user but SHOULD know to help them better.

=== CRITICAL RULES ===
1. Look at what we KNOW and identify logical HOLES
2. If something is already covered in facts/traits/timeline — it's NOT a gap!
3. Focus on what would be PRACTICALLY USEFUL to know
4. Prioritize gaps that would help in everyday conversations

=== WHAT MAKES A GOOD GAP ===
✓ "How do they handle stress?" (if not mentioned in traits)
✓ "What are their current goals?" (if not in timeline)
✓ "How do they make decisions?" (if pattern not visible)
✓ "What's their relationship with [mentioned person] like?" (if social mentions someone but no details)
✓ "What do they do for fun?" (if hobbies not mentioned)

=== WHAT MAKES A BAD GAP ===
✗ Something already answered in the facts above
✗ Trivia (favorite color, childhood pet name)
✗ Overly intimate (medical details, trauma)
✗ Too vague ("their past" — be specific!)
✗ Repeating what we already know

=== PRIORITY GUIDE ===
• high = would significantly improve assistance quality
• medium = useful context for better conversations  
• low = nice to know, not urgent

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, no explanation):
{
    "gaps": [
        {
            "topic": "Specific question or topic we don't know",
            "priority": "high|medium|low",
            "reason": "Why knowing this would help (1-2 sentences)",
            "relatedTo": ["facts", "traits", "social", "timeline", "hypotheses"]
        }
    ]
}

Exactly 5 gaps. No more, no less.
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2, true);
        console.log('[GAPS] Raw response:', result.substring(0, 300));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.gaps && Array.isArray(parsed.gaps)) {
            const gapsWithMeta = parsed.gaps.slice(0, 5).map(g => ({
                ...g,
                createdAt: messageCount
            }));
            
            setGapsData({ gaps: gapsWithMeta, lastUpdated: messageCount });
            console.log('[GAPS] Updated:', gapsWithMeta.length);
        }
    } catch (error) {
        console.error('[GAPS] Update failed:', error.message);
    }
}

// ==================== STYLE UPDATE ====================
// ==================== STYLE UPDATE ====================



async function runStyleUpdate() {
    const traits = getTraitsForPrompt();
    
    if (!traits || traits.length < 30) {
        console.log('[STYLE] Not enough trait data');
        return;
    }
    
    const langInstruction = currentLanguage !== 'en' ?
        `Write all parameter names, values, and text in ${getLanguageName()}.` :
        '';
    
    const prompt = `You are an expert in communication psychology. Carefully read the user personality dossier and formulate recommendations for communication style with them.

=== USER DOSSIER (personality traits) ===
${traits}

=== YOUR TASK ===
1. Analyze the user's personality deeply.
2. Form hypotheses about what communication style they need.
3. Weigh at least THREE arguments to justify EACH parameter.

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown outside the JSON block). Use EXACTLY this structure:
{
    "parameters": [
        {
            "name": "Формальность (Formality)",
            "value": "30%",
            "arguments": ["Обоснование 1...", "Обоснование 2...", "Обоснование 3..."]
        },
        {
            "name": "Эмоциональность (Emotionality)",
            "value": "60%",
            "arguments": ["...", "...", "..."]
        },
        {
            "name": "Детализация ответов (Detail level)",
            "value": "Высокая",
            "arguments": ["...", "...", "..."]
        },
        {
            "name": "Использование юмора (Humor)",
            "value": "20%",
            "arguments": ["...", "...", "..."]
        },
        {
            "name": "Поддержка и эмпатия (Empathy)",
            "value": "90%",
            "arguments": ["...", "...", "..."]
        },
        {
            "name": "Прямолинейность (Directness)",
            "value": "40%",
            "arguments": ["...", "...", "..."]
        },
        {
            "name": "Темп подачи информации (Pace)",
            "value": "Средний",
            "arguments": ["...", "...", "..."]
        }
    ],
    "special_recommendations": [
        "Специфическая рекомендация для этого юзера 1",
        "Специфическая рекомендация 2"
    ],
    "anti_patterns": [
        "Чего категорически нельзя делать 1",
        "Чего категорически нельзя делать 2"
    ]
}
${langInstruction}`;
    
    try {
        // Используем ту же функцию с retry и парсингом JSON, что и для фактов/гипотез
        const result = await callAPIWithRetry(prompt, 2, true);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.parameters) {
            // Собираем чистый, легковесный текст ТОЛЬКО из нужных полей (без аргументов)
            let cleanStyle = "🎯 РЕКОМЕНДУЕМЫЙ СТИЛЬ ОБЩЕНИЯ:\n";
            
            parsed.parameters.forEach(p => {
                cleanStyle += `• ${p.name}: ${p.value}\n`;
            });
            
            if (parsed.special_recommendations && parsed.special_recommendations.length > 0) {
                cleanStyle += "\n📝 ОСОБЫЕ РЕКОМЕНДАЦИИ:\n";
                parsed.special_recommendations.forEach(r => cleanStyle += `• ${r}\n`);
            }
            
            if (parsed.anti_patterns && parsed.anti_patterns.length > 0) {
                cleanStyle += "\n🚫 АНТИПАТТЕРНЫ:\n";
                parsed.anti_patterns.forEach(a => cleanStyle += `• ${a}\n`);
            }
            
            // Сохраняем обрезанный вариант в память (он пойдет в промпты чата)
            localStorage.setItem(STORAGE_KEYS.style, cleanStyle.trim());
            console.log('[STYLE] Updated successfully via JSON (arguments dropped)');
        } else {
            console.error('[STYLE] Failed to parse JSON structure');
        }
    } catch (error) {
        console.error('[STYLE] Update failed:', error.message);
    }
}
// ==================== HYPOTHESES UPDATE ====================
async function runHypothesesUpdate() {
    const facts = getFactsForPrompt();
    const traits = getTraitsForPrompt();
    const timeline = getTimelineForPrompt();
    
    const hasData = [facts, traits, timeline].filter(k => k && k.length > 20).length;
    
    if (hasData < 2) {
        console.log('[HYPOTHESES] Not enough data');
        return;
    }

    const messageCount = getMessageCounter();
    const currentData = getHypothesesData();

    console.log('[HYPOTHESES] Starting update. Current:', currentData.hypotheses.length);

    if (currentData.hypotheses.length === 0) {
        await runAdditionStep(currentData, facts, traits, timeline, messageCount);
        return;
    }

    let workingData = { hypotheses: [...currentData.hypotheses] };
    workingData = await runDeletionStep(workingData, facts, traits, timeline, messageCount);
    workingData = await runDeepeningStep(workingData, facts, traits, timeline, messageCount);
    workingData = await runAdditionStep(workingData, facts, traits, timeline, messageCount);

    console.log('[HYPOTHESES] Done. Total:', workingData.hypotheses.length);
}

async function runDeletionStep(data, facts, traits, timeline, messageCount) {
    if (data.hypotheses.length < 3) return data;

    const deleteCount = data.hypotheses.length >= 10 ? 2 : 1;
    
    const langInstruction = currentLanguage !== 'en' ? `Write in ${getLanguageName()}.` : '';

    const prompt = `You are a critical analyst reviewing hypotheses about a user. Your task is to identify hypotheses that should be DELETED.

=== CURRENT HYPOTHESES ===
${getHypothesesForPrompt()}

=== KNOWN FACTS ===
${facts || '(no facts)'}

=== PERSONALITY TRAITS ===
${traits || '(no traits)'}

=== LIFE TIMELINE ===
${timeline || '(no timeline)'}

=== YOUR TASK ===
Identify exactly ${deleteCount} hypothesis(es) to DELETE.

=== DELETION CRITERIA (in priority order) ===
1. PROVEN FALSE — directly contradicted by facts (highest priority to delete)
2. OBSOLETE — superseded by newer, better hypotheses  
3. REDUNDANT — too similar to another hypothesis (keep the better one)
4. UNSUPPORTED — lowest evidence, never gained support over time
5. LEAST VALUABLE — if nothing else applies, pick the least insightful ones

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, no explanation):
{
    "deletions": [
        {
            "index": 1,
            "reason": "Brief explanation why this should be deleted"
        }
    ]
}

Indices are 1-based (matching the hypothesis numbers above).
You MUST select exactly ${deleteCount} hypothesis(es) for deletion.
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2, true);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.deletions) {
            const indices = parsed.deletions
                .map(d => d.index - 1)
                .filter(i => i >= 0 && i < data.hypotheses.length)
                .sort((a, b) => b - a);
            
            for (const idx of indices) {
                console.log('[HYPOTHESES] Deleted:', data.hypotheses[idx].text.substring(0, 30));
                data.hypotheses.splice(idx, 1);
            }
            
            setHypothesesData(data);
        }
    } catch (error) {
        console.error('[HYPOTHESES/Delete] Failed:', error.message);
    }

    return data;
}

async function runDeepeningStep(data, facts, traits, timeline, messageCount) {
    if (data.hypotheses.length === 0) return data;

    const langInstruction = currentLanguage !== 'en' ? `Write in ${getLanguageName()}.` : '';

    const prompt = `You are refining hypotheses about a user based on accumulated knowledge.

=== CURRENT HYPOTHESES ===
${getHypothesesForPrompt()}

=== CONTEXT ===
Facts: ${facts ? facts.substring(0, 600) + '...' : 'none'}
Traits: ${traits ? traits.substring(0, 600) + '...' : 'none'}
Timeline: ${timeline ? timeline.substring(0, 600) + '...' : 'none'}

=== YOUR TASK ===
Review each hypothesis. Decide if it needs UPDATING based on the context.

For each hypothesis you update:
1. REFINE the text — make it more precise, nuanced, or expanded
2. ADJUST confidence — "low", "medium", "high", "very_high"
3. UPDATE evidence — add new supporting facts if found
4. ADJUST category — if a better category fits

=== IMPORTANT ===
• Only update hypotheses that actually have NEW relevant information
• Don't update just for the sake of updating
• If a hypothesis is already well-formed and evidence hasn't changed — skip it
• Confidence should ONLY increase if there's new supporting evidence

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown):
{
    "updates": [
        {
            "index": 1,
            "text": "Refined hypothesis text with more nuance...",
            "confidence": "high",
            "evidence": ["old evidence", "new evidence found"],
            "category": "psychology",
            "reason": "Why this was updated"
        }
    ]
}

If no updates needed, return {"updates": []}.
Index is 1-based.
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2, true);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.updates && parsed.updates.length > 0) {
            for (const update of parsed.updates) {
                const idx = update.index - 1;
                if (idx >= 0 && idx < data.hypotheses.length) {
                    const h = data.hypotheses[idx];
                    data.hypotheses[idx] = {
                        ...h,
                        text: update.text || h.text,
                        confidence: update.confidence || h.evidence ? h.confidence : h.confidence,
                        evidence: update.evidence || h.evidence,
                        category: update.category || h.category,
                        updatedAt: messageCount,
                        revision: (h.revision || 1) + 1
                    };
                    console.log('[HYPOTHESES] Updated:', update.index);
                }
            }
            setHypothesesData(data);
        }
    } catch (error) {
        console.error('[HYPOTHESES/Deepen] Failed:', error.message);
    }

    return data;
}

async function runAdditionStep(data, facts, traits, timeline, messageCount) {
    const langInstruction = currentLanguage !== 'en' ? `Write in ${getLanguageName()}.` : '';
    
    const existingHypotheses = data.hypotheses.length > 0 
        ? getHypothesesForPrompt() 
        : '(no existing hypotheses)';

    const prompt = `You are an attentive analyst generating hypotheses about a user based on observed patterns.

=== EXISTING HYPOTHESES (Do NOT repeat these) ===
${existingHypotheses}

=== CONTEXT ===
Facts: ${facts || 'none'}
Traits: ${traits || 'none'}
Timeline: ${timeline || 'none'}

=== YOUR TASK ===
Generate exactly 2 NEW hypotheses about this user.

=== CRITICAL GUIDELINES ===

**STAY GROUNDED:**
• Base hypotheses on ACTUAL patterns visible in the data
• If something is directly stated in facts — it's NOT a hypothesis, skip it
• Prefer practical observations over deep psychological speculation
• When evidence is weak, say so (low confidence)

**GOOD HYPOTHESES:**
• Connect dots between separate facts
• Explain observed behaviors or preferences  
• Predict likely preferences or reactions
• Identify patterns the user might not notice themselves

**BAD HYPOTHESES:**
• Wild speculation without evidence
• Armchair psychology
• Restating known facts as hypotheses

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown):
{
    "new_hypotheses": [
        {
            "text": "Clear, grounded hypothesis based on observed patterns...",
            "confidence": "low|medium|high",
            "evidence": ["specific fact or observation that supports this"],
            "category": "preferences|behavior|goals|relationships|communication|values|other"
        },
        {
            "text": "Another grounded hypothesis...",
            "confidence": "low|medium|high",
            "evidence": ["supporting observation"],
            "category": "category"
        }
    ]
}
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2, true);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.new_hypotheses) {
            for (const newH of parsed.new_hypotheses) {
                data.hypotheses.push({
                    text: newH.text,
                    confidence: newH.confidence || 'medium',
                    evidence: newH.evidence || [],
                    category: newH.category || 'general',
                    createdAt: messageCount,
                    updatedAt: messageCount,
                    revision: 1
                });
                console.log('[HYPOTHESES] Added:', newH.text.substring(0, 30));
            }
            setHypothesesData(data);
        }
    } catch (error) {
        console.error('[HYPOTHESES/Add] Failed:', error.message);
    }

    return data;
}

// ==================== BACKGROUND ANALYSIS (ROUND-ROBIN) ====================
const EXTRACTION_CATEGORIES = ['facts', 'traits', 'timeline', 'social'];
let currentExtractionIndex = 0;

async function runBackgroundAnalysis() {
    const history = getChatHistory();
    
    if (history.length < 2) {
        console.log('[ANALYSIS] Not enough messages');
        return;
    }
    
    const category = EXTRACTION_CATEGORIES[currentExtractionIndex];
    currentExtractionIndex = (currentExtractionIndex + 1) % EXTRACTION_CATEGORIES.length;
    
    console.log(`[ANALYSIS] Running extraction for: ${category}`);
    
    try {
        switch (category) {
            case 'facts':
                await extractFactsInformation(history);
                break;
            case 'traits':
                await extractTraitsInformation(history);
                break;
            case 'timeline':
                await extractTimelineInformation(history);
                break;
            case 'social':
                await extractSocialInformation(history);
                break;
        }
    } catch (error) {
        console.error(`[ANALYSIS] ${category} extraction failed:`, error.message);
    }
}

// Проверка загрузки
console.log('[analytics.js] Loaded. Full prompts restored. Short Traits & Recency Bonus enabled.');