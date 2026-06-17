const startBtn = document.getElementById('startBtn');
const deviceNameInput = document.getElementById('deviceName');
const latEl = document.getElementById('lat');
const lngEl = document.getElementById('lng');
const accEl = document.getElementById('acc');
const statusEl = document.getElementById('status');

// These stay undefined until the first location comes in.
// We only want to CREATE the map once, then just move the marker after that.
let map;
let marker;

// localStorage saves data in the browser itself, even after closing the tab —
// so this ONE phone remembers "I'm Phone 1" without you retyping it every time.
deviceNameInput.value = localStorage.getItem('deviceName') || '';

function getLocation() {
    const deviceName = deviceNameInput.value.trim();

    if (!deviceName) {
        statusEl.textContent = '⚠️ Please enter a device name first.';
        return;
    }

    // Remember this name for next time
    localStorage.setItem('deviceName', deviceName);

    if (!navigator.geolocation) {
        statusEl.textContent = 'Geolocation is not supported on this device.';
        return;
    }

    statusEl.textContent = 'Requesting location... tap "allow" on the popup.';

    navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function onSuccess(position) {
    const {latitude, longitude, accuracy} = position.coords;

    latEl.textContent = latitude.toFixed(4);
    lngEl.textContent = longitude.toFixed(4);
    accEl.textContent = Math.round(accuracy);

    updateMap(latitude, longitude);
    postLocation(latitude, longitude, accuracy); // <-- NEW: tell the server about this update

    statusEl.textContent = 'Location found!';
}

// Sends our location to the server so OTHER devices (the dashboard) can see it too.
// "fetch" is the browser's built-in function for making network requests.
async function postLocation(lat, lng, accuracy) {
    try {
        const res = await fetch('/api/location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true' // tells ngrok's free tier to skip its warning page
            },
            body: JSON.stringify({ name: deviceNameInput.value.trim(), lat, lng, accuracy })
        });

        // Surface problems instead of failing silently
        if (!res.ok) {
            console.warn('Server rejected the location:', res.status);
        }
    } catch (err) {
        // If this fails, the map on THIS phone still works fine —
        // it just means the dashboard won't get the update.
        console.error('Could not reach server:', err);
    }
}

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

function onError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            statusEl.textContent = 'The location access has been denied.';
            break;
        case error.POSITION_UNAVAILABLE:
            statusEl.textContent = 'Location info is unavailable right now.';
            break;
        case error.TIMEOUT:
            statusEl.textContent = 'Request timed out. Try again outdoors or near a window.';
            break;
        default:
            statusEl.textContent = 'Unknown error while getting location.';
    }
}

startBtn.addEventListener('click', getLocation);