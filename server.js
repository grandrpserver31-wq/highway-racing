const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://highwayracing:HighwayAdmin123456780@cluster0.rstum6r.mongodb.net/highway_racing?appName=Cluster0";



mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => console.error('DB Connection Error:', err));

// Score Schema
const scoreSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  score: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', scoreSchema);

// Save Score Endpoint
app.post('/api/scores', async (req, res) => {
  try {
    const { playerName, score } = req.body;
    const newScore = new Score({ playerName, score });
    await newScore.save();
    res.status(201).json({ message: 'Score saved!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// Get Leaderboard Endpoint
app.get('/api/scores', async (req, res) => {
  try {
    const topScores = await Score.find().sort({ score: -1 }).limit(10);
    res.json(topScores);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
