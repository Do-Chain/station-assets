require("dotenv").config()

const express = require("express")
const cors = require("cors")
const path = require("path")
const { execSync } = require("child_process")

// import price recovery handlers
const {
  priceRecoveryHandler,
  fiatRecoveryHandler,
} = require("./prices/pricerecovery")

const app = express()
app.use(cors())
app.use(express.json())

console.log("CMC key loaded?", !!process.env.CMC_API_KEY)

const buildDir = path.join(__dirname, "build")

// Build assets on startup (so build/chains.json always exists)
try {
  execSync("node index.js", { stdio: "inherit" })
} catch (e) {
  console.error("Failed to build assets (node index.js).")
  process.exit(1)
}

// Serve generated files (chains.json, denoms.json, img/, etc.)
app.use(express.static(buildDir))

// API routes for price recovery
app.get("/api/prices", priceRecoveryHandler)
app.get("/api/fiat", fiatRecoveryHandler)

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
      `<li><a href="/api/prices">/api/prices</a></li>`,
      `<li><a href="/api/fiat">/api/fiat</a></li>`,
      `</ul>`,
    ].join("")
  )
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`station-assets server running on http://localhost:${PORT}`)
})