import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketIO } from "socket.io";
import http from "http";

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: "*",
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static
app.use(express.static(path.join(__dirname, "../dist")));

// ====================== STORAGE DATI ======================
let sensorDataHistory = []; // array in memoria

// ====================== SOCKET.IO ======================
io.on("connection", (socket) => {
  console.log("Nuovo client connesso:", socket.id);

  socket.on("ping", (data) => {
    socket.emit("pong", { msg: "Pong dal server!" });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnesso:", socket.id);
  });
});

// ====================== API ======================

// Endpoint per ricevere dati dal nodo ESP32
app.post("/data", (req, res) => {
  const { node, pm25, pm10, lat, lon, timestamp } = req.body;

  if (!node || pm25 === undefined || pm10 === undefined || !lat || !lon) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  const entry = { node, pm25, pm10, lat, lon, timestamp: timestamp || Date.now() };
  sensorDataHistory.push(entry);

  // Limita la memoria a 1000 campioni
  if (sensorDataHistory.length > 1000) sensorDataHistory.shift();

  console.log("Dati ricevuti:", entry);

  // Invia dati ai client connessi via socket
  io.emit("new-data", entry);

  res.json({ status: "OK" });
});

// Endpoint per leggere lo storico
app.get("/data", (req, res) => {
  res.json(sensorDataHistory);
});

// Test endpoint
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello dal backend!" });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"), (err) => {
    if (err) res.status(500).send(err);
  });
});


// Porta dinamica
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend in ascolto su http://localhost:${PORT}`);
});
