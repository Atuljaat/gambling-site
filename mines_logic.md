# Mines Game Logic

This document explains the full business logic for a provably fair Mines game in simple language. The goal is to make the game understandable, verifiable, and safe to explain to an AI coding assistant.

## 1. What a Mines game is

In a Mines game:

- The board has a fixed number of tiles.
- Some tiles are mines.
- The rest are safe tiles.
- The player chooses tiles one by one.
- If the player clicks a mine, the round is lost.
- If the player clicks a safe tile, the payout multiplier increases.
- The player can cash out at any time before hitting a mine.

For a common setup:

- Total tiles: `25`
- Mines selected by user: for example `1` to `24`
- Safe tiles: `25 - mines`

## 2. The two separate parts of the system

A correct Mines implementation should separate these two things:

1. Mine placement logic
2. Payout logic

This separation is important.

Mine placement decides where the mines are.

Payout logic decides how much the player wins if they survive a certain number of safe picks.

If you want a house edge, apply it to payouts, not to mine placement.

That means:

- Do not secretly move mines to make players lose more.
- Do not change results after the round starts.
- Keep mine generation deterministic and provably fair.
- Put the business margin in the multiplier calculation.

## 3. Core fairness idea

The game should be "provably fair".

That means the server commits to a hidden value before the round, and later the player can verify that the mine layout came from:

- server seed
- client seed
- nonce
- mine count

The important idea is:

- The server seed is secret during the round.
- The server seed hash can be shown before reveal as a commitment.
- After the round, the server seed can be revealed.
- Anyone can recompute the mine positions using the exact same algorithm.

This proves the server did not change the result afterward.

## 4. Recommended data for each round

Each round should store at least:

- `matchId`
- `userId`
- `betAmount`
- `minesCount`
- `boardSize`
- `clientSeed`
- `serverSeed`
- `serverSeedHash`
- `nonce`
- `minePositions`
- `revealedSafePicks`
- `state` (`active`, `lost`, `cashed_out`)
- `cashoutMultiplier`
- `payout`
- `createdAt`
- `finishedAt`

Notes:

- `serverSeedHash` is usually the hash of `serverSeed`.
- `minePositions` should be generated once and then kept fixed for that round.
- `nonce` should change every round.

## 5. Provably fair mine generation

The basic idea:

1. Build one deterministic random stream from the seeds.
2. Use that stream to shuffle or select positions.
3. Take the first `minesCount` positions as mines.

The same inputs must always generate the same board.

## 6. Inputs used for mine generation

Use these values:

- `serverSeed`
- `clientSeed`
- `nonce`
- `boardSize`
- `minesCount`

Example:

- `boardSize = 25`
- `minesCount = 5`
- `clientSeed = "player123"`
- `serverSeed = "secret-server-seed"`
- `nonce = 42`

## 7. Commitment step

Before the round starts:

1. Generate a random `serverSeed`
2. Compute `serverSeedHash = SHA256(serverSeed)`
3. Store both values
4. Show only `serverSeedHash` before reveal if you want pre-commit fairness

After the round ends:

- Reveal `serverSeed`
- The user can hash it and confirm it matches `serverSeedHash`
- The user can recompute the mine positions

## 8. Simple beginner-friendly generation model

One good implementation pattern is:

1. Create an array of tile indexes
2. Shuffle it using a deterministic random source based on the seeds
3. Take the first `minesCount` items
4. Sort them if you want stable display order

For a 25-tile board, indexes are:

`[0, 1, 2, ..., 24]`

If `minesCount = 3` and the shuffled result starts like:

`[11, 2, 19, ...]`

Then the mine positions are:

`[11, 2, 19]`

## 9. Deterministic random source

A common way is to use HMAC or hash output as a repeatable random source.

Conceptually:

```text
randomBytes = HMAC_SHA256(serverSeed, clientSeed + ":" + nonce + ":" + cursor)
```

Where:

- `cursor` changes when you need more random bytes
- the same inputs always give the same bytes

From those bytes, you derive random numbers and use them in the shuffle.

## 10. Fisher-Yates shuffle approach

This is a good model to explain to an AI:

1. Start with `positions = [0..boardSize-1]`
2. For `i` from `boardSize - 1` down to `1`
3. Generate a deterministic random integer `j` between `0` and `i`
4. Swap `positions[i]` and `positions[j]`
5. After shuffle ends, first `minesCount` positions are mines

This works well because:

- it is simple
- it is standard
- it is easy to verify
- it avoids weird custom logic

## 11. Pseudocode for mine generation

```text
function generateMines(serverSeed, clientSeed, nonce, boardSize, minesCount):
    positions = [0, 1, 2, ..., boardSize - 1]
    cursor = 0

    for i from boardSize - 1 down to 1:
        rand = deterministicRandomFloat(serverSeed, clientSeed, nonce, cursor)
        j = floor(rand * (i + 1))
        swap positions[i] with positions[j]
        cursor += 1

    mines = first minesCount items from positions
    sort mines ascending
    return mines
```

## 12. Very important rule

Generate the mine positions once per round.

Do not regenerate mines after each click.

The board must already be fixed when the round starts.

The click only reveals whether the selected tile was already safe or already a mine.

## 13. Game flow

A normal game flow looks like this:

### Round start

1. User chooses bet amount
2. User chooses number of mines
3. System creates a round with:
   - seeds
   - nonce
   - board size
   - mine positions
4. User balance is reduced by bet amount
5. Round state becomes `active`

### Each click

1. User clicks a tile
2. Check whether tile index is in `minePositions`
3. If yes:
   - round state becomes `lost`
   - payout is `0`
   - reveal full board
4. If no:
   - add tile to safe picks
   - update current multiplier
   - allow user to continue or cash out

### Cash out

1. User clicks cash out
2. Final payout = `betAmount * currentMultiplier`
3. Credit user balance
4. Round state becomes `cashed_out`

## 14. How payout should work

The fair payout depends on probability.

As the player survives more safe picks, it becomes harder to continue surviving, so the multiplier should increase.

### Variables

- `T = total tiles`
- `M = mines count`
- `S = T - M` safe tiles
- `k = number of successful safe picks`

For a standard board:

- `T = 25`

## 15. Fair multiplier formula

The fair multiplier after `k` successful safe picks is:

```text
fairMultiplier(k) =
  product from i = 0 to k - 1 of (T - i) / (S - i)
```

For Mines:

```text
fairMultiplier(k) =
  product from i = 0 to k - 1 of (25 - i) / (25 - M - i)
```

This reflects the true probability of surviving those picks.

## 16. Adding the house edge

If you want a business margin, apply it here.

Use:

```text
displayMultiplier(k) = fairMultiplier(k) * houseEdge
```

Where:

- `houseEdge = 0.99` means 1% house edge
- `houseEdge = 0.98` means 2% house edge

This is the correct place for the platform cut.

Do not hide the cut by changing mine placement.

## 17. Step-by-step multiplier update

You can also calculate it incrementally after each safe click.

Start with:

```text
currentMultiplier = 1
remainingTiles = 25
remainingSafeTiles = 25 - minesCount
```

After each safe click:

```text
currentMultiplier *= remainingTiles / remainingSafeTiles
remainingTiles -= 1
remainingSafeTiles -= 1
```

Then apply the house edge.

Two ways are common:

### Option A: Apply edge at the end

```text
finalMultiplier = currentMultiplier * houseEdge
```

### Option B: Pre-bake edge into displayed multipliers

```text
displayMultiplier = fairMultiplier * houseEdge
```

For most products, Option B is simpler for UI because the shown number is the actual cash-out multiplier.

## 18. Example payout

Suppose:

- `betAmount = 100`
- `boardSize = 25`
- `minesCount = 3`
- `houseEdge = 0.99`
- player survives `2` safe picks

Then:

```text
fairMultiplier(2) = (25 / 22) * (24 / 21)
```

Which is about:

```text
1.298701...
```

Apply house edge:

```text
displayMultiplier = 1.298701 * 0.99 = 1.285714...
```

So payout:

```text
payout = 100 * 1.285714 = 128.5714
```

Depending on your rounding rules, you might show:

`128.57`

## 19. Rounding rules

Define one consistent rounding strategy.

For example:

- store full precision internally
- display 2 decimal places in UI
- round payout to 2 decimal places only at settlement time

Be consistent, otherwise verification becomes confusing.

## 20. Business logic summary

The business logic should be:

1. Mine positions are fixed and fair
2. Mine positions come from provably fair seeds
3. The server cannot change them after round creation
4. The platform profit comes from payout edge, not manipulated mine placement
5. Match history should help users verify results

## 21. What not to do

Do not do any of these:

- regenerate mines after each user click
- move mines based on player behavior
- increase hidden mine probability mid-round
- use one algorithm for gameplay and another for verification
- display fake verification values
- show a "provably fair" badge if actual gameplay is not tied to the same seed logic

If you do these, the game is not truly verifiable.

## 22. Recommended verification UX

A clean fairness flow should work like this:

### Match history table

Show normal columns such as:

- match id
- bet amount
- mines count
- result
- payout
- profit/loss
- date/time

Do not clutter the table with raw fairness fields unless needed.

Instead, each row can have:

- `Verify Hash`

### Verify modal

When user clicks `Verify Hash`:

1. Open a modal
2. Autofill:
   - server seed
   - client seed
   - nonce
   - mines count
   - board size
3. Let user edit them manually
4. Add a `Reveal Mines` button
5. Run the exact same mine generation function used in the real game
6. Show the resulting mine positions

This makes the system look clean while still letting advanced users verify fairness.

## 23. Standalone verification action

You can also add a separate button near match history:

- `Verify Liquidity`

This can reuse the same modal.

Behavior:

- open empty modal
- user manually enters seed values
- user clicks `Reveal Mines`
- system computes mine positions using same algorithm

Even if the label later changes to something clearer like `Verify Fairness`, the main idea is that users can independently test the result.

## 24. Shared utility design

The best code structure is:

### Shared mine utility

Create one function like:

```text
generateMines(serverSeed, clientSeed, nonce, boardSize, minesCount)
```

Use this same function in:

- actual game round creation
- fairness verification modal
- match history verification

This avoids mismatches.

### Shared payout utility

Create another function like:

```text
getMultiplier(boardSize, minesCount, safePicks, houseEdge)
```

Use it in:

- live gameplay display
- cash-out calculation
- match history display if needed

## 25. Suggested backend logic

At round creation:

```text
1. Create serverSeed
2. Create serverSeedHash
3. Read clientSeed from player profile or request
4. Increment nonce
5. Generate minePositions using shared function
6. Save round data
```

At tile reveal:

```text
1. Load round
2. Ensure round is active
3. Ensure tile not already selected
4. Check if tile is in minePositions
5. Update round state
6. Return updated board state and multiplier
```

At cash out:

```text
1. Load round
2. Ensure round is active
3. Calculate multiplier from safe picks
4. Calculate payout
5. Credit user
6. Mark round as cashed_out
```

## 26. Suggested frontend logic

Frontend should:

- render board state
- send tile click requests
- show live multiplier
- show cash-out button
- show match history
- open verify modal
- recompute revealed mine positions in verification mode using same shared logic if available on client

If the shared logic only exists on backend, expose a verification endpoint or mirror the exact same deterministic utility on frontend.

## 27. Best beginner mental model

Think of the round like a sealed envelope.

Before the user starts:

- the board is already decided
- the mines are already fixed
- the server has committed to that board through the seed system

The player is not creating the board by clicking.

The player is only uncovering tiles from a board that already exists.

## 28. AI implementation brief

If you want to explain this to an AI coding assistant, tell it:

```text
Implement a provably fair Mines game where mine positions are generated once per round from serverSeed + clientSeed + nonce using a deterministic shuffle. Keep mine placement fixed and reusable for verification. Apply the business margin only through the payout multiplier, using a configurable houseEdge. Reuse the same mine-generation utility for gameplay and the fairness verification modal. In match history, show a normal table and replace direct seed columns with a Verify Hash button per row that opens an editable modal and reveals mine positions using the exact same generation algorithm. Also add a standalone Verify Liquidity button that opens the same modal without autofill so users can manually test seeds.
```

## 29. Final recommendation

If you want the system to look trustworthy and be technically defensible:

- keep randomness fixed
- keep verification reproducible
- keep the house edge explicit in payouts
- never hide margin inside manipulated mine placement
- reuse the same algorithm everywhere

That is the clean and correct business design.
