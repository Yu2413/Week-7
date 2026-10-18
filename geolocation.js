'use strict';

const ui = Object.fromEntries(['start', 'stop', 'clear', 'follow', 'status',
  'latitude', 'longitude', 'accuracy', 'count', 'updated'].map(id => [id, document.getElementById(id)]));
const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 45000 };
let map, markers, accuracyCircle;
let watchId = null;
let generation = 0; // Ignore callbacks queued before Stop or a new session.
let pointCount = 0;
let firstReading = true;

function setStatus(message, error = false) {
  ui.status.textContent = message;
  ui.status.dataset.error = String(error);
}

// Null is different from zero: altitude, speed and heading can validly be zero.
function format(value, digits, unit) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${unit}` : 'Not available';
}

function popupFor(position, number) {
  const c = position.coords;
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = `Location ${number}`;
  content.append(title);
  const list = document.createElement('dl');
  list.className = 'popup-details';
  const fields = [
    ['Longitude', format(c.longitude, 7, '°')],
    ['Latitude', format(c.latitude, 7, '°')],
    ['Accuracy', format(c.accuracy, 2, ' meters')],
    ['Time', new Date(position.timestamp).toLocaleString()],
    ['Altitude', format(c.altitude, 2, ' meters')],
    ['Altitude accuracy', format(c.altitudeAccuracy, 2, ' meters')],
    ['Heading', format(c.heading, 2, '°')],
    ['Speed', format(c.speed, 2, ' m/s')]
  ];
  for (const [name, value] of fields) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = name;
    detail.textContent = value;
    list.append(term, detail);
  }
  content.append(list);
  return content;
}

function successCallback(position) {
  const c = position.coords;
  const latlng = [c.latitude, c.longitude];
  pointCount += 1;
  const marker = L.marker(latlng, { title: `Location ${pointCount}` })
    .addTo(markers).bindPopup(popupFor(position, pointCount), { maxHeight: 330 });
  if (accuracyCircle) map.removeLayer(accuracyCircle);
  accuracyCircle = L.circle(latlng, { radius: c.accuracy, color: '#245f4d',
    fillOpacity: 0.12, weight: 1, interactive: false }).addTo(map);

  // Zoom to a close-up on the first fix; retain the user's zoom thereafter.
  if (firstReading) {
    map.setView(latlng, 16);
    marker.openPopup();
    firstReading = false;
  } else if (ui.follow.checked) {
    map.panTo(latlng);
  }
  ui.latitude.textContent = format(c.latitude, 7, '°');
  ui.longitude.textContent = format(c.longitude, 7, '°');
  ui.accuracy.textContent = format(c.accuracy, 2, ' m');
  ui.count.textContent = String(pointCount);
  ui.updated.textContent = new Date(position.timestamp).toLocaleString();
  setStatus('Tracking is active. Select a marker for all location details.');
}

function stopTracking() {
  generation += 1;
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  ui.start.disabled = false;
  ui.stop.disabled = true;
}

function errorCallback(error) {
  const messages = {
    1: 'Location permission denied. Allow location access in your browser’s site settings, then try again.',
    2: 'Location unavailable. Check your device’s location settings and try again.',
    3: 'Location request timed out after 45 seconds. Try again with a better signal.'
  };
  stopTracking();
  setStatus(messages[error.code] || 'An unknown location error occurred. Please try again.', true);
}

ui.start.addEventListener('click', () => {
  if (watchId !== null) return;
  if (!window.isSecureContext) {
    setStatus('Location requires HTTPS or localhost. Open the published HTTPS site.', true);
    return;
  }
  if (!navigator.geolocation) {
    setStatus('This browser does not support geolocation.', true);
    return;
  }
  firstReading = true;
  ui.start.disabled = true;
  ui.stop.disabled = false;
  setStatus('Finding your location… Allow access if your browser asks.');
  const session = ++generation;
  try {
    watchId = navigator.geolocation.watchPosition(
      position => { if (session === generation) successCallback(position); },
      error => { if (session === generation) errorCallback(error); }, options);
  } catch (error) {
    errorCallback(error);
  }
});

ui.stop.addEventListener('click', () => {
  stopTracking();
  setStatus('Tracking stopped. Your recorded points remain on the map.');
});

ui.clear.addEventListener('click', () => {
  stopTracking();
  markers.clearLayers();
  if (accuracyCircle) map.removeLayer(accuracyCircle);
  accuracyCircle = null;
  pointCount = 0;
  firstReading = true;
  for (const key of ['latitude', 'longitude', 'accuracy', 'updated']) ui[key].textContent = '—';
  ui.count.textContent = '0';
  map.setView([20, 0], 2);
  setStatus('Points cleared and tracking stopped. Start again whenever you’re ready.');
});

window.addEventListener('pagehide', stopTracking);

if (typeof L === 'undefined') {
  ui.start.disabled = true;
  ui.clear.disabled = true;
  setStatus('The map library could not load. Check your internet connection and reload.', true);
} else {
  map = L.map('map').setView([20, 0], 2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map).on('tileerror', () => {
    setStatus('Some map tiles could not load. Check your connection; location markers can still be recorded.', true);
  });
  markers = L.layerGroup().addTo(map);
}

