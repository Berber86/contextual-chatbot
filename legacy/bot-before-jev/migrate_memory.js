async function migrateLegacyMemory() {
    console.log('[Migration] Starting legacy memory migration...');
    
    const factsData = getFactsData();
    let factsChanged = false;
    if (factsData && factsData.facts) {
        factsData.facts.forEach(f => {
            if (!f.timestamp) {
                f.timestamp = 'legacy_version';
                factsChanged = true;
            }
        });
        if (factsChanged) {
            setFactsData(factsData);
            console.log('[Migration] Facts updated to legacy_version');
        }
    }
    
    const timelineData = getTimelineData();
    let timelineChanged = false;
    if (timelineData && timelineData.events) {
        timelineData.events.forEach(e => {
            if (!e.timestamp) {
                e.timestamp = 'legacy_version';
                timelineChanged = true;
            }
        });
        if (timelineChanged) {
            setTimelineData(timelineData);
            console.log('[Migration] Timeline updated to legacy_version');
        }
    }
    
    console.log('[Migration] Memory migration complete.');
}

// Execute migration on load
migrateLegacyMemory();
