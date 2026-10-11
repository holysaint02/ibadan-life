// db.js — minimal file-based persistence.
// Swap this for Postgres/Mongo later if you outgrow it; the interface
// (getUser, saveUser, getAllUsers) is small on purpose.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'players.json');

function load() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.error('Corrupt data file, starting fresh:', e.message);
    return {};
  }
}

function persist(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getUser(username) {
  const data = load();
  return data[username.toLowerCase()] || null;
}

function saveUser(user) {
  const data = load();
  data[user.username.toLowerCase()] = user;
  persist(data);
}

function getAllUsers() {
  const data = load();
  return Object.values(data);
}

module.exports = { getUser, saveUser, getAllUsers };
