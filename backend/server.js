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
const io = new SocketIO(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend build
app.use(express.static(path.join(__dirname, "../dist")));

// Socket.io events
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("ping", (data) => {
    console.log("Ping received:", data);
    socket.emit("pong", { msg: "Pong from server!" });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Example API
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

// Catch-all SPA handler compatibile Express 5
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT,"0.0.0.0", () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
