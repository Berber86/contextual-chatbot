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

## Step 6 completed: Dialogs UI pass

Scope:

- Rebuilt the dialogs list rendering to include:
  - a messenger hero block;
  - chat and unread counts;
  - profile-public-description preview;
  - proper empty and setup-required states.
- Changed contact rows from clickable divs to buttons for better semantics.
- Added a richer first-message empty state inside chat.
- Added a dedicated Dialogs CSS pass:
  - larger messenger shell;
  - clearer contact list;
  - chat bubbles aligned with the main chatbot visual language;
  - improved composer;
  - better mobile behavior;
  - calmer unread badges and check-message controls.

Why this matters:

Dialogs is the bridge between Dating analysis and real communication. It should feel like a trusted private messenger, not a utility panel. The list now explains what the anonymous emoji names mean, shows unread state clearly, and makes the transition into a chat feel intentional.

Known follow-up:

- The chat header could show candidate metadata or a small privacy note after opening a thread.
- Message delivery/error state is still basic. A future pass should add per-message pending/failed states.
- The dialog input could auto-resize like the main composer.

## Step 7 completed: YOU / Self-Discovery UI pass

Scope:

- Refreshed the full-screen YOU module with the same token system as the main app.
- Kept the reflective/self-discovery mood, but removed the old loud gradient-heavy look.
- Updated:
  - header and secret star controls;
  - mode selector;
  - next/action buttons;
  - round indicator;
  - drag-and-drop choice zones;
  - quality cards;
  - loading/error/empty states;
  - final portrait result;
  - discussion result;
  - hidden facts/hypotheses modal;
  - mobile and landscape layouts.

Why this matters:

YOU is a high-attention interaction: users are sorting statements about themselves. The old UI was very dense and visually noisy. The new pass makes the task calmer, makes the zones easier to read, and keeps the result text in a long-form reading frame.

Known follow-up:

- The underlying drag/drop flow still relies on small cards. A future UX pass could add a true mobile-first tap flow.
- Some generated final-report typography depends on model output. The markdown renderer could be made more structured.
- The secret triple-tap affordance remains hidden by design, but could use a safer discoverability hint for testers.

## Hotfix: main composer raised

The main bot message composer was too close to the bottom edge in the app preview/browser viewport, making the lower half of the textarea and the send button hard to reach. Added a compositor visibility fix:

- switched `html, body` to `100dvh`;
- increased bottom padding on `.input-container`;
- included `env(safe-area-inset-bottom)` for mobile/browser chrome;
- kept a smaller bottom offset on short-height screens.

## Step 8 completed: Knowledge Style editor pass

Scope:

- Added a dedicated header for the Communication Style tab.
- Added live stats for the editable style text: characters, words and lines.
- Updated stats on edit, save and cancel.
- Restyled the style textarea as an editor surface rather than a raw dump.

Why this matters:

The Communication Style register is the only manually editable memory surface. It needs to feel like an intentional editor because users can directly shape how the assistant speaks to them.

## Step 9 completed: Help modal / product guide pass

Scope:

- Rewrote the help modal so it matches the current product, not the older 33-scale prototype copy.
- Added a product-guide hero.
- Added feature cards for memory registers.
- Added a clear section for main modules: Knowledge, YOU, Dating, Reports and Dialogs.
- Added current Dating report-mode explanation.
- Updated privacy wording and version/footer copy.
- Added dedicated help modal CSS.

Why this matters:

Help is part of onboarding. It should describe the product that exists now. The old text mentioned outdated dimensions and did not explain reports, dialogs, or the new data-provenance model.

## Step 10 completed: Invite / onboarding modal pass

Scope:

- Rewrote the invite modal to match the redesigned product voice.
- Replaced the loud marketing wall with a concise beta/onboarding explanation.
- Added a product hero, feature grid, privacy card, honest beta warning and cleaner invite form.
- Updated invite modal CSS for the new token system and mobile layout.

Why this matters:

The invite modal is the first screen a new user sees. It should establish trust, explain the product clearly, and set beta expectations without sounding like a hype page.

## Step 11 completed: CSS modularization with legacy toggle

Scope:

- Moved the old accumulated stylesheet into `styles/legacy.css`.
- Replaced root `style.css` with a small compatibility note.
- Split redesign layers into separate files:
  - `styles/shell-redesign.css`
  - `styles/dating-redesign.css`
  - `styles/knowledge-redesign.css`
  - `styles/reports-redesign.css`
  - `styles/dialogs-redesign.css`
  - `styles/you-redesign.css`
  - `styles/help-invite-redesign.css`
- Updated `index.html` to load CSS through a small head loader.

Secret QA toggle:

- Open with `?legacy=0` to disable old CSS and persist that choice.
- Open with `?legacy=1` to enable old CSS and persist that choice.
- Console helpers:
  - `toggleLegacyCss(false)` disables old CSS and reloads.
  - `toggleLegacyCss(true)` enables old CSS and reloads.
  - `isLegacyCssEnabled()` returns the current persisted state.

Why this matters:

The redesign was intentionally layered on top of a large historical stylesheet. The legacy toggle lets us quickly see what the new modular CSS still depends on. With legacy off, missing base styles become visible immediately.

Known follow-up:

- The redesign files are not yet complete standalone replacements. Expect breakage with `?legacy=0` at first.
- Next passes should test screens with legacy disabled, then move missing base rules into the appropriate module.

## Hotfix: legacy-off dropdowns/overlays hidden by default

A mobile test with legacy CSS disabled exposed a structural dependency: old `legacy.css` owned `display: none` for settings dropdowns, language dropdowns and modals. Without it, the settings/language menu appeared immediately on page load.

Patched `styles/shell-redesign.css` with standalone base defaults:

- reset / box sizing;
- hidden settings dropdown until `.open`;
- hidden language dropdown until `.open`;
- hidden modal overlays until `.active`;
- `body.modal-open .chat-container` behavior.

This keeps `?legacy=0` usable for QA.

## Hotfix: legacy-off layout structure

Mobile testing with `?legacy=0` exposed more dependencies on old CSS:

- main chat needed explicit flex/scroll structure;
- app overlays needed fixed geometry;
- Knowledge modal needed `flex-direction: column` and scroll containers;
- structured memory view was laying out horizontally because the old modal column rules were absent.

Patched:

- `styles/shell-redesign.css`
- `styles/knowledge-redesign.css`

The Knowledge modal should now stack header → tabs → memory list → info strip instead of spreading sideways.

## Hotfix: cross-module header button collision

Mobile `?legacy=0` testing exposed a class-name collision: header buttons use classes like `dating-btn` and `reports-btn`, while module action buttons use the same class names. With legacy disabled, module CSS could override top navigation buttons and turn an icon into a wide pill.

Added `styles/final-overrides.css`, loaded last, to lock header buttons to compact square navigation controls. This file is intentionally for cross-module collision fixes only.

## Revert: CSS split / legacy toggle attempt rolled back

The attempt to split the large stylesheet into modules and test with `?legacy=0` caused broad visual regressions on mobile. We reverted to a single `style.css` while keeping the redesign work itself.

What was reverted:

- Removed the CSS loader from `index.html`.
- Restored `<link rel="stylesheet" href="style.css">`.
- Restored header button class names to their pre-split form.
- Rebuilt one large `style.css` from the pre-split legacy styles plus redesign layers.
- Removed the `styles/` directory and the `?legacy=0` testing mechanism.

Reason:

The old stylesheet still carried too many structural layout assumptions. Splitting safely requires a slower extraction plan with visual regression checks. For now, product stability wins.
