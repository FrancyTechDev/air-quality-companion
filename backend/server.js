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

// Serve frontend static (dist) corretto rispetto alla tua struttura
app.use(express.static(path.join(__dirname, "../dist")));

// Socket.io example
io.on("connection", (socket) => {
  console.log("Nuovo client connesso:", socket.id);

  socket.on("ping", (data) => {
    socket.emit("pong", { msg: "Pong dal server!" });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnesso:", socket.id);
  });
});

// API example
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello dal backend!" });
});

// Catch-all SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Porta dinamica Railway
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend in ascolto su http://localhost:${PORT}`);
});
