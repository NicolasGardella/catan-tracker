# 🎲 Catan Tracker for Colonist.io

A Chrome/Brave extension that automatically keeps count of each player's cards on [colonist.io](https://colonist.io), reading the in-game log in real time.

Developed by **Nikito**.

> 🇪🇸 ¿Preferís español? Mirá el [**LEEME.md**](LEEME.md).

## ✨ Features

- **Resource counting** per player (lumber, brick, wool, grain, ore)
- **Auto-reconciliation** with the real card total shown by the game
- **Robber steals**: visible and hidden (columns ❓ and 🥷)
- **Trades** between players and with the bank/port
- **Buildings**: roads, settlements and cities (with costs)
- **Development cards**: bought, in hand and used (Knight, Monopoly, etc.)
- **Tooltips** on each player with their building and development details
- **Colors** and order matching the game's panel
- 🔄 button to re-read the whole history
- Automatic chat message when the game starts

## 📥 Install on Google Chrome

1. **Download** the code: on this GitHub page, click the green **`Code`** button → **`Download ZIP`**.
2. **Unzip** it into a folder on your PC (you'll get a `catan-tracker` folder).
3. Open Chrome and go to **`chrome://extensions`** in the address bar.
4. Top right, turn on **Developer mode** (toggle).
5. Click **`Load unpacked`**.
6. Select the **`catan-tracker`** folder you unzipped.
7. Done! Go to [colonist.io](https://colonist.io) and play: the tracker panel appears at the top left.

> **Brave/Edge:** same steps, but the address is `brave://extensions` or `edge://extensions`.

> **Note:** keep the unzipped folder on your PC. If you delete or move it, the extension stops working. To update it, replace the files and click the reload 🔄 button on `chrome://extensions`.

## 🧩 Panel columns

| Column | Meaning |
|---|---|
| 🌲 🧱 🐑 🌾 ⛏️ | Known resources |
| ❓ | Cards it stole (unknown type) |
| 🥷 | Cards stolen from it (unknown type) |
| Σ | Total cards (matches the game) |

## 🛠️ Console commands

Open the browser console with **`F12`** (the **Console** tab) and type any of these while in a game:

| Command | What it does |
|---|---|
| `catanReload()` | Re-reads the **whole game history** and recalculates from scratch (same as the 🔄 button on the panel). |
| `catanReconcile()` | Forces **reconciliation** of totals with the cards shown by the game. |
| `catanReset()` | **Resets** the count to zero (clears all data). |
| `catanPlayers()` | Shows a **table** with each player's card details. |
| `catanColors()` | Shows the detected **colors** of each player. |
| `catanGreet()` | Resends the **automatic message** to the game chat. |
| `catanOrder()` | Diagnostics: shows the player **order** read from the game. |
| `catanPanel()` | Diagnostics: dumps the game's **player panel** (for debugging). |

> The diagnostic commands (`catanOrder`, `catanPanel`) are mainly for reporting issues.

## ⚠️ Disclaimer

This tool only **reads public information** from the log that is already visible to all players. It does not access opponents' hidden hands.
