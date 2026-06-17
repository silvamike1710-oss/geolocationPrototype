// ============================================
// GPS Tracker — Step 1: show current location
// ============================================

// Grab references to all the HTML elements we need to read/update.
// (Doing this once at the top, instead of re-querying every time, is good practice.)
const startBtn = document.getElementById('startBtn');
const latEl = document.getElementById('lat');
const lngEl = document.getElementById('lng');
const accEl = document.getElementById('acc');
const statusEl = document.getElementById('status');

// These stay "undefined" until we get our first location.
// We only want to CREATE the map once — after that we just MOVE the existing marker.
let map;
let marker;

// This runs when the user taps "Start GPS"
function getLocation() {
  // Not every browser/device supports this API — always check first.
  if (!navigator.geolocation) {
    statusEl.textContent = '❌ Geolocation is not supported on this device.';
    return;
  }

  statusEl.textContent = '⏳ Requesting location... tap "Allow" on the popup.';

  // getCurrentPosition(success, error, options)
  navigator.geolocation.getCurrentPosition(
    onSuccess,
    onError,
    {
      enableHighAccuracy: true, // true = use the GPS chip, not just wifi/cell towers (more accurate, a bit slower)
      timeout: 10000,           // give up and call onError after 10 seconds
      maximumAge: 0             // don't reuse a cached old position — always get a fresh one
    }
  );
}

// This runs ONLY if the browser successfully got a location
function onSuccess(position) {
  // position.coords is where the actual numbers live
  const { latitude, longitude, accuracy } = position.coords;

  // .toFixed(4) trims the decimals so it's readable (still ~11 meters of precision)
  latEl.textContent = latitude.toFixed(4);
  lngEl.textContent = longitude.toFixed(4);
  accEl.textContent = Math.round(accuracy);

  updateMap(latitude, longitude);

  statusEl.textContent = '✅ Location found!';
}

// Creates the map the first time, then just moves the marker on every call after that
function updateMap(lat, lng) {
  if (!map) {
    // L.map('map') tells Leaflet "draw inside the element with id='map'"
    // setView([lat, lng], zoomLevel) — zoom 16 is roughly "street level"
    map = L.map('map').setView([lat, lng], 16);

    // The tile layer is what actually paints the map images.
    // This URL pattern pulls free tiles from OpenStreetMap's servers.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Drop our first marker
    marker = L.marker([lat, lng]).addTo(map);
  } else {
    // Map already exists — just slide the marker and re-center
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng]);
  }
}

// This runs if something went wrong (denied permission, timed out, etc.)
function onError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      statusEl.textContent = '❌ You denied location access. Check your browser site settings.';
      break;
    case error.POSITION_UNAVAILABLE:
      statusEl.textContent = '❌ Location info is unavailable right now.';
      break;
    case error.TIMEOUT:
      statusEl.textContent = '❌ Request timed out. Try again outdoors / near a window.';
      break;
    default:
      statusEl.textContent = '❌ Unknown error getting location.';
  }
}

// Connect the button click to our function
startBtn.addEventListener('click', getLocation);