// db.js — Postgres-backed persistence.
// Same small interface as before (getUser, saveUser, getAllUsers),
// now backed by a real database so data survives restarts/redeploys.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const ready = pool.query(`
  CREATE TABLE IF NOT EXISTS players (
    username TEXT PRIMARY KEY,
    data JSONB NOT NULL
  )
`);

async function getUser(username) {
  await ready;
  const res = await pool.query(
    'SELECT data FROM players WHERE username = $1',
    [username.toLowerCase()]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0].data;
}

async function saveUser(user) {
  await ready;
  await pool.query(
    `INSERT INTO players (username, data) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET data = $2`,
    [user.username.toLowerCase(), user]
  );
}

async function getAllUsers() {
  await ready;
  const res = await pool.query('SELECT data FROM players');
  return res.rows.map((row) => row.data);
}

module.exports = { getUser, saveUser, getAllUsers };
