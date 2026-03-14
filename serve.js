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

// import volume routes
const volumeRoutes = require("./Volume/volume")

// import wallet routes
const walletRoutes = require("./Wallets/wallets")

// import block speed routes
const blockSpeedRoutes = require("./Blockspeed/blockspeed")

// import pool routes
const poolRoutes = require("./Pools/pools")

const app = express()
app.use(cors())
app.use(express.json())

console.log("CMC key loaded?", !!process.env.CMC_API_KEY)

const buildDir = path.join(__dirname, "build")

// Build assets on startup
try {
  execSync("node index.js", { stdio: "inherit" })
} catch (e) {
  console.error("Failed to build assets (node index.js).")
  process.exit(1)
}

// Serve generated files
app.use(express.static(buildDir))

// API routes for price recovery
app.get("/api/prices", priceRecoveryHandler)
app.get("/api/fiat", fiatRecoveryHandler)

// API routes for volume
app.use(volumeRoutes)

// API routes for wallets
app.use(walletRoutes)

// API routes for block speed
app.use(blockSpeedRoutes)

// API routes for pools
app.use(poolRoutes)

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
      `<li><a href="/api/cmc/volume/current?chainID=columbus-5">/api/cmc/volume/current</a></li>`,
      `<li><a href="/api/wallets/active?chainID=columbus-5&hours=24">/api/wallets/active</a></li>`,
      `<li><a href="/api/blockspeed?chainID=columbus-5">/api/blockspeed</a></li>`,
      `<li><a href="/api/pools/oracle?chainID=columbus-5">/api/pools/oracle</a></li>`,
      `<li><a href="/api/pools/community?chainID=columbus-5">/api/pools/community</a></li>`,
      `<li><a href="/api/pools/all?chainID=columbus-5">/api/pools/all</a></li>`,
      `</ul>`,
    ].join("")
  )
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`station-assets server running on http://localhost:${PORT}`)
})