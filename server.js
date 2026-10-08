require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// ===================== MongoDB Connection =====================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing! Set it in Render Environment or .env file.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch(err => console.error('❌ DB Connection Error:', err));

// ===================== Schemas =====================

// User (Account)
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  photo: { type: String, default: '' },
  status: { type: String, default: 'menu' },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Online (Live Players)
const onlineSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  photo: { type: String, default: '' },
  status: { type: String, default: 'menu' },
  updatedAt: { type: Date, default: Date.now }
});

// Score (Leaderboard)
const scoreSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  photo: { type: String, default: '' },
  best: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Online = mongoose.model('Online', onlineSchema);
const Score = mongoose.model('Score', scoreSchema);

// ===================== API Routes =====================

// ---- Login / Create Account ----
app.post('/api/login', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    // email থেকে uid বানাও (consistent)
    const uid = 'u_' + Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);

    const user = await User.findOneAndUpdate(
      { uid },
      { uid, name, email, photo: '', lastSeen: new Date(), status: 'menu' },
      { upsert: true, new: true }
    );

    res.json({ ok: true, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Online (Heartbeat) ----
app.post('/api/online', async (req, res) => {
  try {
    const { uid, name, email, photo, status } = req.body;
    if (!uid) return res.status(400).json({ error: 'No uid' });

    await Online.findOneAndUpdate(
      { uid },
      { uid, name, email, photo: photo || '', status, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ---- Offline (Logout) ----
app.post('/api/offline', async (req, res) => {
  try {
    const { uid } = req.body;
    if (uid) await Online.deleteOne({ uid });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ---- Live Players (last 30 sec) ----
app.get('/api/live', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 1000);
    const list = await Online.find({ updatedAt: { $gte: cutoff } }).sort({ updatedAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ---- Save Score ----
app.post('/api/score', async (req, res) => {
  try {
    const { uid, name, email, photo, best } = req.body;
    if (!uid || best === undefined) return res.status(400).json({ error: 'Missing data' });

    const existing = await Score.findOne({ uid });
    if (!existing || best > existing.best) {
      await Score.findOneAndUpdate(
        { uid },
        { uid, name, email, photo: photo || '', best, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ---- Leaderboard (top 20) ----
app.get('/api/leaderboard', async (req, res) => {
  try {
    const list = await Score.find().sort({ best: -1 }).limit(20);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ---- Serve index.html ----
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ===================== Server =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
