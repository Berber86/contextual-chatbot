# Primary UI redesign notes

Date: 2026-06-09

## Scope completed in this pass

Redesigned the primary Memory Chatbot shell and the shared surface language used by the first-level interface:

- top navigation/header;
- brand lockup;
- chat conversation area;
- message bubbles, system messages, thinking state, timestamps;
- bottom composer;
- Ask Me mode control;
- developer counters;
- settings dropdown and language selector;
- baseline modal styling for Knowledge, Help, Reports, Dating, Dialogs and Privacy surfaces.

This is a CSS-led redesign with minimal HTML changes. It keeps existing JavaScript APIs, ids, onclick handlers and storage behavior intact.

## Design direction

The app is product UI, not a marketing page. The redesign aims for:

- calmer dark workspace;
- stronger hierarchy;
- fewer saturated panels;
- readable long assistant answers;
- familiar controls with complete states;
- a clearer sense that this is a private memory tool, not a generic chatbot skin.

## Key implementation choices

- Added a token layer at the end of `style.css`: colors, spacing, radii, shadows, typography, z-index.
- Reworked `index.html` header into a real brand + nav structure.
- Kept all existing button classes and ids for compatibility.
- Appended override CSS instead of deleting the old file, because the current stylesheet has many repeated historical blocks and module-specific dependencies.
- Added reduced-motion handling.
- Improved mobile composer: send button becomes a compact arrow, header actions scroll horizontally if needed.
- Standardized focus-visible behavior across controls.

## Follow-up passes recommended

1. Split `style.css` into modules:
   - `tokens.css`
   - `shell.css`
   - `chat.css`
   - `modals.css`
   - `knowledge.css`
   - `dating.css`
   - `reports.css`
   - `you.css`
   - `dialogs.css`

2. Replace repeated legacy color values with tokens.

3. Do a dedicated Dating UI pass. It currently benefits from the global refresh, but its dense compatibility forms need a separate IA pass.

4. Do a Knowledge Base pass. The data views need better density controls and empty states.

5. Do a real browser QA pass at:
   - 360×640
   - 390×844
   - 768×1024
   - 1440×900

6. Check contrast with actual rendered colors. The chosen palette should be close to AA, but final verification should be done in browser.

## Step 2 completed: Dating UI pass

Scope:

- Dating modal shell widened and made more product-like.
- Dating tabs, status screens, progress bars, action buttons and profile forms aligned with the new token layer.
- Compatibility screen rebuilt in `dating.js` into clearer sections:
  - candidate embedding;
  - optional candidate description;
  - profile-context toggle for reports 1–3;
  - dedicated custom-question block for report 4;
  - four report-choice buttons with short provenance descriptions.
- Report 4 now reads visually as a different mode: only candidate data, high-confidence scales by default, medium-confidence scales optional, low-confidence scales never sent.
- Compatibility report output and error/loading states were made more readable.
- Mobile layout for Dating now stacks cleanly instead of compressing dense controls.

Intent:

Dating is the densest module in the product. The previous UI presented four different report concepts as similar buttons. This pass makes data provenance visible before the user runs a report, which matters more than decoration here.

Known follow-up:

- Candidate search results are still generated with inline styles in `refreshCandidateList`. CSS now normalizes the worst of it, but the next code pass should replace those inline blocks with real classes.
- The Privacy Disclaimer copy still describes older assumptions in places. It should be updated to match the four report modes.
- The actual compatibility prompts for reports 1–3 still deserve a wording pass after the UI stabilizes.

## Step 3 completed: Dating candidate list and privacy wording

Scope:

- Removed inline-styled candidate result cards from `refreshCandidateList()`.
- Added reusable candidate rendering helpers:
  - `renderCandidateSearchCard()`
  - `renderCandidateGroup()`
- Added proper CSS for candidate search results, grouped by match strength.
- Updated the privacy disclaimer so it matches the current four report modes.
- Added explicit privacy wording for the custom question report: only candidate data, no owner memory or owner embedding.
- Added wording that reliability filtering happens before data reaches the model in the custom question report.

Why this matters:

The candidate list is the entry point into the Dating analysis flow. Inline styles made it visually drift from the rest of the redesign and obscured the next action. The new pattern makes candidates scannable, preserves density, and keeps the analysis CTA consistent.

## Step 4 completed: Knowledge Base UI pass

Scope:

- Added dynamic memory-section headers inside structured knowledge tabs.
- Added counts and secondary metadata for facts, traits, timeline, hypotheses, gaps and social memory.
- Updated social memory rendering to use the same section header pattern.
- Added a dedicated Knowledge Base CSS pass:
  - calmer tabs;
  - better modal density;
  - readable memory cards;
  - improved evidence/provenance blocks;
  - better empty states;
  - better social contact accordions;
  - responsive treatment for narrow screens.

Why this matters:

The Knowledge Base is the user's proof that memory exists. It should feel like a readable memory map, not a raw admin dump. This pass keeps the existing data model and render functions, but gives each memory register a visible count, purpose, and calmer card rhythm.

Known follow-up:

- The static tab labels still do not show counts directly in the tab row. That would require changing the i18n/tab rendering model.
- The Style tab is still textarea-first and needs a separate editor pass.
- Social contact details still inherit some older accordion behavior. It is better, but a future pass should split facts/traits/interactions into clearer sub-panels.

## Step 5 completed: Reports UI pass

Scope:

- Added a hero/explanation block to the preset reports mode.
- Added source availability summary: number of available memory registers.
- Rebuilt preset report cards with:
  - ready/locked status chip;
  - explicit context chips for required data;
  - clearer missing-data instructions;
  - calmer primary action.
- Added a hero block to the constructor mode so it reads as an expert/dev tool, not a random prompt textarea.
- Refreshed reports styling: modal shell, cards, context grid, prompt area, params, result panel, toast and mobile layout.

Why this matters:

Reports are high-trust features. The user should know why a report is available, what memory it will use, and what is missing when it is locked. The old UI hid that behind disabled buttons and warning text. The new UI makes data requirements visible before generation.

Known follow-up:

- Report prompts themselves could use a content/design pass after the UI is stable.
- Some report descriptions are long and uneven in tone. They should be rewritten with the same product voice.
- The constructor mode could eventually save prompt presets.
