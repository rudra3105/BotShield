const express = require("express");
const app = express();

app.use(express.json());

// =======================
// HOME ROUTE
// =======================
app.get("/", (req, res) => {
  res.send("BotShield Level 7 running 🚀");
});

// =======================
// USERS (API KEYS)
// =======================
const users = {
  "abc123": { name: "Client A" },
  "xyz789": { name: "Client B" }
};

// =======================
// STORAGE
// =======================
const requestLogs = {};
const blockedFingerprints = {};
const logs = [];

const badAgents = ["curl", "bot", "crawler", "spider", "python"];

// =======================
// BOT CHECK API
// =======================
app.post("/check-bot", (req, res) => {

  // 🔐 API KEY VALIDATION
  const apiKey = req.body.apiKey;
  if (!apiKey || !users[apiKey]) {
    return res.json({ status: "error", message: "Invalid API Key" });
  }

  const ip = req.body.ip || req.ip;
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  const path = req.body.path || "/";
  const currentTime = Date.now();

  const fingerprint = ip + "-" + userAgent;

  let score = 0;

  // 🔴 Bad user-agent
  for (let agent of badAgents) {
    if (userAgent.includes(agent)) {
      score += 10;
    }
  }

  // 🔴 Check if blocked
  if (blockedFingerprints[fingerprint]) {
    const blockTime = blockedFingerprints[fingerprint];

    if (currentTime - blockTime < 30000) {
      logs.push({
        apiKey,
        ip,
        fingerprint,
        path,
        score: 10,
        status: "blocked",
        time: new Date().toISOString()
      });

      return res.json({ status: "blocked", reason: "previous_block", score: 10 });
    } else {
      delete blockedFingerprints[fingerprint];
      requestLogs[fingerprint] = [];
    }
  }

  // Init logs
  if (!requestLogs[fingerprint]) {
    requestLogs[fingerprint] = [];
  }

  requestLogs[fingerprint].push(currentTime);

  requestLogs[fingerprint] = requestLogs[fingerprint].filter(
    (time) => currentTime - time < 10000
  );

  const requestCount = requestLogs[fingerprint].length;

  console.log(`FP: ${fingerprint}, Requests: ${requestCount}`);

  // 🔴 Rate limit
  if (requestCount > 10) {
    score += 5;
  }

  // 🔴 Login attack
  if (path.includes("login") && requestCount > 5) {
    score += 7;
  }

  // =======================
  // DECISION ENGINE
  // =======================
  let status = "allowed";

  if (score >= 10) {
    blockedFingerprints[fingerprint] = currentTime;
    status = "blocked";
  } else if (score >= 5) {
    status = "suspicious";
  }

  // =======================
  // STORE LOG
  // =======================
  logs.push({
    apiKey,
    ip,
    fingerprint,
    path,
    score,
    status,
    time: new Date().toISOString()
  });

  // =======================
  // RESPONSE
  // =======================
  return res.json({ status, score });
});

// =======================
// DASHBOARD API
// =======================
app.get("/dashboard", (req, res) => {
  res.json({
    totalRequests: logs.length,
    blocked: logs.filter(l => l.status === "blocked").length,
    suspicious: logs.filter(l => l.status === "suspicious").length,
    logs: logs.slice(-20)
  });
});

// =======================
// DASHBOARD UI
// =======================
app.get("/dashboard-ui", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>BotShield Dashboard</title>
      <style>
        body {
          font-family: Arial;
          background: #0f172a;
          color: white;
          padding: 20px;
        }
        h1 {
          color: #38bdf8;
        }
        .card {
          background: #1e293b;
          padding: 15px;
          margin: 10px;
          border-radius: 10px;
          display: inline-block;
          width: 200px;
        }
        table {
          width: 100%;
          margin-top: 20px;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #334155;
          padding: 10px;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <h1>🚀 BotShield Dashboard</h1>

      <div id="stats"></div>

      <table>
        <thead>
          <tr>
            <th>API Key</th>
            <th>IP</th>
            <th>Status</th>
            <th>Score</th>
            <th>Path</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody id="logs"></tbody>
      </table>

      <script>
        async function loadDashboard() {
          const res = await fetch("/dashboard");
          const data = await res.json();

          document.getElementById("stats").innerHTML = \`
            <div class="card">Total: \${data.totalRequests}</div>
            <div class="card">Blocked: \${data.blocked}</div>
            <div class="card">Suspicious: \${data.suspicious}</div>
          \`;

          let rows = "";
          data.logs.forEach(log => {
            rows += \`
              <tr>
                <td>\${log.apiKey}</td>
                <td>\${log.ip}</td>
                <td>\${log.status}</td>
                <td>\${log.score}</td>
                <td>\${log.path}</td>
                <td>\${log.time}</td>
              </tr>
            \`;
          });

          document.getElementById("logs").innerHTML = rows;
        }

        loadDashboard();
        setInterval(loadDashboard, 3000);
      </script>
    </body>
    </html>
  `);
});

// =======================
// SERVER START
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
