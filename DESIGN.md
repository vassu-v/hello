# Blueprint: The Architectural Logic Puzzle

Blueprint is a premium spatial logic game inspired by LinkedIn Patches. It transforms the abstract task of filling a grid into a satisfying architectural exercise: rebuilding a legendary "Lost City" one district at a time.

## A. Game Concept
- **Core Loop:**
  1. **Examine:** View the daily "Site Survey" (the grid with architectural clues).
  2. **Draft:** Drag and draw "Zones" (rectangles) to satisfy the clues.
  3. **Validate:** The system live-checks constraints.
  4. **Complete:** Fill the entire site to "Construct" the district.
  5. **Expand:** Add the completed district to your persistent "City Map."
- **Fun Factor:** The "Aha!" moment comes from the intersection of geometric deduction and visual completion. It feels less like a math problem and more like sketching a floor plan.

## B. Unique Twist / Differentiator: "Live Constraints"
Unlike Patches, Blueprint features **Dynamic Legend feedback**.
- **The Twist:** As you draw a shape, the clue doesn't just turn gray; it *visualizes* the possible remaining shapes for other clues.
- **Differentiator:** "Ghost Guides" — if a clue requires a 3x3 square, Blueprint subtly highlights the valid placement area for that specific clue when the player taps it, reducing frustration without solving the puzzle for them.

## C. Core Rules
- **Puzzle Logic:**
  - The grid must be entirely filled with non-overlapping rectangles.
  - Each clue must be contained within exactly one rectangle.
  - The rectangle must match the clue's requirement:
    - **Numbered clues:** Must cover exactly that many cells.
    - **Shape clues:** Must be a Square, Tall Rectangle, or Wide Rectangle.
- **Win Condition:** Every cell is assigned to a valid zone that satisfies its contained clue.
- **Constraints:** No "floating" cells (every cell must be part of a zone). Zones cannot overlap.

## D. UX / UI
- **Layout:**
  - Header: Daily Title (e.g., "District 42: The Library").
  - Center: The Grid (blueprint-blue background, white "sketch" lines).
  - Footer: Interactive Legend and Undo/Hint buttons.
- **Interactions:**
  - Tap and drag to create a zone.
  - Tap an existing zone to delete it.
  - Long-press a clue to see its "Ghost Guide" (allowable area).
- **Onboarding:** A 3-step interactive "First Site" puzzle that guides the user through drawing their first square and rectangle.
- **Hint System:** "Structural Check" — highlights one cell that is currently incorrectly assigned or unassigned.

## E. Daily Retention
- **The District:** Every daily solve adds a stylized isometric building to a "City Map" view.
- **Streaks:** 5-day streaks unlock "Material Themes" (e.g., Marble, Bronze, Glass) that change the grid's visual style.
- **Progression:** The city evolves from a small outpost to a sprawling metropolis over months of play.

## F. Visual Direction
- **Style:** Architectural Blueprint.
- **Feel:** Technical, calm, precise.
- **Animations:**
  - Drawing a zone feels like a pencil stroke.
  - Completion triggers a "blueprint-to-reality" transition where the 2D grid briefly tilts into an isometric 3D building before saving to the city map.

## G. MVP Scope
- **Ships First:**
  - Daily 5x5 and 6x6 puzzles.
  - Core drawing mechanics.
  - Basic "City Map" that tracks completion count.
  - Local storage-based streaks.
- **Avoid for Now:**
  - Social sharing/leaderboards.
  - Real-time multiplayer.
  - Advanced 10x10+ grids.

## H. Risks / Weak Spots
- **Risk:** High difficulty can lead to bounce-off.
  - **Mitigation:** Ensure the "Ghost Guide" is helpful enough to keep the flow moving.
- **Risk:** Repetitive visuals.
  - **Mitigation:** The "Material Themes" and "City Map" evolution provide visual variety.
