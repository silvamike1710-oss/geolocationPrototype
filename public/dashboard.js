// ============================================
// dashboard.js — shows EVERY named device on one shared map
// ============================================

const deviceListEl = document.getElementById('deviceList');
const statusEl = document.getElementById('status');

let map;

// Keyed by device name, so we can move an EXISTING marker
// instead of accidentally creating duplicate pins for the same device.
const markers = {};

// Tracks which device names we've already seen, so we only
// auto-zoom the map when a genuinely NEW device shows up —
// not on every single poll (that would fight you if you're trying to pan/zoom manually).
let knownNames = new Set();

function ensureMapExists() {
  if (map) return;
  map = L.map('map').setView([0, 0], 2); // starts zoomed out to the whole world
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
}

// Creates a marker for a device the first time we see it,
// or just slides an existing one to its new position.
function updateMarker(device) {
  const { name, lat, lng } = device;

  if (markers[name]) {
    markers[name].setLatLng([lat, lng]);
  } else {
    markers[name] = L.marker([lat, lng])
      .addTo(map)
      // permanent:true keeps the name label always visible above the pin,
      // instead of only showing on hover/tap — much easier to tell devices apart
      .bindTooltip(name, { permanent: true, direction: 'top', className: 'device-label' });
  }
}

// Basic escaping so a device name can never inject HTML into the page
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderDeviceList(devices) {
  if (devices.length === 0) {
    deviceListEl.innerHTML = '<p>No devices reporting yet.</p>';
    return;
  }

  deviceListEl.innerHTML = devices
    .map(d => `
      <p>
        <strong>${escapeHtml(d.name)}</strong>
        <button onclick="deleteDevice"('${d.name})>
        Delete
        </button> —
        ${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}
        (±${Math.round(d.accuracy)}m, last seen ${new Date(d.timestamp).toLocaleTimeString()})
      </p>
    `)
    .join('');
}

async function deleteDevice(name) {
  if (!confirm(`Delete ${name}?`)) {
    return;
  }

  await fetch(
    `/api/device/${encodeURIComponent(name)}`,
    {
      method: 'DELETE',
      headers: {
        'ngrok-skip-browser-warning': 'true'
     }
    }
  );
  checkForUpdates();
}

async function checkForUpdates() {
  try {
    const res = await fetch('/api/devices', {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    const devices = await res.json();

    ensureMapExists();
    devices.forEach(updateMarker);
    renderDeviceList(devices);

    // Only re-fit the view when a NEW device name appears for the first time
    const currentNames = new Set(devices.map(d => d.name));
    const hasNewDevice = [...currentNames].some(name => !knownNames.has(name));
    knownNames = currentNames;

    if (hasNewDevice && devices.length > 0) {
      const bounds = L.latLngBounds(devices.map(d => [d.lat, d.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }

    statusEl.textContent = devices.length > 0
      ? `✅ Live — tracking ${devices.length} device(s)`
      : '⏳ Waiting for a device to share its location...';

  } catch (err) {
    statusEl.textContent = '❌ Could not reach the server.';
  }
}

checkForUpdates();
setInterval(checkForUpdates, 3000);