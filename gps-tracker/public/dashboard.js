// ============================================
// dashboard.js — the "second screen" logic
// Polls the server every few seconds and asks "what's the latest location?"
// ============================================

const latEl = document.getElementById('lat');
const lngEl = document.getElementById('lng');
const accEl = document.getElementById('acc');
const lastSeenEl = document.getElementById('lastSeen');
const statusEl = document.getElementById('status');

let map;
let marker;

// Same map-creation logic from the phone page — create once, then just move it
function updateMap(lat, lng) {
  if (!map) {
    map = L.map('map').setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    marker = L.marker([lat, lng]).addTo(map);
  } else {
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng]);
  }
}

// Ask the server for the latest reported location
async function checkForUpdate() {
  try {
    const res = await fetch('/api/location');

    // 204 means "no location reported yet" — nothing to do
    if (res.status === 204) {
      statusEl.textContent = '⏳ Waiting for the phone to share a location...';
      return;
    }

    const data = await res.json();

    latEl.textContent = data.lat.toFixed(4);
    lngEl.textContent = data.lng.toFixed(4);
    accEl.textContent = Math.round(data.accuracy);
    lastSeenEl.textContent = new Date(data.timestamp).toLocaleTimeString();

    updateMap(data.lat, data.lng);

    statusEl.textContent = '✅ Live';
  } catch (err) {
    statusEl.textContent = '❌ Could not reach the server.';
  }
}

// Check immediately on load, then keep checking every 3 seconds
checkForUpdate();
setInterval(checkForUpdate, 3000);