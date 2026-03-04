const express = require("express");
const cors = require("cors");
const path = require("path");
const { execSync } = require("child_process");

const app = express();
app.use(cors());

const buildDir = path.join(__dirname, "build");

// Build assets on startup (so build/chains.json always exists)
try {
  execSync("node index.js", { stdio: "inherit" });
} catch (e) {
  console.error("Failed to build assets (node index.js).");
  process.exit(1);
}

// Serve generated files (chains.json, denoms.json, img/, etc.)
app.use(express.static(buildDir));

// Nice homepage
app.get("/", (req, res) => {
  res.send(
    [
      `<h3>station-assets local server</h3>`,
      `<ul>`,
      `<li><a href="/chains.json">/chains.json</a></li>`,
      `<li><a href="/denoms.json">/denoms.json</a></li>`,
      `<li><a href="/ibc.json">/ibc.json</a></li>`,
      `<li><a href="/ibc_tokens.json">/ibc_tokens.json</a></li>`,
      `<li><a href="/currencies.json">/currencies.json</a></li>`,
      `</ul>`,
    ].join("")
  );
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`station-assets server running on http://localhost:${PORT}`);
});