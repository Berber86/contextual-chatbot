# Impeccable UI notes for this project

Source studied locally: `../impeccable` (`pbakaus/impeccable`). Use this as a compact checklist when changing the Memory Chatbot / dating UI.

## Register

This project is primarily **product UI**: chat, modals, forms, candidate analysis, settings, reports. Design should serve task flow. Prefer earned familiarity over decorative novelty.

## Product UI principles

- Consistency is an affordance. Same buttons, toggles, inputs, hints, result panels and loading states should behave and look the same across modules.
- Accent color should mark primary actions, current selection, and semantic states. Avoid using accent as decoration everywhere.
- Every interactive component needs states: default, hover, focus, active, disabled, loading, error/success where relevant.
- Loading inside existing content should usually be skeleton or inline feedback, not only a centered spinner.
- Empty states should teach what to do next.
- Avoid modal-first thinking for new flows, but this project already uses modals heavily, so keep modal flows consistent and reduce density where possible.

## Layout

- Use space as structure. Tight spacing for related controls, larger separation between conceptual groups.
- Prefer a 4px spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64.
- Avoid arbitrary one-off margins and padding unless there is a clear optical reason.
- Flex for one-dimensional rows, grid for true two-dimensional layouts.
- Avoid cards inside cards. Use section boundaries, dividers, spacing, and background contrast instead.
- Touch targets should be at least 44×44px on mobile.
- Check narrow viewports for horizontal overflow and cramped button grids.

## Typography

- Product UI can use one clear sans stack. Personality matters less than readability and trust.
- Fixed `rem` type scale is better than fluid headings in app UI.
- Keep body text readable, usually at least 16px where there is paragraph content.
- Use a tighter product scale, roughly 1.125–1.2 between UI text levels.
- Use `max-width: 65–75ch` for prose/report text.
- On dark backgrounds, light text often needs a little more line height.

## Color and contrast

- Body text must meet WCAG AA contrast, 4.5:1. Large text needs 3:1.
- Placeholder text also needs adequate contrast.
- Avoid generic gray text on colored/tinted surfaces. Use a tinted text color or alpha of the main ink color.
- Use tokens or recurring values instead of scattering hard-coded colors.
- Semantic colors should keep meaning: error, warning, success, info, selected, disabled.

## Motion

- Product motion should convey state, not decorate.
- Most UI transitions should be 150–250ms.
- Avoid bounce/elastic easing.
- Do not animate layout properties casually. Prefer opacity, transform, color, border, shadow.
- Always respect `prefers-reduced-motion` for bigger animations.

## Copy

- Every word should earn its place.
- Avoid repeated headings and generic helper text.
- Be concrete: tell the user what the control does and what data is or is not used.
- Avoid AI-sounding filler, marketing adjectives, and symmetrical three-part copy everywhere.

## Audit checklist before saying UI work is done

- [ ] No broken syntax or console-breaking JS.
- [ ] Buttons disabled/enabled correctly for all data states.
- [ ] Focus states visible.
- [ ] Inputs have labels and useful placeholders.
- [ ] Mobile layout does not overflow.
- [ ] Result/loading/error states are present.
- [ ] Colors and spacing align with neighboring UI.
- [ ] No nested-card visual clutter.
- [ ] Copy states data usage accurately, especially in dating reports.
- [ ] New UI does not introduce a second visual vocabulary.

## Specific to dating compatibility reports

- Data provenance must be explicit: what is used, what is ignored.
- If a mode ignores owner embedding/profile, the UI text and prompt must both say so.
- Reliability gates belong in both code and prompt. Do not merely ask the model to ignore low-confidence data if code can avoid sending it.
- Candidate age/gender context can matter, but only pass the context actually intended for that report.
