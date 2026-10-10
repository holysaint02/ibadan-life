const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const db = require('./db');
const { STARTING_PROFILES, LOCATIONS, JOBS } = require('./gameData');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-before-deploying';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);

// ---------- helpers ----------

function publicUser(user) {
  // strip password hash before sending to client
  const { passwordHash, ...rest } = user;
  return rest;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.getUser(payload.username);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function randomPay([min, max]) {
  return Math.floor(min + Math.random() * (max - min));
}

// ---------- auth routes ----------

app.post('/api/register', (req, res) => {
  const { username, password, profile, avatar } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (db.getUser(username)) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  const startProfile = STARTING_PROFILES[profile] || STARTING_PROFILES.hustler;

  const user = {
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    avatar: avatar || '🙂',
    profile,
    cash: startProfile.cash,
    debt: startProfile.debt || 0,
    reputation: startProfile.reputation,
    energy: 100,
    happiness: 60,
    locationId: 'bodija',
    createdAt: Date.now(),
    log: [`Started life in Ibadan as a ${startProfile.label}.`],
  };
  db.saveUser(user);

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUser(username || '');
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(user) });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ---------- game data routes ----------

app.get('/api/world', (req, res) => {
  res.json({ locations: LOCATIONS, jobs: JOBS });
});

app.get('/api/leaderboard', (req, res) => {
  const top = db.getAllUsers()
    .sort((a, b) => (b.cash - b.debt) - (a.cash - a.debt))
    .slice(0, 10)
    .map(u => ({ username: u.username, avatar: u.avatar, netWorth: u.cash - u.debt }));
  res.json({ leaderboard: top });
});

// ---------- action routes ----------

app.post('/api/action/move', authMiddleware, (req, res) => {
  const { locationId } = req.body;
  const location = LOCATIONS.find(l => l.id === locationId);
  if (!location) return res.status(400).json({ error: 'Unknown location' });

  const user = req.user;
  user.locationId = locationId;
  db.saveUser(user);

  io.emit('player_moved', { username: user.username, locationId });
  res.json({ user: publicUser(user) });
});

app.post('/api/action/work', authMiddleware, (req, res) => {
  const { jobId } = req.body;
  const user = req.user;
  const location = LOCATIONS.find(l => l.id === user.locationId);
  const job = JOBS[jobId];

  if (!job || !location || !location.jobs.includes(jobId)) {
    return res.status(400).json({ error: 'That job is not available here' });
  }
  if (user.energy < job.energyCost) {
    return res.status(400).json({ error: 'Not enough energy. Go rest first.' });
  }

  const earned = randomPay(job.pay);
  user.energy -= job.energyCost;
  user.cash += earned;
  user.happiness = Math.max(0, user.happiness - 5);
  user.log.unshift(`Worked as a ${job.label} and earned ₦${earned}.`);
  user.log = user.log.slice(0, 20);
  db.saveUser(user);

  io.to(`loc:${user.locationId}`).emit('player_action', {
    username: user.username,
    text: `${user.username} just finished a shift as a ${job.label}.`,
  });

  res.json({ user: publicUser(user), earned });
});

app.post('/api/action/rest', authMiddleware, (req, res) => {
  const user = req.user;
  const recovered = 30;
  user.energy = Math.min(100, user.energy + recovered);
  user.log.unshift(`Rested and recovered ${recovered} energy.`);
  user.log = user.log.slice(0, 20);
  db.saveUser(user);
  res.json({ user: publicUser(user) });
});

app.post('/api/action/socialize', authMiddleware, (req, res) => {
  const user = req.user;
  const location = LOCATIONS.find(l => l.id === user.locationId);
  if (!location || location.type !== 'social') {
    return res.status(400).json({ error: 'This is not a social spot. Try Agodi Gardens, Ring Road, or Mokola.' });
  }
  const repGain = Math.floor(2 + Math.random() * 5);
  const happinessGain = Math.floor(5 + Math.random() * 10);
  user.reputation += repGain;
  user.happiness = Math.min(100, user.happiness + happinessGain);
  user.log.unshift(`Socialized at ${location.name}. +${repGain} reputation, +${happinessGain} happiness.`);
  user.log = user.log.slice(0, 20);
  db.saveUser(user);

  io.to(`loc:${user.locationId}`).emit('player_action', {
    username: user.username,
    text: `${user.username} is socializing at ${location.name}.`,
  });

  res.json({ user: publicUser(user) });
});

app.post('/api/action/pay-debt', authMiddleware, (req, res) => {
  const { amount } = req.body;
  const user = req.user;
  const pay = Math.min(user.cash, user.debt, Number(amount) || 0);
  if (pay <= 0) return res.status(400).json({ error: 'Nothing to pay' });
  user.cash -= pay;
  user.debt -= pay;
  user.log.unshift(`Paid off ₦${pay} of debt.`);
  user.log = user.log.slice(0, 20);
  db.saveUser(user);
  res.json({ user: publicUser(user) });
});

// ---------- socket.io: presence + chat per location ----------

function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.getUser(payload.username);
    if (!user) return next(new Error('User not found'));
    socket.username = user.username;
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
}

io.use(socketAuth);

function presenceInRoom(roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  return [...room]
    .map(id => io.sockets.sockets.get(id)?.username)
    .filter(Boolean);
}

io.on('connection', (socket) => {
  const user = db.getUser(socket.username);
  let currentRoom = `loc:${user.locationId}`;
  socket.join(currentRoom);
  io.to(currentRoom).emit('presence', { locationId: user.locationId, players: presenceInRoom(currentRoom) });

  socket.on('change_location', (locationId) => {
    const location = LOCATIONS.find(l => l.id === locationId);
    if (!location) return;
    socket.leave(currentRoom);
    io.to(currentRoom).emit('presence', { locationId: currentRoom.replace('loc:', ''), players: presenceInRoom(currentRoom) });

    currentRoom = `loc:${locationId}`;
    socket.join(currentRoom);
    io.to(currentRoom).emit('presence', { locationId, players: presenceInRoom(currentRoom) });
  });

  socket.on('chat', (text) => {
    if (!text || typeof text !== 'string' || !text.trim()) return;
    io.to(currentRoom).emit('chat', {
      username: socket.username,
      text: text.slice(0, 300),
      ts: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    io.to(currentRoom).emit('presence', { locationId: currentRoom.replace('loc:', ''), players: presenceInRoom(currentRoom) });
  });
});

server.listen(PORT, () => {
  console.log(`Ibadan Life running on http://localhost:${PORT}`);
});
