# Ibadan Life

A browser-based multiplayer life-simulation game set in Ibadan, Nigeria — inspired by games like Lagos Life. Players create a character, pick a starting path (Established or Hustler), work jobs around the city, build reputation, chat with other players in real time, and climb the leaderboard.

## Stack

- **Backend**: Node.js + Express (REST API) + Socket.io (real-time presence/chat)
- **Auth**: username/password with bcrypt hashing + JWT tokens
- **Storage**: a single JSON file (`data/players.json`) — zero setup, no database server needed. Swap `db.js` for Postgres/MongoDB later if you need to scale.
- **Frontend**: plain HTML/CSS/JS, no build step, no framework — served directly by Express from `/public`.

## Run it locally

```bash
npm install
npm start
