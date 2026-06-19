// ============================================
// server.js — the bridge between your phones/tablets and the dashboard
// ============================================
const express = require('express');
const path = require('path');

const fs = require('fs');

const DEVICE_FILE = 'devices.json';

const app = express();

// Render (and most hosts) assign their own port via this environment variable.
// process.env.PORT will be undefined when running locally, so it falls back to 3000.
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage: one entry PER DEVICE NAME.
// Example shape once a few devices have reported in:
// {
//   "Phone 1":  { lat: -29.68, lng: -53.80, accuracy: 8,  timestamp: 1718... },
//   "Tablet 1": { lat: -29.70, lng: -53.81, accuracy: 12, timestamp: 1718... }
// }
let devices = {};
if (fs.existsSync(DEVICE_FILE)) {
  devices = JSON.parse(fs.readFileSync(DEVICE_FILE, 'utf8'));
}

// A device calls this every time it gets a new GPS reading
app.post('/api/location', (req, res) => {
  const { name, lat, lng, accuracy } = req.body;

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }

  const cleanName = name.trim().slice(0, 40); // keep names reasonably short

  devices[cleanName] = {
    lat,
    lng,
    accuracy,
    timestamp: Date.now() // server's clock, so every viewer agrees on "when"
  };
  saveDevices();

  console.log(`📍 ${cleanName}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  res.status(204).end();
});

app.delete('/api/device/:name', (req, res) => {
  const name = req.params.name;

  if (!devices[name]) {
    return res.status(404).json({
      error: 'Device not found'
    });
  }
  
  delete devices[name];

  saveDevices();

  res.status(204).end();
});

// The dashboard calls this to get EVERY known device's latest location
app.get('/api/devices', (req, res) => {
  // Turn { "Phone 1": {...}, "Tablet 1": {...} } into
  // [ { name: "Phone 1", lat: ..., lng: ... }, { name: "Tablet 1", ... } ]
  // — an array is easier for the dashboard to loop over than an object.
  const list = Object.entries(devices).map(([name, data]) => ({ name, ...data }));
  res.json(list);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

function saveDevices() {
  fs.writeFileSync(
    DEVICE_FILE,
    JSON.stringify(devices, null, 2)
  );
}