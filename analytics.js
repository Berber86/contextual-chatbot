// analytics.js - аналитические функции для Memory Chatbot
// Все функции глобальные, доступны после загрузки этого файла

// ==================== SOCIAL EXTRACTION & INTEGRATION ====================
async function extractSocialInformation(history) {
    console.log('[SOCIAL] extractSocialInformation CALLED');
    console.log('[SOCIAL] History length:', history.length);
    
    if (history.length < 1) {
        console.log('[SOCIAL] No history, skipping');
        return;
    }

    const dialogText = history.map(msg => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    }).join('\n\n');

    console.log('[SOCIAL] Dialog:', dialogText.substring(0, 200) + '...');

    const currentData = getSocialData();
    console.log('[SOCIAL] Current contacts:', currentData.contacts.map(c => `${c.name}(${c.facts?.length || 0}f)`).join(', ') || 'none');
    
    let existingContactsList = '(no existing contacts yet)';
    if (currentData.contacts.length > 0) {
        existingContactsList = currentData.contacts.map(c => {
            const aliases = c.aliases && c.aliases.length > 0 
                ? ` (aliases: ${c.aliases.join(', ')})` 
                : '';
            return `• "${c.name}"${aliases} — ${c.relation}`;
        }).join('\n');
    }

    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
        : '';

    const prompt = `You are analyzing a conversation to extract information about PEOPLE mentioned by the user.

=== DIALOGUE ===
${dialogText}

=== EXISTING CONTACTS IN DATABASE ===
${existingContactsList}

=== YOUR TASK ===
Extract ALL information about people mentioned:
1. NEW people not in database → create new contact
2. EXISTING people (match by name/alias/relation) → ADD new facts to them via possibleMergeWith

=== CRITICAL RULES ===
• If user mentions someone who MIGHT be in database → SET possibleMergeWith to that contact's name
• "дочка", "daughter", "дочь" = same person if relation is family
• "wife", "жена", "супруга" = same person  
• When in doubt → MERGE (set possibleMergeWith)
• Extract EVERY fact, trait, interaction mentioned about ANY person
• Even small details matter: "she went to school", "he called", etc.

=== RESPONSE FORMAT ===
Return ONLY valid JSON, no markdown, no explanation:
{
    "contacts": [
        {
            "name": "Name as mentioned",
            "possibleAliases": ["other names"],
            "relation": "family/friend/colleague/other",
            "sentiment": "positive/neutral/negative",
            "facts": [{"text": "fact", "evidence": ["quote"]}],
            "traits": [{"text": "trait", "evidence": ["quote"]}],
            "interactions": [{"text": "interaction", "evidence": ["quote"]}],
            "possibleMergeWith": "EXISTING contact name OR null"
        }
    ]
}

If no people mentioned: {"contacts": []}
${langInstruction}`;

    console.log('[SOCIAL] Sending prompt to API...');

    try {
        const result = await callAPIWithRetry(prompt, 2, false);
        console.log('[SOCIAL] Raw API response:', result.substring(0, 500));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.contacts) {
            console.log('[SOCIAL] Parsed contacts count:', parsed.contacts.length);
            
            if (parsed.contacts.length > 0) {
                parsed.contacts.forEach((c, i) => {
                    console.log(`[SOCIAL] Contact[${i}]: "${c.name}" mergeWith="${c.possibleMergeWith}" facts=${c.facts?.length || 0}`);
                });
                
                integrateSocialData(parsed.contacts);
            } else {
                console.log('[SOCIAL] No people mentioned in dialogue');
            }
        } else {
            console.log('[SOCIAL] Parse failed or no contacts field');
        }
    } catch (error) {
        console.error('[SOCIAL] Extraction failed:', error.message);
    }
}

function integrateSocialData(newContacts) {
    console.log('[INTEGRATE] =====================================');
    console.log('[INTEGRATE] Processing', newContacts.length, 'contacts');
    
    const data = getSocialData();
    const messageCount = getMessageCounter();
    
    console.log('[INTEGRATE] BEFORE:', data.contacts.map(c => `${c.name}(${c.facts?.length || 0}f)`).join(', ') || 'empty');
    
    for (let i = 0; i < newContacts.length; i++) {
        const newContact = newContacts[i];
        console.log(`[INTEGRATE] --- Contact ${i + 1}: "${newContact.name}" ---`);
        
        let existingContact = null;
        
        if (newContact.possibleMergeWith) {
            existingContact = data.contacts.find(c => 
                c.name.toLowerCase() === newContact.possibleMergeWith.toLowerCase() ||
                (c.aliases || []).some(a => a.toLowerCase() === newContact.possibleMergeWith.toLowerCase())
            );
            console.log(`[INTEGRATE] Search by mergeWith "${newContact.possibleMergeWith}":`, existingContact ? 'FOUND' : 'NOT FOUND');
        }
        
        if (!existingContact) {
            existingContact = data.contacts.find(c => 
                c.name.toLowerCase() === newContact.name.toLowerCase() ||
                (c.aliases || []).some(a => a.toLowerCase() === newContact.name.toLowerCase())
            );
            console.log(`[INTEGRATE] Search by name "${newContact.name}":`, existingContact ? 'FOUND' : 'NOT FOUND');
        }
        
        if (!existingContact && newContact.possibleAliases) {
            for (const alias of newContact.possibleAliases) {
                existingContact = data.contacts.find(c => 
                    c.name.toLowerCase() === alias.toLowerCase() ||
                    (c.aliases || []).some(a => a.toLowerCase() === alias.toLowerCase())
                );
                if (existingContact) {
                    console.log(`[INTEGRATE] Search by alias "${alias}": FOUND`);
                    break;
                }
            }
        }
        
        if (!existingContact) {
            existingContact = findContactFuzzy(newContact.name, newContact.relation, data.contacts);
            if (existingContact) {
                console.log(`[INTEGRATE] Fuzzy search: FOUND "${existingContact.name}"`);
            }
        }
        
        if (existingContact) {
            console.log(`[INTEGRATE] >>> UPDATING "${existingContact.name}"`);
            updateExistingContactInPlace(data, existingContact.id, newContact, messageCount);
        } else {
            console.log(`[INTEGRATE] >>> CREATING "${newContact.name}"`);
            const contact = createNewContact(newContact, messageCount);
            data.contacts.push(contact);
        }
    }
    
    if (data.contacts.length > SOCIAL_CONFIG.maxContacts) {
        trimContacts(data);
    }
    
    checkForMerges(data);
    
    console.log('[INTEGRATE] AFTER:', data.contacts.map(c => `${c.name}(${c.facts?.length || 0}f)`).join(', '));
    
    console.log('[INTEGRATE] Saving...');
    setSocialData(data);
    
    const verify = getSocialData();
    console.log('[INTEGRATE] VERIFY:', verify.contacts.map(c => `${c.name}(${c.facts?.length || 0}f)`).join(', '));
    console.log('[INTEGRATE] =====================================');
}

function updateExistingContactInPlace(data, contactId, newData, messageCount) {
    const contact = data.contacts.find(c => c.id === contactId);
    
    if (!contact) {
        console.log('[UPDATE] ERROR: Contact not found!');
        return;
    }
    
    const factsBefore = contact.facts?.length || 0;
    const traitsBefore = contact.traits?.length || 0;
    
    contact.lastMentioned = messageCount;
    
    if (newData.name && 
        newData.name.toLowerCase() !== contact.name.toLowerCase() &&
        !(contact.aliases || []).map(a => a.toLowerCase()).includes(newData.name.toLowerCase())) {
        contact.aliases = contact.aliases || [];
        contact.aliases.push(newData.name);
        console.log(`[UPDATE] Added alias: "${newData.name}"`);
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
                evidence: newFact.evidence || [],
                strength: (newFact.evidence || []).length || 1
            });
            console.log(`[UPDATE] +fact: "${newFact.text.substring(0, 40)}..."`);
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
                evidence: newTrait.evidence || [],
                strength: (newTrait.evidence || []).length || 1
            });
            console.log(`[UPDATE] +trait: "${newTrait.text.substring(0, 40)}..."`);
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
                evidence: newInt.evidence || [],
                strength: (newInt.evidence || []).length || 1
            });
            console.log(`[UPDATE] +interaction: "${newInt.text.substring(0, 40)}..."`);
        }
    }
    
    console.log(`[UPDATE] "${contact.name}": facts ${factsBefore}→${contact.facts.length}, traits ${traitsBefore}→${contact.traits.length}`);
}

function findContactFuzzy(name, relation, contacts) {
    if (!name || !contacts || contacts.length === 0) return null;
    
    const nameLower = name.toLowerCase().trim();
    
    const familySynonyms = [
        ['дочь', 'дочка', 'дочурка', 'daughter', 'ребёнок', 'ребенок', 'child', 'kid', 'girl'],
        ['сын', 'сынок', 'сынуля', 'son', 'ребёнок', 'ребенок', 'child', 'kid', 'boy'],
        ['жена', 'супруга', 'wife', 'spouse'],
        ['муж', 'супруг', 'husband', 'spouse'],
        ['мама', 'мать', 'mom', 'mother', 'мамочка', 'мамуля'],
        ['папа', 'отец', 'dad', 'father', 'папочка', 'батя'],
        ['бабушка', 'бабуля', 'grandmother', 'grandma', 'granny'],
        ['дедушка', 'дедуля', 'grandfather', 'grandpa', 'дед'],
        ['сестра', 'sister', 'сестрёнка', 'сестренка'],
        ['брат', 'brother', 'братик', 'братишка']
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

function createNewContact(data, messageCount) {
    return {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        aliases: data.possibleAliases || [],
        relation: data.relation || 'unknown',
        sentiment: data.sentiment || 'neutral',
        facts: (data.facts || []).map(f => ({
            text: f.text,
            evidence: f.evidence || [],
            strength: (f.evidence || []).length || 1
        })),
        traits: (data.traits || []).map(t => ({
            text: t.text,
            evidence: t.evidence || [],
            strength: (t.evidence || []).length || 1
        })),
        interactions: (data.interactions || []).map(i => ({
            text: i.text,
            evidence: i.evidence || [],
            strength: (i.evidence || []).length || 1
        })),
        createdAt: messageCount,
        lastMentioned: messageCount
    };
}

function trimContacts(data) {
    const scored = data.contacts.map(c => ({
        contact: c,
        score: (c.facts?.length || 0) + (c.traits?.length || 0) + (c.interactions?.length || 0)
    }));
    
    scored.sort((a, b) => a.score - b.score);
    
    const toRemove = data.contacts.length - SOCIAL_CONFIG.maxContacts;
    for (let i = 0; i < toRemove; i++) {
        const idx = data.contacts.findIndex(c => c.id === scored[i].contact.id);
        if (idx !== -1) {
            console.log(`[TRIM] Removing: ${scored[i].contact.name}`);
            data.contacts.splice(idx, 1);
        }
    }
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
                console.log(`[MERGE] Merging: ${c1.name} + ${c2.name}`);
                
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
    const facts = getKnowledge('facts');
    const traits = getKnowledge('traits');
    const timeline = getKnowledge('timeline');
    const hypotheses = getHypothesesForPrompt();
    const social = getSocialForPrompt();
    
    const hasData = [facts, traits, timeline].filter(k => k && k.trim().length > 20).length;
    
    if (hasData < 1) {
        console.log('[Gaps] Not enough data to identify knowledge gaps');
        return;
    }
    
    const messageCount = getMessageCounter();
    
    console.log(`[Gaps] Generating fresh knowledge gaps...`);
    
    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
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

**What makes a GOOD gap:**
• "How do they handle stress?" (if not mentioned in traits)
• "What are their current goals?" (if not in timeline)
• "How do they make decisions?" (if pattern not visible)
• "What's their relationship with X like?" (if social mentions X but no details)

**What makes a BAD gap:**
• Something already answered in the facts above
• Trivia (favorite color, childhood pet name)
• Overly intimate (medical details, trauma)
• Too vague ("their past" — be specific!)

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

Priority guide:
• high = would significantly improve assistance quality
• medium = useful context for better conversations  
• low = nice to know, not urgent

Exactly 5 gaps. No more, no less.
${langInstruction}`;

    try {
        // Используем аналитическую модель для обновления пробелов
        const result = await callAPIWithRetry(prompt, 2, true);
        console.log('[Gaps] Raw response:', result.substring(0, 300));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.gaps && Array.isArray(parsed.gaps)) {
            const gapsWithMeta = parsed.gaps.slice(0, 5).map(g => ({
                ...g,
                createdAt: messageCount
            }));
            
            const newData = {
                gaps: gapsWithMeta,
                lastUpdated: messageCount
            };
            
            setGapsData(newData);
            console.log(`[Gaps] Fresh gaps generated: ${gapsWithMeta.map(g => g.topic.substring(0, 30)).join(', ')}`);
        } else {
            console.log('[Gaps] Failed to parse response');
        }
    } catch (error) {
        console.error('[Gaps] Update failed:', error.message);
    }
}

// ==================== COMMUNICATION STYLE UPDATE ====================
async function runStyleUpdate() {
    const traits = getKnowledge('traits');
    
    if (!traits || traits.trim().length < 20) {
        console.log('[Style] Not enough personality trait data to generate style');
        return;
    }

    console.log('[Style] Generating communication style settings...');

    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
        : '';

    const prompt = `You are an expert in communication psychology. Carefully read the user personality dossier and formulate recommendations for communication style with them.

=== USER DOSSIER (personality traits) ===
${traits}

=== YOUR TASK ===
1. Analyze the user's personality
2. Form hypotheses about what communication style they need
3. Be insightful in this assessment
4. DON'T jump to quick conclusions
5. Weigh at least three arguments to justify each parameter

=== RESPONSE FORMAT ===
Provide a list of communication style parameters with ratings. For example:

🎯 RECOMMENDED COMMUNICATION STYLE:

• Formality: [0-100%] — brief justification
• Emotionality: [0-100%] — brief justification  
• Response detail: [0-100%] — brief justification
• Use of humor: [0-100%] — brief justification
• Support and empathy: [0-100%] — brief justification
• Directness: [0-100%] — brief justification
• Information delivery pace: [slow/medium/fast]

📝 SPECIAL RECOMMENDATIONS:
(What to consider, what to avoid, what to pay attention to)

Use this or a similar format. The main thing is that the recommendations are specific and actionable.
${langInstruction}`;

    try {
        // Используем аналитическую модель для обновления стиля
        const response = await callAPI([{ role: "user", content: prompt }], null, true);
        const styleRecommendations = response.content || response;
        
        setKnowledge('style', styleRecommendations);
        console.log('[Style] Style settings updated');
        
    } catch (error) {
        console.error('[Style] Style generation error:', error.message);
    }
}

// ==================== HYPOTHESES UPDATE ====================
async function runHypothesesUpdate() {
    const facts = getKnowledge('facts');
    const traits = getKnowledge('traits');
    const timeline = getKnowledge('timeline');
    
    const nonEmptyCount = [facts, traits, timeline].filter(k => k && k.trim().length > 10).length;
    
    if (nonEmptyCount < 2) {
        console.log('[Hypotheses] Not enough data (need at least 2 of 3 categories filled)');
        return;
    }

    const currentMessageCount = getMessageCounter();
    const currentData = getHypothesesData();
    const hypothesesCount = currentData.hypotheses.length;

    console.log(`[Hypotheses] Starting update cycle. Current count: ${hypothesesCount}`);

    if (hypothesesCount === 0) {
        console.log('[Hypotheses] No hypotheses yet, jumping to add...');
        await runAdditionStep(currentData, facts, traits, timeline, currentMessageCount);
        return;
    }

    let workingData = { ...currentData, hypotheses: [...currentData.hypotheses] };

    workingData = await runDeletionStep(workingData, facts, traits, timeline, currentMessageCount);
    workingData = await runDeepeningStep(workingData, facts, traits, timeline, currentMessageCount);
    workingData = await runAdditionStep(workingData, facts, traits, timeline, currentMessageCount);

    console.log(`[Hypotheses] Update cycle complete. Final count: ${workingData.hypotheses.length}`);
}

async function runDeletionStep(data, facts, traits, timeline, messageCount) {
    const count = data.hypotheses.length;
    
    if (count < 3) {
        console.log('[Hypotheses/Delete] Skipping deletion (< 3 hypotheses)');
        return data;
    }

    const deleteCount = count >= 10 ? 2 : 1;
    console.log(`[Hypotheses/Delete] Will attempt to delete ${deleteCount} hypothesis(es)`);

    const langInstruction = currentLanguage !== 'en' ? `Write your response in ${getLanguageName()}.` : '';

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

Criteria for deletion (in priority order):
1. PROVEN FALSE — directly contradicted by facts
2. OBSOLETE — superseded by newer, better hypotheses
3. REDUNDANT — too similar to another hypothesis
4. UNSUPPORTED — lowest evidence, never gained support
5. LEAST VALUABLE — if nothing else, pick the least insightful ones

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
        // Используем аналитическую модель для удаления гипотез
        const result = await callAPIWithRetry(prompt, 2, true);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.deletions && parsed.deletions.length > 0) {
            const indicesToDelete = parsed.deletions
                .map(d => d.index - 1)
                .filter(i => i >= 0 && i < data.hypotheses.length)
                .sort((a, b) => b - a);
            
            for (const idx of indicesToDelete) {
                console.log(`[Hypotheses/Delete] Removing hypothesis #${idx + 1}`);
                data.hypotheses.splice(idx, 1);
            }
            
            setHypothesesData(data);
            console.log(`[Hypotheses/Delete] Deleted ${indicesToDelete.length} hypothesis(es).`);
        }
    } catch (error) {
        console.error('[Hypotheses/Delete] Step failed:', error.message);
    }

    return data;
}

async function runDeepeningStep(data, facts, traits, timeline, messageCount) {
    if (data.hypotheses.length === 0) return data;

    console.log('[Hypotheses/Deepen] Analyzing hypotheses for updates...');

    const langInstruction = currentLanguage !== 'en' ? `Write your response in ${getLanguageName()}.` : '';

    const prompt = `You are refining hypotheses about a user based on accumulated knowledge.

=== CURRENT HYPOTHESES ===
${getHypothesesForPrompt()}

=== CONTEXT ===
Facts: ${facts ? facts.substring(0, 500) + "..." : "none"}
Traits: ${traits ? traits.substring(0, 500) + "..." : "none"}
Timeline: ${timeline ? timeline.substring(0, 500) + "..." : "none"}

=== YOUR TASK ===
Review each hypothesis. Decide if it needs UPDATING based on the context.

For each hypothesis you update:
1. REFINE the text — make it more precise, nuanced, or expanded
2. ADJUST confidence — "low", "medium", "high", "very_high"
3. UPDATE evidence — add new supporting facts if found
4. ADJUST category — if a better category fits

IMPORTANT: Only update hypotheses that actually have NEW relevant information. Ignore the rest.

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown):
{
    "updates": [
        {
            "index": 1,
            "text": "Refined hypothesis text...",
            "confidence": "high",
            "evidence": ["evidence 1", "new evidence"],
            "category": "psychology",
            "reason": "Why updated"
        }
    ]
}

If no updates needed, return {"updates": []}.
Index is 1-based.
${langInstruction}`;

    try {
        // Используем аналитическую модель для обновления гипотез
        const result = await callAPIWithRetry(prompt, 2, true);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.updates && parsed.updates.length > 0) {
            for (const update of parsed.updates) {
                const idx = update.index - 1;
                if (idx >= 0 && idx < data.hypotheses.length) {
                    const h = data.hypotheses[idx];
                    
                    data.hypotheses[idx] = {
                        text: update.text || h.text,
                        confidence: update.confidence || h.confidence,
                        evidence: update.evidence || h.evidence,
                        category: update.category || h.category,
                        createdAt: h.createdAt,
                        updatedAt: messageCount,
                        revision: (h.revision || 1) + 1
                    };
                    
                    console.log(`[Hypotheses/Deepen] Updated hypothesis #${update.index}`);
                }
            }
            
            setHypothesesData(data);
            console.log(`[Hypotheses/Deepen] Updated ${parsed.updates.length} hypothesis(es).`);
        } else {
            console.log('[Hypotheses/Deepen] No updates needed.');
        }
    } catch (error) {
        console.error('[Hypotheses/Deepen] Step failed:', error.message);
    }

    return data;
}

async function runAdditionStep(data, facts, traits, timeline, messageCount) {
    console.log('[Hypotheses/Add] Generating 2 NEW hypotheses...');

    const langInstruction = currentLanguage !== 'en' ? `Write your response in ${getLanguageName()}.` : '';
    const existingHypotheses = data.hypotheses.length > 0 ? getHypothesesForPrompt() : '(no existing hypotheses)';

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
STAY GROUNDED:
• Base hypotheses on ACTUAL patterns visible in the data
• If something is directly stated in facts — it's NOT a hypothesis, skip it
• Prefer practical observations over deep psychological speculation
• "User might prefer X because they mentioned Y" > "User has deep-seated fear of Z"
• When evidence is weak, say so (low confidence)

GOOD HYPOTHESES:
• Connect dots between separate facts
• Explain observed behaviors or preferences
• Predict likely preferences or reactions
• Identify patterns the user might not notice themselves

BAD HYPOTHESES:
• Wild speculation without evidence
• Armchair psychology ("childhood trauma", "fear of abandonment")
• Restating known facts as hypotheses
• Overly dramatic interpretations

=== REQUIREMENTS ===
1. Must be distinct from existing hypotheses
2. Must have at least some supporting evidence from context
3. Should be useful for personalizing future conversations
4. Confidence should reflect actual evidence strength

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown):
{
    "new_hypotheses": [
        {
            "text": "Clear, grounded hypothesis...",
            "confidence": "low|medium|high",
            "evidence": ["specific fact or observation that supports this"],
            "category": "preferences|behavior|goals|relationships|communication|other"
        },
        {
            "text": "Another grounded hypothesis...",
            "confidence": "low|medium|high",
            "evidence": ["supporting observation"],
            "category": "category"
        }
    ]
}

Confidence guide:
• low = single weak hint, might be wrong
• medium = pattern from 2-3 observations
• high = strong pattern, multiple confirmations
${langInstruction}`;

    try {
        // Используем аналитическую модель для добавления гипотез
        const result = await callAPIWithRetry(prompt, 2, true);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.new_hypotheses && parsed.new_hypotheses.length > 0) {
            for (const newH of parsed.new_hypotheses) {
                const hypothesis = {
                    text: newH.text,
                    confidence: newH.confidence || 'medium',
                    evidence: newH.evidence || [],
                    category: newH.category || 'general',
                    createdAt: messageCount,
                    updatedAt: messageCount,
                    revision: 1
                };
                
                data.hypotheses.push(hypothesis);
                console.log(`[Hypotheses/Add] Added: "${hypothesis.text.substring(0, 30)}..."`);
            }
            
            setHypothesesData(data);
            console.log(`[Hypotheses/Add] Added ${parsed.new_hypotheses.length} hypothesis(es). Total: ${data.hypotheses.length}`);
        }
    } catch (error) {
        console.error('[Hypotheses/Add] Step failed:', error.message);
    }

    return data;
}

// ==================== BACKGROUND ANALYSIS ====================
async function runBackgroundAnalysis() {
    const history = getChatHistory();
    
    if (history.length < 2) {
        console.log('[Analysis] Not enough messages for analysis');
        return;
    }
    
    const category = KNOWLEDGE_CATEGORIES[currentCategoryIndex];
    const categoryName = CATEGORY_NAMES[category];
    currentCategoryIndex = (currentCategoryIndex + 1) % KNOWLEDGE_CATEGORIES.length;
    
    console.log(`[Analysis] Starting analysis for category: ${categoryName}`);
    
    try {
        // Social обрабатывается своей функцией
        if (category === 'social') {
            await extractSocialInformation(history);
            return;
        }
        
        const extractedInfo = await extractInformation(history, category, categoryName);
        
        if (!extractedInfo || extractedInfo.trim().toLowerCase().includes('nothing') ||
            extractedInfo.trim().toLowerCase().includes('not found') ||
            extractedInfo.trim().length < 10) {
            console.log(`[Analysis] No new information found for category "${categoryName}"`);
            return;
        }
        
        console.log(`[Analysis] Extracted:`, extractedInfo);
        
        const currentKnowledge = getKnowledge(category);
        const updatedKnowledge = await mergeKnowledge(currentKnowledge, extractedInfo, categoryName);
        
        setKnowledge(category, updatedKnowledge);
        console.log(`[Analysis] Knowledge updated for category "${categoryName}"`);
        
    } catch (error) {
        console.error(`[Analysis] Analysis error:`, error.message);
    }
}

async function extractInformation(history, category, categoryName) {
    const dialogText = history.map(msg => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    }).join('\n\n');

    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
        : '';

    const prompt = `Analyze the following dialogue and extract ONLY ${categoryName}.

DIALOGUE:
${dialogText}

TASK:
Find and list only ${categoryName} that can be learned from this dialogue.
If nothing relevant is found — write "Nothing found".
Write concisely and to the point.
${langInstruction}`;

    console.log(`[Analysis] Extracting information: ${categoryName}...`);
    
    const response = await callAPI([{ role: "user", content: prompt }], null, false); // Основная модель для извлечения
    return response.content || response;
}

async function mergeKnowledge(currentKnowledge, newInfo, categoryName) {
    if (!currentKnowledge.trim()) {
        return newInfo;
    }

    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
        : '';

    const prompt = `You have current knowledge about the user (${categoryName}) and new information.

CURRENT KNOWLEDGE:
${currentKnowledge}

NEW INFORMATION:
${newInfo}

TASK:
Merge this information into a single up-to-date list.
- Remove duplicates and anything not directly related to the topic (${categoryName})
- If new information contradicts old — keep the new one with a note about the contradiction
- Structure as you see fit
- Write concisely and informatively
- Don't make things up
${langInstruction}

Output only the final merged result.`;

    console.log(`[Analysis] Merging knowledge: ${categoryName}...`);
    
    const response = await callAPI([{ role: "user", content: prompt }], null, false); // Основная модель
    return response.content || response;
}

// Проверка загрузки
console.log('[analytics.js] Загружен. Доступные функции:',
    typeof extractSocialInformation !== 'undefined',
    typeof runBackgroundAnalysis !== 'undefined',
    typeof runGapsUpdate !== 'undefined',
    typeof runStyleUpdate !== 'undefined',
    typeof runHypothesesUpdate !== 'undefined'
);