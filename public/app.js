const API = '';
let token = localStorage.getItem('ibadanlife_token') || null;
let me = null;
let world = { locations: [], jobs: {} };
let socket = null;

const $ = (sel) => document.querySelector(sel);

// ---------- auth screen wiring ----------

$('#tab-login').onclick = () => switchTab('login');
$('#tab-register').onclick = () => switchTab('register');

function switchTab(which) {
  $('#tab-login').classList.toggle('active', which === 'login');
  $('#tab-register').classList.toggle('active', which === 'register');
  $('#login-form').classList.toggle('hidden', which !== 'login');
  $('#register-form').classList.toggle('hidden', which !== 'register');
  $('#auth-error').textContent = '';
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#login-username').value.trim();
  const password = $('#login-password').value;
  await authRequest('/api/login', { username, password });
});

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#reg-username').value.trim();
  const password = $('#reg-password').value;
  const profile = document.querySelector('input[name="profile"]:checked').value;
  await authRequest('/api/register', { username, password, profile, avatar: '🙂' });
});

async function authRequest(url, body) {
  $('#auth-error').textContent = '';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    token = data.token;
    localStorage.setItem('ibadanlife_token', token);
    me = data.user;
    await enterGame();
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
}

// ---------- API helper ----------

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------- boot ----------

(async function boot() {
  if (!token) return;
  try {
    const data = await api('/api/me');
    me = data.user;
    await enterGame();
  } catch (e) {
    localStorage.removeItem('ibadanlife_token');
    token = null;
  }
})();

// ---------- entering the game ----------

async function enterGame() {
  $('#auth-screen').classList.add('hidden');
  $('#game-screen').classList.remove('hidden');

  const w = await api('/api/world');
  world = w;

  renderLocations();
  renderStats();
  renderCurrentLocation();
  renderActivityLog();
  await refreshLeaderboard();

  connectSocket();
}

$('#logout-btn').onclick = () => {
  localStorage.removeItem('ibadanlife_token');
  location.reload();
};

// ---------- rendering ----------

function renderStats() {
  $('#player-avatar').textContent = me.avatar;
  $('#player-name').textContent = me.username;
  $('#stat-cash').textContent = me.cash.toLocaleString();
  $('#stat-debt').textContent = me.debt.toLocaleString();
  $('#stat-energy').textContent = me.energy;
  $('#stat-happiness').textContent = me.happiness;
  $('#stat-reputation').textContent = me.reputation;
  $('#debt-row').classList.toggle('hidden', me.debt <= 0);
}

function renderLocations() {
  const list = $('#locations-list');
  list.innerHTML = '';
  world.locations.forEach((loc) => {
    const btn = document.createElement('button');
    btn.className = 'location-btn' + (loc.id === me.locationId ? ' active' : '');
    btn.textContent = loc.name;
    btn.onclick = () => moveTo(loc.id);
    list.appendChild(btn);
  });
}

function renderCurrentLocation() {
  const loc = world.locations.find((l) => l.id === me.locationId);
  if (!loc) return;
  $('#current-location-name').textContent = loc.name;
  $('#current-location-desc').textContent = loc.description;

  const jobsList = $('#jobs-list');
  jobsList.innerHTML = '';
  loc.jobs.forEach((jobId) => {
    const job = world.jobs[jobId];
    if (!job) return;
    const btn = document.createElement('button');
    btn.className = 'job-btn';
    btn.innerHTML = `<span>${job.label}</span><span>⚡${job.energyCost} · ₦${job.pay[0]}–${job.pay[1]}</span>`;
    btn.onclick = () => doWork(jobId);
    jobsList.appendChild(btn);
  });

  $('#socialize-btn').disabled = loc.type !== 'social';
}

function renderActivityLog() {
  const ul = $('#activity-log');
  ul.innerHTML = '';
  (me.log || []).forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry;
    ul.appendChild(li);
  });
}

async function refreshLeaderboard() {
  const { leaderboard } = await api('/api/leaderboard');
  const ol = $('#leaderboard-list');
  ol.innerHTML = '';
  leaderboard.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.avatar} ${p.username} — ₦${p.netWorth.toLocaleString()}`;
    ol.appendChild(li);
  });
}

// ---------- actions ----------

async function moveTo(locationId) {
  try {
    const { user } = await api('/api/action/move', {
      method: 'POST',
      body: JSON.stringify({ locationId }),
    });
    me = user;
    renderLocations();
    renderCurrentLocation();
    socket.emit('change_location', locationId);
  } catch (e) { alert(e.message); }
}

async function doWork(jobId) {
  try {
    const { user, earned } = await api('/api/action/work', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });
    me = user;
    renderStats();
    renderActivityLog();
    refreshLeaderboard();
  } catch (e) { alert(e.message); }
}

$('#rest-btn').onclick = async () => {
  const { user } = await api('/api/action/rest', { method: 'POST' });
  me = user;
  renderStats();
  renderActivityLog();
};

$('#socialize-btn').onclick = async () => {
  try {
    const { user } = await api('/api/action/socialize', { method: 'POST' });
    me = user;
    renderStats();
    renderActivityLog();
  } catch (e) { alert(e.message); }
};

$('#pay-debt-btn').onclick = async () => {
  const amount = Number($('#debt-amount').value);
  try {
    const { user } = await api('/api/action/pay-debt', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    me = user;
    renderStats();
    renderActivityLog();
    $('#debt-amount').value = '';
  } catch (e) { alert(e.message); }
};

// ---------- real-time ----------

function connectSocket() {
  socket = io({ auth: { token } });

  socket.on('presence', ({ locationId, players }) => {
    if (locationId !== me.locationId) return;
    const ul = $('#presence-list');
    ul.innerHTML = '';
    players.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name === me.username ? `${name} (you)` : name;
      ul.appendChild(li);
    });
  });

  socket.on('chat', ({ username, text }) => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${username}:</strong> ${escapeHtml(text)}`;
    $('#chat-log').appendChild(div);
    $('#chat-log').scrollTop = $('#chat-log').scrollHeight;
  });

  socket.on('player_action', ({ text }) => {
    const div = document.createElement('div');
    div.style.color = '#6b6558';
    div.style.fontStyle = 'italic';
    div.textContent = text;
    $('#chat-log').appendChild(div);
    $('#chat-log').scrollTop = $('#chat-log').scrollHeight;
  });
}

$('#chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#chat-input');
  if (!input.value.trim()) return;
  socket.emit('chat', input.value.trim());
  input.value = '';
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
