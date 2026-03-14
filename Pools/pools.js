const express = require("express")
const axios = require("axios")
const fs = require("fs")
const path = require("path")

const router = express.Router()

const LCD_BY_CHAIN = {
  "columbus-5": "https://terra-classic-lcd.publicnode.com",
}

let denomList = []

try {
  const denomPath = path.join(__dirname, "..", "build", "denoms.json")
  if (fs.existsSync(denomPath)) {
    const raw = fs.readFileSync(denomPath, "utf8")
    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      denomList = parsed
      console.log(`✅ Loaded ${denomList.length} denoms from build/denoms.json`)
    } else {
      console.warn("⚠️ build/denoms.json did not contain an array")
    }
  } else {
    console.warn("⚠️ build/denoms.json not found, symbol resolution will be limited")
  }
} catch (error) {
  console.warn("⚠️ Failed to load denoms.json:", error.message)
}

function getLcdFromChainID(chainID) {
  return LCD_BY_CHAIN[chainID] || LCD_BY_CHAIN["columbus-5"]
}

function resolveDenomSymbol(denom) {
  if (!denom) return ""

  if (denom === "uluna") return "LUNC"
  if (denom === "uusd") return "USTC"

  const found = denomList.find((item) => item?.denom === denom)

  if (found?.symbol) return found.symbol
  if (found?.display) return found.display
  if (found?.base) return found.base

  return denom
}

function normalizeCoin(coin) {
  const denom = coin?.denom || ""

  return {
    denom,
    symbol: resolveDenomSymbol(denom),
    amount: coin?.amount || "0",
  }
}

function extractModuleAddress(account) {
  return (
    account?.base_account?.address ||
    account?.base_vesting_account?.base_account?.address ||
    account?.address ||
    ""
  )
}

async function getModuleAccountAddress(lcd, moduleName) {
  const response = await axios.get(`${lcd}/cosmos/auth/v1beta1/module_accounts`, {
    timeout: 15000,
  })

  const accounts = Array.isArray(response.data?.accounts) ? response.data.accounts : []

  for (const account of accounts) {
    const name =
      account?.name ||
      account?.account?.name ||
      account?.value?.name ||
      ""

    if (String(name).toLowerCase() === String(moduleName).toLowerCase()) {
      const address =
        extractModuleAddress(account) ||
        extractModuleAddress(account?.account) ||
        extractModuleAddress(account?.value)

      if (address) return address
    }
  }

  throw new Error(`Module account "${moduleName}" not found`)
}

router.get("/api/pools/oracle", async (req, res) => {
  try {
    const chainID = req.query.chainID || "columbus-5"
    const lcd = getLcdFromChainID(chainID)

    const oracleAddress = await getModuleAccountAddress(lcd, "oracle")

    const response = await axios.get(
      `${lcd}/cosmos/bank/v1beta1/balances/${oracleAddress}`,
      { timeout: 15000 }
    )

    const balances = Array.isArray(response.data?.balances)
      ? response.data.balances
      : []

    const coins = balances.map(normalizeCoin)

    res.json({
      chainID,
      type: "oracle",
      address: oracleAddress,
      coins,
      count: coins.length,
    })
  } catch (error) {
    console.error("❌ Oracle pool fetch failed:", error.message)

    res.status(500).json({
      error: "Failed to fetch oracle pool",
      details: error.message,
    })
  }
})

router.get("/api/pools/community", async (req, res) => {
  try {
    const chainID = req.query.chainID || "columbus-5"
    const lcd = getLcdFromChainID(chainID)

    const response = await axios.get(
      `${lcd}/cosmos/distribution/v1beta1/community_pool`,
      { timeout: 15000 }
    )

    const pool = Array.isArray(response.data?.pool) ? response.data.pool : []
    const coins = pool.map(normalizeCoin)

    res.json({
      chainID,
      type: "community",
      coins,
      count: coins.length,
    })
  } catch (error) {
    console.error("❌ Community pool fetch failed:", error.message)

    res.status(500).json({
      error: "Failed to fetch community pool",
      details: error.message,
    })
  }
})

router.get("/api/pools/all", async (req, res) => {
  try {
    const chainID = req.query.chainID || "columbus-5"
    const lcd = getLcdFromChainID(chainID)

    const oracleAddress = await getModuleAccountAddress(lcd, "oracle")

    const [oracleRes, communityRes] = await Promise.all([
      axios.get(`${lcd}/cosmos/bank/v1beta1/balances/${oracleAddress}`, {
        timeout: 15000,
      }),
      axios.get(`${lcd}/cosmos/distribution/v1beta1/community_pool`, {
        timeout: 15000,
      }),
    ])

    const oracleCoins = Array.isArray(oracleRes.data?.balances)
      ? oracleRes.data.balances.map(normalizeCoin)
      : []

    const communityCoins = Array.isArray(communityRes.data?.pool)
      ? communityRes.data.pool.map(normalizeCoin)
      : []

    res.json({
      chainID,
      oracle: {
        address: oracleAddress,
        coins: oracleCoins,
        count: oracleCoins.length,
      },
      community: {
        coins: communityCoins,
        count: communityCoins.length,
      },
    })
  } catch (error) {
    console.error("❌ Combined pools fetch failed:", error.message)

    res.status(500).json({
      error: "Failed to fetch pool data",
      details: error.message,
    })
  }
})

module.exports = router