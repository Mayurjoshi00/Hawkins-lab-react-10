# Hawkins Lab — Stranger Things Quiz

## How to Run

You need **two terminals open at the same time**.

### Terminal 1 — Backend API Server (port 3001)
```bash
npm install
node server/index.js
```
You should see:
```
🔴 Hawkins Lab API running on http://localhost:3001
```

### Terminal 2 — React Frontend (port 3000)
```bash
npm run dev
```

Then open **http://localhost:3000** in your browser.

### OR — Run both at once (one terminal)
```bash
npm install
npm run start:all
```

---

## Routes
| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Quiz home page |
| `http://localhost:3000/chmod777` | Admin control panel |

## Deploy on Render

Use a **Web Service** (not Static Site) because this app has a Node backend and WebSockets.

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

Render sets `PORT` automatically; the server already uses it. Do **not** use `npm run dev`, `npm run start:all`, or `react-scripts start` on Render — those run the dev server and cause **Invalid Host header**.

After deploy, open your Render URL (e.g. `https://your-app.onrender.com`).

---

## Data persistence

Team sessions, answers, scores, and tab-switch counts are saved to `server/data/team-state.json` automatically. Data survives server restarts and admin page refreshes.

- Teams that refresh mid-quiz can log in again with the same credentials to resume progress.
- In the admin panel, **DOWNLOAD CSV** exports the leaderboard anytime.
- **CLEAR DATA** downloads a CSV backup automatically (optional file name), saves a JSON backup on the server (`server/data/backups/`), then deletes live data.

---

## Admin Panel
- URL: `http://localhost:3000/chmod777`
- Password: `chmod777`

## Team Credentials
| Team ID | Password |
|---------|----------|
| TEAM01 | hawk#9271 |
| TEAM02 | upsd@5583 |
| TEAM03 | gate!7734 |
| TEAM04 | mind$4421 |
| TEAM05 | demo%8812 |
| TEAM06 | flux&3390 |
| TEAM07 | labs*6617 |
| TEAM08 | vine!2245 |
| TEAM09 | will@7753 |
| TEAM10 | elev#3381 |
| TEAM11 | snow$9922 |
| TEAM12 | creel%4490 |
| TEAM13 | mike&8822 |
| TEAM14 | bren*6617 |
| TEAM15 | vecna!2245 |
| TEAM16 | hopper@7753 |
| TEAM17 | will#3381 |
| TEAM18 | robin$9922 |
| TEAM19 | jonathan%4490 |
| TEAM20 | max&8822 |
| TEAM21 | nancy*6617 |
