// ============================================
// server.js — now backed by MongoDB Atlas instead of memory
// ============================================

// dotenv reads a local .env file and copies its values into process.env —
// this is how MONGODB_URI gets in locally without hardcoding it into the code.
// (On Render, you set the same variable in their dashboard instead of a .env file.)
require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Connect to MongoDB ----------
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI. Add it to a local .env file, or to Render\'s Environment settings.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ Could not connect to MongoDB:', err.message);
    process.exit(1);
  });

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB, database:', mongoose.connection.name))
  .catch(err => console.error('❌ MongoDB connection error:', err))

// ---------- Schemas ----------
// A schema is just a description of what fields a document has and what type they are.
// "unique: true" on name means MongoDB itself will reject a second device with the same name.
const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  lat: Number,
  lng: Number,
  accuracy: Number,
  timestamp: Number,
  notes: { type: String, default: '' }
});
const Device = mongoose.model('Device', deviceSchema);

const feedbackSchema = new mongoose.Schema({
  text: String,
  timestamp: Number
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

//----------- Helper Function --------------------

function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;

  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;

  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
// ---------- Device location endpoints ----------
app.post('/api/location', async (req, res) => {
  const { name, lat, lng, accuracy } = req.body;

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }

  const cleanName = name.trim().slice(0, 40);

  try {
    // upsert: true means "update it if it exists, create it if it doesn't" —
    // one line handles both a brand new device AND a returning one.
    // Using $set explicitly (instead of a plain object) guarantees we ONLY touch
    // these fields, so any saved "notes" for this device are never overwritten.
    await Device.findOneAndUpdate(
      { name: cleanName },
      { $set: { name: cleanName, lat, lng, accuracy, timestamp: Date.now() } },
      { upsert: true }
    );

    console.log(`📍 ${cleanName}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    res.status(204).end();
  } catch (err) {
    console.error('Error saving location:', err);
    res.status(500).json({ error: 'database error' });
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    const devices = await Device.find().lean(); // .lean() returns plain JS objects, faster than full Mongoose documents
    // Mongo adds its own _id and __v fields — strip them, the frontend doesn't need them
    const cleaned = devices.map(({ _id, __v, ...rest }) => rest);
    res.json(cleaned);
  } catch (err) {
    console.error('Error fetching devices:', err);
    res.status(500).json({ error: 'database error' });
  }
});

// Saves/updates the free-text notes for one device (used by the Routes tab)
app.put('/api/devices/:name/notes', async (req, res) => {
  const { name } = req.params; // Express automatically URL-decodes this
  const { notes } = req.body;

  if (typeof notes !== 'string') {
    return res.status(400).json({ error: 'notes must be a string' });
  }

  try {
    const updated = await Device.findOneAndUpdate(
      { name },
      { $set: { notes: notes.slice(0, 2000) } }
    );
    if (!updated) {
      return res.status(404).json({ error: 'unknown device' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Error saving notes:', err);
    res.status(500).json({ error: 'database error' });
  }
});

// ---------- Feedback endpoints ----------
app.post('/api/feedback', async (req, res) => {
  const { text } = req.body;

  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    await Feedback.create({ text: text.trim().slice(0, 2000), timestamp: Date.now() });
    console.log(`💬 Feedback received: ${text.trim().slice(0, 80)}`);
    res.status(204).end();
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'database error' });
  }
});

// Lets you peek at collected feedback by visiting this URL in a browser
app.get('/api/feedback', async (req, res) => {
  try {
    const all = await Feedback.find().lean();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'database error' });
  }
});



app.get('/api/distance', async (req, res) => {
  const { name, lat, lng } = req.query;

  if (!name || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'name, lat, lng required' });
  }

  try {
    const device = await Device.findOne({ name }).lean();

    if (!device) {
      return res.status(404).json({ error: 'device not found' });
    }

const userLat = parseFloat(lat);
const userLng = parseFloat(lng);

if (isNaN(userLat) || isNaN(userLng)) {
  return res.status(400).json({ error: 'invalid coordinates' });
}

const distance = getDistanceMeters(
  userLat,
  userLng,
  device.lat,
  device.lng
);

    res.json({
      name,
      distanceMeters: Math.round(distance),
      distanceKm: +(distance / 1000).toFixed(2)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error'});
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});