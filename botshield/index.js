const express = require("express");
const app = express();

app.use(express.json());

// Store request timestamps
const requestLogs = {};

// Store blocked IPs with time
const blockedIPs = {};

// Normal route
app.get("/", (req, res) => {
  const ip = req.ip;
  const currentTime = Date.now();

  if (blockedIPs[ip]) {
    const blockTime = blockedIPs[ip];

    if (currentTime - blockTime > 30000) {
      delete blockedIPs[ip];
      requestLogs[ip] = [];
    } else {
      return res.send("🚫 You are temporarily blocked. Try again later.");
    }
  }

  if (!requestLogs[ip]) {
    requestLogs[ip] = [];
  }

  requestLogs[ip].push(currentTime);

  requestLogs[ip] = requestLogs[ip].filter(
    (time) => currentTime - time < 10000
  );

  if (requestLogs[ip].length > 10) {
    blockedIPs[ip] = currentTime;
    return res.send("🚫 Blocked: Too many requests. Wait 30 seconds.");
  }

  res.send(`Hello! Requests in last 10s: ${requestLogs[ip].length}`);
});

// API route
app.post("/check-bot", (req, res) => {
  const ip = req.body.ip || req.ip;
  const currentTime = Date.now();

  if (blockedIPs[ip]) {
    const blockTime = blockedIPs[ip];

    if (currentTime - blockTime > 30000) {
      delete blockedIPs[ip];
      requestLogs[ip] = [];
    } else {
      return res.json({ status: "blocked" });
    }
  }

  if (!requestLogs[ip]) {
    requestLogs[ip] = [];
  }

  requestLogs[ip].push(currentTime);

  requestLogs[ip] = requestLogs[ip].filter(
    (time) => currentTime - time < 10000
  );

  if (requestLogs[ip].length > 10) {
    blockedIPs[ip] = currentTime;
    return res.json({ status: "blocked" });
  }

  return res.json({ status: "allowed" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});