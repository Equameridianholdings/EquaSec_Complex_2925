import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import visitorSchema from "./visitorSchema.js"
import 'dotenv/config'

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"],
    origin: "*", // Allow all origins for simplicity. Restrict this in production.
  },
});

// MongoDB Connection
const URI = process.env.ATLAS_URI;
const DB_NAME = process.env.DB_NAME;

mongoose.connect(`${URI}/${DB_NAME}`);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Web Socket
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('visitors', (msg) => {
    console.log(msg);
    io.emit('visitors', visitorSchema.find({}).select({}).exec());
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});