# Bird City -- Game Design

## Concept
A daily city-building puzzle. Place colored tiles on a grid, growing outward from a river. Score points for large connected groups of the same color. Solo play, then compare with friends.

**Inspirations**: Wordle (daily, shareable), MyCity (tile placement, adjacency growth), Tetris (polyominoes)

## Grid
- **Size**: 7 columns x 10 rows (70 cells)
- **Terrain**:
  - **River** -- meanders top to bottom, 1 cell wide, non-buildable, starting anchor
  - **Rocks** (8-10) -- penalty if left uncovered
  - **Trees** (4-6) -- bonus if left uncovered

## Placement Rule
Tiles must be placed **adjacent to the river** or **adjacent to an existing tile**. The city grows outward from the river. You cannot build on river cells.

## Tile Colors
Three warm colors: **Rust**, **Sand**, **Sage**

## Tile Shapes (7 fixed)
- Domino (2 cells)
- Bar (4 cells, I-shape)
- Jay (4 cells, J-shape)
- Tee (4 cells, T-rotated)
- Ess (4 cells, S-shape)
- Square (4 cells, 2x2)
- Cup (5 cells, C/U-shape)

Each tile can be **rotated** (90 increments) and **flipped** (mirror).

## Daily Sequence
- 22 tiles per game (~85 cells total, more than the ~60 buildable cells)
- Each tile gets a random shape + color from the daily seed
- All players get the same sequence
- Tiles arrive one at a time; place or skip before seeing the next

## Skip Mechanic
- Any tile can be skipped (discarded)
- Each skip costs **-2 points**
- No limit on skips

## Scoring
1. **Largest connected group per color**: +size (e.g. biggest rust group = 12 cells = +12)
2. **Uncovered trees**: +1 each
3. **Uncovered rocks**: -1 each
4. **Skip penalty**: -2 per skipped tile

Star ratings: >0 = 1 star, 20+ = 2, 30+ = 3, 40+ = 4, 50+ = 5

## Sharing
Emoji grid + score, copyable to clipboard:
```
Bird City #42 🏙️
Score: 38 ⭐⭐⭐
🟧🟧🟨🟨💧
🟧🟧🟩🟨💧
🟩🟩🟩⬜🪨
🌲🟩🟧🟧⬜
```

## Stats (localStorage)
- Games played, streaks, best/average score, last 30 days history

## Future Ideas
- Churches, markets, walls (new scoring mechanics)
- Legacy mode (weekly evolving rules)
- River as hard boundary (forces strategic bridging)
- Leaderboards with invite codes
