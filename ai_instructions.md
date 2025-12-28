
# 🤖 AI Developer Guidelines

**ATTENTION AI AGENT:** Before modifying code, read this document carefully. This project relies on specific logic flows that must be preserved.

## 🛑 Critical Rules (Do Not Break)

1.  **Separation of Concerns:**
    *   Put **Storage** (get/set localStorage) and **Rendering** (HTML manipulation) code in `app.js`.
    *   Put **Business Logic**, **API Calls**, and **Complex Algorithms** in `ui.js`.
    *   *Reason:* Prevents circular dependencies and messy code.

2.  **Hypotheses Integrity:**
    *   The `runHypothesesUpdate` function in `ui.js` is critical. It follows a strict 3-step process (Delete -> Deepen -> Add).
    *   **NEVER** revert to a single-prompt generation logic.
    *   **ALWAYS** preserve the structured fields: `confidence`, `evidence`, `category`, `revision`.

3.  **Localization First:**
    *   Never hardcode UI text strings in English inside JS functions.
    *   Always use the `t('keyName')` function.
    *   If adding new UI elements, add default English keys to `DEFAULT_TRANSLATIONS` in `app.js`.

4.  **No Build Steps:**
    *   Do not suggest installing Node.js, Webpack, React, or TypeScript.
    *   Keep it **Vanilla JS**. The code must run directly in the browser.

## 🛠 Coding Standards

*   **Async/Await:** Use modern async/await for all API calls.
*   **Error Handling:** All API calls must be wrapped in `try/catch`.
*   **Retry Logic:** Critical AI operations must use `callAPIWithRetry`.
*   **JSON Parsing:** Always validate JSON returned by LLM. It often includes markdown blocks (```json ... ```) which must be stripped before parsing.

## 🧠 Logic Nuances

### Tool Definitions
*   Tools are defined in `app.js` (`getToolDefinitions`).
*   If you change the tool logic in `ui.js` (`executeTool`), ensure you update the definition description in `app.js` so the LLM knows how to use it.

### System Prompt
*   The system prompt is dynamically built in `buildSystemPrompt`.
*   It MUST aggressively encourage tool usage ("Bias toward calling"). Do not weaken these instructions.

### Memory Updates
*   Knowledge updates happen in the background (fire-and-forget). Do not block the UI (sending messages) while analysis is running.

## 🚀 How to Implement Updates

1.  **Read:** Check `PROJECT_OVERVIEW.md` to understand where the feature fits.
2.  **Plan:** Decide which file (`app.js` or `ui.js`) needs modification.
3.  **Verify:** Check if your change affects `localStorage` structure. If yes, consider backward compatibility.
4.  **Update Docs:** If you add a new feature, update `PROJECT_OVERVIEW.md`.

## ⚠️ Common Pitfalls to Avoid
*   **Forgetting to save:** Always call `saveChatHistory` or `setKnowledge` after modifying data.
*   **Overwriting User Edits:** The knowledge base is editable by the user. When merging new AI insights, ensure we don't accidentally wipe manual user edits (current logic handles this via "Merge" prompts).
*   **Context Limit:** Be mindful of sending the *entire* history for analysis tasks. Currently, we send relevant chunks or the last 10 messages.