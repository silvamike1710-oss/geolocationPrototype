// ============================================
// dashboard.js — tabs, device search, per-device notes, and feedback
// ============================================

// ---------- Tab switching ----------
// Every tab button has data-tab="map" / "routes" / "guide" / "feedback",
// matching the id suffix of its panel (tab-map, tab-routes, ...).
// Tab system
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        const tab = button.dataset.tab;

        // Remove active class from all buttons and panels
        tabButtons.forEach(btn => btn.classList.remove("active"));
        tabPanels.forEach(panel => panel.classList.remove("active"));

        // Activate clicked button
        button.classList.add("active");

        // Show matching panel
        document.getElementById(`tab-${tab}`).classList.add("active");
    });
});

document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

    // Leaflet doesn't redraw correctly while its container is hidden (display:none).
    // Telling it to recheck its size when the Map tab becomes visible again fixes that.
    if (btn.dataset.tab === 'map' && map) {
      map.invalidateSize();
    }
  });
});

// ---------- Map tab ----------
const deviceListEl = document.getElementById('deviceList');
const statusEl = document.getElementById('status');
const searchInput = document.getElementById('deviceSearch');

let map;
const markers = {};       // device name -> Leaflet marker
let knownNames = new Set(); // used to only auto-zoom when a NEW device appears
let searchTerm = '';

searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  // Re-render immediately on typing instead of waiting for the next poll
  renderDeviceList(lastDevices.filter(passesFilter));
  lastDevices.forEach(d => setMarkerVisibility(d, passesFilter(d)));
});

function passesFilter(device) {
  if (!searchTerm) return true;
  return device.name.toLowerCase().includes(searchTerm);
}

function ensureMapExists() {
  if (map) return;
  map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
}

// Creates a marker the first time we see a device, otherwise just moves it
function updateMarkerPosition(device) {
  const { name, lat, lng } = device;
  if (markers[name]) {
    markers[name].setLatLng([lat, lng]);
  } else {
    markers[name] = L.marker([lat, lng])
      .bindTooltip(name, { permanent: true, direction: 'top', className: 'device-label' });
  }
}

// Shows/hides a device's marker on the map based on whether it matches the search
function setMarkerVisibility(device, visible) {
  const marker = markers[device.name];
  if (!marker) return;
  const onMap = map.hasLayer(marker);
  if (visible && !onMap) marker.addTo(map);
  if (!visible && onMap) map.removeLayer(marker);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderDeviceList(devices) {
  if (devices.length === 0) {
    deviceListEl.innerHTML = '<p>No matching devices.</p>';
    return;
  }

  deviceListEl.innerHTML = devices.map(d => `
    <div class="device-item" data-name="${d.name}">
      <strong>${escapeHtml(d.name)}</strong><br>
      ${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}<br>
      (±${Math.round(d.accuracy)}m)
      <div class="distance"></div>
    </div>
  `).join('');

  document.querySelectorAll('.device-item').forEach(el => {
    el.addEventListener('click', async () => {
      if (!myLocation) {
        alert('Waiting for your location...');
        return;
      }

      const name = el.dataset.name;

      const res = await fetch(
        `/api/distance?name=${encodeURIComponent(name)}&lat=${myLocation.lat}&lng=${myLocation.lng}`
      );

      const data = await res.json();

      el.querySelector('.distance').textContent =
        `📏 ${data.distanceMeters}m away (${data.distanceKm} km)`;
    });
  });
}

let lastDevices = []; // remembered so the search box can re-filter without waiting on the server

async function checkForUpdates() {
  try {
    const res = await fetch('/api/devices', { headers: { 'ngrok-skip-browser-warning': 'true' } });
    const devices = await res.json();
    lastDevices = devices;

    ensureMapExists();

    devices.forEach(d => {
      updateMarkerPosition(d);
      setMarkerVisibility(d, passesFilter(d));
    });

    renderDeviceList(devices.filter(passesFilter));
    renderRoutesPanel(devices);

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

// ---------- Routes tab ----------
const routesListEl = document.getElementById('routesList');

// Devices we've already built a notes block for — we never rebuild an existing
// block, so typing in a textarea is never interrupted by the next 3-second poll.
const routesRendered = new Set();

function renderRoutesPanel(devices) {
  devices.forEach(device => {
    if (routesRendered.has(device.name)) return;
    routesRendered.add(device.name);

    document.getElementById('routesEmpty')?.remove();

    const block = document.createElement('div');
    block.className = 'route-block';
    block.innerHTML = `
      <p><strong>${escapeHtml(device.name)}</strong></p>
      <textarea class="win95-input route-textarea" rows="3" placeholder="Notes about this device's route...">${escapeHtml(device.notes || '')}</textarea>
      <button class="win95-button route-save">💾 Save</button>
      <p class="route-saved-msg">Saved!</p>
    `;

    const textarea = block.querySelector('.route-textarea');
    const saveBtn = block.querySelector('.route-save');
    const savedMsg = block.querySelector('.route-saved-msg');

    saveBtn.addEventListener('click', async () => {
      try {
        await fetch(`/api/devices/${encodeURIComponent(device.name)}/notes`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ notes: textarea.value })
        });
        savedMsg.classList.add('visible');
        setTimeout(() => savedMsg.classList.remove('visible'), 2000);
      } catch (err) {
        alert('Could not save notes — check the server connection.');
      }
    });

    routesListEl.appendChild(block);
  });
}

// ---------- Feedback tab ----------
const feedbackText = document.getElementById('feedbackText');
const feedbackSubmit = document.getElementById('feedbackSubmit');
const feedbackStatus = document.getElementById('feedbackStatus');

feedbackSubmit.addEventListener('click', async () => {
  const text = feedbackText.value.trim();
  if (!text) {
    feedbackStatus.textContent = '⚠️ Write something before sending.';
    return;
  }

  try {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ text })
    });
    feedbackText.value = '';
    feedbackStatus.textContent = '✅ Thanks — feedback sent!';
  } catch (err) {
    feedbackStatus.textContent = '❌ Could not reach the server.';
  }
});
let myLocation = null;

navigator.geolocation.getCurrentPosition((pos) => {
  myLocation = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude
  };
});

// ---------- Start polling ----------
checkForUpdates();
setInterval(checkForUpdates, 3000);