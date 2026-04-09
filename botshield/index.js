const express = require("express");
const app = express();

app.use(express.json());

// Store request timestamps
const requestLogs = {};

// Store blocked IPs with time
const blockedIPs = {};

// =======================
// NORMAL ROUTE
// =======================
app.get("/", (req, res) => {
  const ip = req.ip;
  const currentTime = Date.now();

  // Check if blocked
  if (blockedIPs[ip]) {
    const blockTime = blockedIPs[ip];

    // Auto unblock after 30 seconds
    if (currentTime - blockTime > 30000) {
      delete blockedIPs[ip];
      requestLogs[ip] = [];
    } else {
      return res.send("🚫 You are temporarily blocked. Try again later.");
    }
  }

  // Initialize logs
  if (!requestLogs[ip]) {
    requestLogs[ip] = [];
  }

  // Add request
  requestLogs[ip].push(currentTime);

  // Keep only last 10 seconds
  requestLogs[ip] = requestLogs[ip].filter(
    (time) => currentTime - time < 10000
  );

  // Block if too many requests
  if (requestLogs[ip].length > 10) {
    blockedIPs[ip] = currentTime;
    return res.send("🚫 Blocked: Too many requests. Wait 30 seconds.");
  }

  res.send(`Hello! Requests in last 10s: ${requestLogs[ip].length}`);
});

// =======================
// BOT CHECK API (MAIN PRODUCT)
// =======================
app.post("/check-bot", (req, res) => {
  const ip = req.body.ip || req.ip;
  const currentTime = Date.now();

  // Check if blocked
  if (blockedIPs[ip]) {
    const blockTime = blockedIPs[ip];

    // Auto unblock after 30 seconds
    if (currentTime - blockTime > 30000) {
      delete blockedIPs[ip];
      requestLogs[ip] = [];
    } else {
      return res.json({ status: "blocked" });
    }
  }

  // Initialize logs
  if (!requestLogs[ip]) {
    requestLogs[ip] = [];
  }

  // Add request
  requestLogs[ip].push(currentTime);

  // Keep only last 10 seconds
  requestLogs[ip] = requestLogs[ip].filter(
    (time) => currentTime - time < 10000
  );

  // Block condition
  if (requestLogs[ip].length > 10) {
    blockedIPs[ip] = currentTime;
    return res.json({ status: "blocked" });
  }

  return res.json({ status: "allowed" });
});

// =======================
// SERVER START (IMPORTANT FOR DEPLOYMENT)
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
