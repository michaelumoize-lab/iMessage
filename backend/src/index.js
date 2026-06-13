// const express = require('express');
import express from "express";
import cors from "cors";

import "dotenv/config";

import fs from "fs";
import path from "path";

import { clerkMiddleware } from "@clerk/express";

import User from "./models/user.model.js";
import { connectDB } from "./lib/db.js";

import dns from "node:dns/promises";

import job from "./lib/cron.js";

import clerkWebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

const publicDir = path.join(process.cwd(), "public");

//It is important to that you don't parse the webhook event data, it should be passed as raw data to the clerkWebhook function
app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhook,
);

app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Serve static files from the public directory if it exists
//This is useful for production build where the frontend is built and served from the backend
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("/{*any}", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      next(err);
    });
  });
}

server.listen(PORT, () => {
  connectDB();
  console.log("Server is running on PORT:", PORT);

  if (process.env.NODE_ENV === "production") {
    job.start();
  }
});
