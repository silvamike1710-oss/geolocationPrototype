# 📍 GPS Tracker

A real-time geolocation tracking web app with a retro **Windows 95** styled interface. Tracks live position, plots it on an interactive map, and calculates distance traveled.

🔗 **Live Demo:** [geolocationprototype.onrender.com](https://geolocationprototype.onrender.com/)

---

## 🖥️ About

This project lets users track their real-time location on an interactive map, all wrapped in a nostalgic Win95-style UI — pixelated buttons, classic window chrome, and that unmistakable retro feel.

Built as a hands-on way to dive deeper into geolocation APIs, real-time data handling, and database persistence with MongoDB Atlas.

---

## ✨ Features

- 📡 Real-time GPS position tracking
- 🗺️ Interactive map display with live location markers
- 📏 Distance traveled calculation
- 💾 Persistent location history via MongoDB Atlas
- 🪟 Retro Windows 95-themed interface

---

## 🛠️ Built With

- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas
- **Frontend:** HTML, CSS, JavaScript
- **Mapping:** Leaflet.js
- **Deployment:** Render

---

## ⚙️ How It Works

1. The browser's Geolocation API captures the user's current position
2. Coordinates are sent to the Express backend and stored in MongoDB Atlas
3. Leaflet.js renders the position on an interactive map in real time
4. Distance traveled is calculated and displayed as new coordinates come in

---

## 🚧 Challenges Solved

- MongoDB Atlas connection setup, including TLS configuration and IP allowlisting
- Fixed a UI polling bug that was wiping the distance display on re-render

---

## 🚀 Getting Started

```bash
git clone <your-repo-url>
cd geolocation-tracker
npm install
npm start
```

Create a `.env` file with your MongoDB Atlas connection string:

```
MONGODB_URI=your_connection_string_here
```

---

## 📫 Contact

Built by Michael — feel free to reach out if you have questions or feedback!
