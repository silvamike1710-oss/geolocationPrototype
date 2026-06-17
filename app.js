const startBtn = document.getElementById('startBtn');
const latEl = document.getElementById('lat');
const lngEl = document.getElementById('lng');
const accEl = document.getElementById('acc');
const statusEl = document.getElementById('status');

function getLocation() {
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

    statusEl.textContent = 'Location found!';
}

function updateMap(lat, lng) {
    if (!map) {
        map = L.map('map').setView([lat, lng], 16);

        L.titleLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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