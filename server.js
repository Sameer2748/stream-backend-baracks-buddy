// server/server.js
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);

// A simple in-memory map: roomId -> array of { ws, role }
const rooms = {};

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("New WebSocket connection...");

  // We’ll store the roomId and role once the user joins
  let currentRoom = null;
  let currentRole = null;

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data);
      const { type } = parsed;

      if (type === "join-room") {
        const { roomId, role } = parsed;
        currentRoom = roomId;
        currentRole = role;

        // If this room doesn't exist yet, create an empty array
        if (!rooms[roomId]) {
          rooms[roomId] = [];
        }
        // Add this client to the room
        rooms[roomId].push({ ws, role });
        console.log(
          `${role} joined room ${roomId}. Total: ${rooms[roomId].length}`
        );
      } else if (type === "chat-message") {
        // Broadcast to all in the room
        const { roomId, sender, message } = parsed;
        if (rooms[roomId]) {
          rooms[roomId].forEach((client) => {
            // Send to everyone (including sender) or you can exclude the sender if you want
            if (client.ws.readyState === 1) {
              client.ws.send(
                JSON.stringify({
                  type: "chat-message",
                  sender,
                  message,
                })
              );
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  });

  ws.on("close", () => {
    // Remove this ws from the room if it’s stored
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter(
        (client) => client.ws !== ws
      );
      console.log(`Client disconnected from room ${currentRoom}.`);
      if (rooms[currentRoom].length === 0) {
        delete rooms[currentRoom]; // cleanup if room is empty
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("WebSocket chat server is running.");
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Express & WebSocket server running on port ${PORT}`);
});
