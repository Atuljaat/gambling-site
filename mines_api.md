# Mines Game — API Documentation

## Overview

A provably fair single-player Mines game on a **5×5 board** (25 cells, positions 0–24 laid out horizontally). Users choose how many mines (1–24) to place, then reveal cells one by one. Each safe reveal multiplies the payout by **1.25×**. Hit a mine and you lose your bet. Cash out at any time to lock in your winnings.

---

## Game Flow

```
1. User calls POST /api/mines/start with clientSecret, betAmount, mineCount
   ↓
2. If user already has an ACTIVE game → return it (no new bet)
   ↓
3. Otherwise: validate balance → get/create server secret → generate mines → deduct bet → create game
   ↓
4. User calls POST /api/mines/reveal with gameId and position
   ↓
5. If mine → BUSTED (game over, payout = 0, mine positions revealed)
   If safe → multiplier × 1.25, continue playing
   If all safe cells revealed → automatic cash-out
   ↓
6. User calls POST /api/mines/cashout to lock in winnings
   ↓
7. Payout = betAmount × currentMultiplier, credited to user balance
```

---

## Server Secret Flow

```
User starts first game ever
  → No active secret exists → CREATE new secret (ounce = 1)
  → Use for mine generation

User starts another game WITHOUT revealing the secret
  → Active secret exists → INCREMENT ounce by 1
  → Reuse same secret with new ounce

User asks to reveal/check the secret (POST /api/mines/secret)
  → Current secret marked as REVEALED
  → New active secret created (ounce = 1)
  → Revealed secret value returned to user for verification

User starts game AFTER revealing
  → Uses the new active secret (ounce = 1)
```

### Ounce Behavior

- **Starts at 1** for every new server secret.
- **Increments by 1** each time the same server secret is reused for a new game (without being revealed first).
- The ounce value used for each game is stored on the `MineGame` record for deterministic verification.
- When a secret is revealed and a new one is created, the new secret starts at ounce = 1.

---

## Mine Generation Logic

**Algorithm** (deterministic — same inputs always produce the same board):

1. Concatenate: `clientSecret + serverSecret + ounce` (as string)
2. SHA-256 hash the concatenation → 64 hex characters
3. Walk the hash 2 characters at a time:
   - Parse 2 hex chars → integer (0–255)
   - `candidate = value % 25` → board position (0–24)
   - If position already occupied by another mine, increment by 1 and wrap at 25
   - Place the mine
4. Repeat until all `mineCount` mines are placed

**Board Layout**: 25 cells numbered 0–24, laid out horizontally:

```
 0  1  2  3  4
 5  6  7  8  9
10 11 12 13 14
15 16 17 18 19
20 21 22 23 24
```

**Verification**: Anyone with the `clientSecret`, `serverSecret`, and `ounce` can reproduce the exact mine positions using the algorithm above.

---

## Multiplier Behavior

- Starts at **1.00×** when the game begins.
- On each safe tile reveal: `newMultiplier = currentMultiplier × 1.25`
- All multiplier and payout values are **rounded to 2 decimal places**.
- Example progression (3 mines):
  - 0 reveals: 1.00×
  - 1 reveal: 1.25×
  - 2 reveals: 1.56×
  - 3 reveals: 1.95×
  - 4 reveals: 2.44×
  - ...

---

## Endpoints

### 1. Start or Load Game

**`POST /api/mines/start`**

Start a new game or return the user's existing active game.

**Request Body:**
```json
{
  "clientSecret": "my-random-seed-123",
  "betAmount": 100,
  "mineCount": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clientSecret` | string | ✅ | User-provided seed for provably fair generation |
| `betAmount` | number | ✅ | Bet amount (positive, deducted from balance) |
| `mineCount` | integer | ✅ | Number of mines (1–24) |

**Success Response (200):**
```json
{
  "id": "cm...",
  "userId": "abc123",
  "clientSecret": "my-random-seed-123",
  "ounce": 1,
  "betAmount": 100,
  "mineCount": 3,
  "revealedCells": [],
  "status": "ACTIVE",
  "currentMultiplier": 1.0,
  "payout": null,
  "createdAt": "2026-03-31T12:00:00.000Z",
  "endedAt": null,
  "totalSafeCells": 22
}
```

> **Note:** `minePositions` is never included while the game is ACTIVE.

**Error Responses:**
- `400` — Invalid input / insufficient balance
- `401` — Not authenticated

---

### 2. Reveal Tile

**`POST /api/mines/reveal`**

Reveal a tile on the board.

**Request Body:**
```json
{
  "gameId": "cm...",
  "position": 12
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gameId` | string | ✅ | The game ID |
| `position` | integer | ✅ | Board position to reveal (0–24) |

**Safe Reveal Response (200):**
```json
{
  "id": "cm...",
  "revealedCells": [12],
  "status": "ACTIVE",
  "currentMultiplier": 1.25,
  "totalSafeCells": 22,
  ...
}
```

**Mine Hit Response (200):**
```json
{
  "id": "cm...",
  "revealedCells": [12, 7],
  "status": "BUSTED",
  "currentMultiplier": 1.25,
  "payout": 0,
  "minePositions": [7, 15, 22],
  "endedAt": "2026-03-31T12:01:00.000Z",
  ...
}
```

> **Note:** `minePositions` is only included when the game ends (BUSTED or CASHED_OUT).

**Error Responses:**
- `400` — Invalid position / already revealed / game not yours
- `401` — Not authenticated
- `404` — Game not found
- `409` — Game not active

---

### 3. Cash Out

**`POST /api/mines/cashout`**

Cash out the current game and receive the payout.

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Success Response (200):**
```json
{
  "id": "cm...",
  "status": "CASHED_OUT",
  "currentMultiplier": 1.56,
  "payout": 156,
  "minePositions": [7, 15, 22],
  "endedAt": "2026-03-31T12:02:00.000Z",
  ...
}
```

**Error Responses:**
- `400` — No tiles revealed yet / game not yours
- `401` — Not authenticated
- `404` — Game not found
- `409` — Game not active

---

### 4. Get Current Game

**`GET /api/mines/current`**

Get the user's currently active game, if any.

**Success Response (200) — Game Exists:**
```json
{
  "id": "cm...",
  "status": "ACTIVE",
  "revealedCells": [3, 8],
  "currentMultiplier": 1.56,
  ...
}
```

**Success Response (200) — No Active Game:**
```json
{
  "game": null
}
```

---

### 5. Reveal Server Secret

**`POST /api/mines/secret`**

Reveal/check the active server secret. This marks the current secret as REVEALED and creates a new active one. **Cannot be called while a game is active.**

**Request Body:** _(empty or `{}`)_

**Success Response (200):**
```json
{
  "revealedSecret": "a1b2c3d4e5f6...64 hex chars",
  "ounceAtReveal": 3,
  "newActiveSecretCreated": true
}
```

**Error Responses:**
- `401` — Not authenticated
- `404` — No active secret found
- `409` — Cannot reveal while a game is active

---

### 6. Game History

**`GET /api/mines/history?limit=20&offset=0`**

Get completed games (BUSTED and CASHED_OUT) with mine positions visible.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 20 | Max 50 |
| `offset` | integer | 0 | Pagination offset |

**Success Response (200):**
```json
{
  "games": [
    {
      "id": "cm...",
      "status": "CASHED_OUT",
      "minePositions": [7, 15, 22],
      "payout": 156,
      ...
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

## Data Models

### `server_secret` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → user.id |
| `serverSecret` | String | 64-char hex (32 random bytes) |
| `status` | Enum | `ACTIVE` or `REVEALED` |
| `currentOunce` | Int | Starts at 1, increments per game reuse |
| `createdAt` | DateTime | Auto-set |
| `revealedAt` | DateTime? | Set when revealed |

**Indexes:** `(userId, status)` — fast lookup of active secret per user.

### `mine_game` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → user.id |
| `serverSecretId` | String | FK → server_secret.id |
| `clientSecret` | String | User-provided seed |
| `ounce` | Int | Snapshot of ounce used for this game |
| `betAmount` | Float | Bet amount |
| `mineCount` | Int | Number of mines (1–24) |
| `minePositions` | JSON | Int[] of mine positions (0–24) |
| `revealedCells` | JSON | Int[] of revealed cell positions |
| `status` | Enum | `ACTIVE`, `CASHED_OUT`, or `BUSTED` |
| `currentMultiplier` | Float | Current multiplier (starts at 1.0) |
| `payout` | Float? | Final payout (null while active) |
| `createdAt` | DateTime | Auto-set |
| `endedAt` | DateTime? | Set when game ends |

**Indexes:** `(userId, status)` — fast lookup of active game per user.

---

## Assumptions

1. **Authentication**: All endpoints require an authenticated session via `better-auth`. Session is verified server-side on every request.
2. **One active game at a time**: A user can only have one ACTIVE Mines game. Starting a new game while one is active returns the existing game.
3. **Flat multiplier**: The multiplier is a flat 1.25× per safe reveal regardless of mine count. This may be adjusted in the future.
4. **Balance precision**: All monetary values are rounded to 2 decimal places using `Math.round(n * 100) / 100`. The underlying `Float` type may have minor precision limitations.
5. **Must reveal at least one tile** before cashing out.
6. **Cannot reveal server secret** while a game is active. User must finish or cash out first.
7. **Server secret is never exposed** unless the user explicitly calls the reveal endpoint.
8. **Auto cash-out**: If a user reveals all safe cells, the game automatically cashes out at the final multiplier.
9. **Board positions are 0-indexed** (0–24), laid out horizontally left-to-right, top-to-bottom on the 5×5 grid.
10. **No FORFEITED status**: Games can only end as BUSTED (hit mine) or CASHED_OUT (user or auto cash-out). A future admin feature could add forfeiture.
