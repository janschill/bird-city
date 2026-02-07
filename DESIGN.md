# Bird City -- Game Design

## Concept
A daily city-building puzzle. Every player gets the same sequence of building tiles and places them onto a grid to maximize their score. Solo play, then compare with friends.

**Inspirations**: Wordle (daily, shareable), MyCity (tile placement, scoring), Tetris (polyominoes)

## Grid
- **Size**: 7 columns x 10 rows (70 cells)
- **Terrain features** are pre-placed on the grid:
  - **Rocks** (grey) -- scattered; penalty if left uncovered at end
  - **Trees** (green) -- near edges; interact with parks
  - **River** (blue) -- flows through grid; interacts with shops

## Building Types

| Type    | Color  | Base pts | Bonus | Penalty |
|---------|--------|----------|-------|---------|
| House   | Orange | 1/cell   | +1 per adjacent park cell | -2 per adjacent factory cell |
| Park    | Green  | 2/cell   | +1 per adjacent tree (terrain) | 0 pts if not adjacent to any house |
| Shop    | Blue   | 1/cell   | +1 per cell adjacent to river; cluster bonus (connected group size - 1) | -- |
| Factory | Purple | 3/cell   | -- | -2 per adjacent house cell |

## Tiles
Polyomino shapes (1-5 cells), each assigned a building type.

Sizes in the pool:
- Domino (2 cells) -- common
- Triomino (3 cells) -- common (I, L shapes)
- Tetromino (4 cells) -- regular (T, L, S, Z, O, I)
- Pentomino (5 cells) -- occasional, harder to place

Each tile can be **rotated** (90 increments) and **flipped** (mirror).

## Daily Sequence
- 22 tiles per game
- Determined by a seeded PRNG from the date (all players get the same sequence)
- Mix: ~8 houses, ~4 parks, ~5 shops, ~5 factories (varies by day)
- Tiles arrive one at a time; player must place or skip before seeing the next

## Skip Mechanic
- Any tile can be skipped (discarded)
- Each skip costs **-2 points**
- No limit on skips

## End-Game Scoring
1. Sum all building scores (base + bonuses - penalties)
2. **Complete rows**: +2 per fully filled row
3. **Uncovered rocks**: -1 each
4. **Skip penalty**: -2 per skipped tile
5. Final score displayed with star rating:
   - 1 star: any positive score
   - 2 stars: 40+
   - 3 stars: 60+
   - 4 stars: 80+
   - 5 stars: 100+

## Sharing
After finishing, player gets a copyable text block:

```
Bird City #42
Score: 73 ⭐⭐⭐
🟧🟧🏠🏠⬜
🟧🏠🏠🟪⬜
🌲🏠🟦🟦💧
🌲🟦🟦⬜💧
```

Grid uses emoji to represent the final city state (simplified to fit).

## Stats (localStorage)
- Games played
- Current streak / max streak
- Score history (last 30 days)
- Average score
- Best score

## UI Principles
- Mobile-first, works great on phone
- App-like feel (no page scrolling during play, full viewport)
- Touch: tap grid cell to place tile at that position (anchored to top-left of shape)
- Large tap targets for rotate / flip / skip
- Clean typography, muted earth-tone palette
- Smooth transitions for placement

## Future Ideas (not in MVP)
- Churches, markets, walls (new building types)
- Legacy mode (weekly evolving rules)
- Undo (limited, costs points?)
- Hard mode (smaller grid or more tiles)
- Friend leaderboards with invite codes
