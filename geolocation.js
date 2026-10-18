// BRIEFING: Start with a global view of the operations area.
const map = L.map("map").setView([0, 0], 2);
const status = document.getElementById("status");

// DEPLOY TERRAIN: Load the OpenStreetMap tiles.
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(map);

// INTEL CHECK: Missing data is unknown. Zero is a valid reading.
const show = (value, unit) =>
  value == null ? "Not available" : `${value} ${unit}`;

document.getElementById("locate").onclick = () => {
  // COMMS CHECK: Confirm the browser can report its position.
  if (!navigator.geolocation) {
    status.textContent = "Geolocation is not supported.";
    return;
  }
  status.textContent = "Recon underway. Acquiring position…";

  navigator.geolocation.getCurrentPosition(position => {
    const c = position.coords;
    const location = [c.latitude, c.longitude];

    // POSITION CONFIRMED: Zoom in on our coordinates.
    map.setView(location, 16);

    // SITREP: Mark the position and attach the full report.
    L.marker(location).addTo(map).bindPopup(`
      <b>Position report</b><br>
      Longitude: ${c.longitude.toFixed(7)}°<br>
      Latitude: ${c.latitude.toFixed(7)}°<br>
      Accuracy: ${show(c.accuracy, "meters")}<br>
      Time: ${new Date(position.timestamp).toLocaleString()}<br>
      Altitude: ${show(c.altitude, "meters")}<br>
      Altitude accuracy: ${show(c.altitudeAccuracy, "meters")}<br>
      Heading: ${show(c.heading, "°")}<br>
      Speed: ${show(c.speed, "m/s")}
    `).openPopup();

    status.textContent = "Position confirmed. Marker deployed.";
  }, error => {
    // COMMS FAILURE: Report why the location request failed.
    status.textContent = `Recon failed: ${error.message}`;
  }, {
    enableHighAccuracy: true, // Request the best available fix.
    maximumAge: 0,           // Fresh intel only.
    timeout: 45000           // Abort the request after 45 seconds.
  });
};
