// ============================================
// server.js — the bridge between your phone and the second screen
// ============================================
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Lets us read JSON bodies sent via fetch() with Content-Type: application/json
app.use(express.json());

// Serves everything in /public automatically — visiting "/" returns index.html,
// "/dashboard.html" returns the dashboard, "/app.js" returns the script, etc.
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage — just one variable holding the MOST RECENT location.
// (This resets if the server restarts. Step 4 in your roadmap upgrades this
// to a real database with full history — we're keeping it simple for now.)
let latestLocation = null;

// The PHONE calls this every time it gets a new GPS reading
app.post('/api/location', (req, res) => {
  const { lat, lng, accuracy } = req.body;

  // Basic validation — don't trust data from the client blindly
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }

  latestLocation = {
    lat,
    lng,
    accuracy,
    timestamp: Date.now() // server's clock, so all viewers agree on "when"
  };

  console.log(`📍 Location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  res.status(204).end(); // 204 = "success, nothing to send back"
});

// The DASHBOARD (second screen) calls this to ask "what's the latest?"
app.get('/api/location', (req, res) => {
  if (!latestLocation) {
    // Nothing reported yet — 204 tells the dashboard "keep waiting"
    return res.status(204).end();
  }
  res.json(latestLocation);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   Phone page:     http://localhost:${PORT}/`);
  console.log(`   Dashboard page: http://localhost:${PORT}/dashboard.html`);
});