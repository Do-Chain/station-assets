const express = require("express")
const axios = require("axios")

const router = express.Router()

const CMC_API_KEY = process.env.CMC_API_KEY
const CMC_BASE_URL =
  process.env.CMC_BASE_URL || "https://pro-api.coinmarketcap.com"

const CHAIN_TO_CMC = {
  "columbus-5": { symbol: "LUNC", name: "Terra Classic" },
  "phoenix-1": { symbol: "LUNA", name: "Terra" },
  "cosmoshub-4": { symbol: "ATOM", name: "Cosmos" },
  "osmosis-1": { symbol: "OSMO", name: "Osmosis" },
  "juno-1": { symbol: "JUNO", name: "Juno" },
  "akashnet-2": { symbol: "AKT", name: "Akash" },
  "axelar-dojo-1": { symbol: "AXL", name: "Axelar" },
  "crescent-1": { symbol: "CRE", name: "Crescent" },
  "kaiyo-1": { symbol: "KUJI", name: "Kujira" },
  "mars-1": { symbol: "MARS", name: "Mars" },
  "migaloo-1": { symbol: "WHALE", name: "Migaloo" },
  "pacific-1": { symbol: "SEI", name: "Sei" },
  "stride-1": { symbol: "STRD", name: "Stride" },
  "chihuahua-1": { symbol: "HUAHUA", name: "Chihuahua" },
  "comdex-1": { symbol: "CMDX", name: "Comdex" },
  "cheqd-mainnet-1": { symbol: "CHEQ", name: "cheqd" },
  "stafihub-1": { symbol: "FIS", name: "StaFiHub" },
  "mainnet-3": { symbol: "DEC", name: "Decentr" },
  "archway-1": { symbol: "ARCH", name: "Archway" },
  "carbon-1": { symbol: "SWTH", name: "Carbon" },
  "pion-1": { symbol: "NTRN", name: "Neutron" },
}

router.get("/api/cmc/volume/current", async (req, res) => {
  try {
    const { chainID } = req.query

    if (!chainID) {
      return res.status(400).json({
        error: "Missing chainID",
      })
    }

    if (!CMC_API_KEY) {
      return res.status(500).json({
        error: "CMC_API_KEY is missing from .env",
      })
    }

    const mapping = CHAIN_TO_CMC[chainID]

    if (!mapping) {
      return res.status(404).json({
        error: "Chain not mapped to CMC symbol",
        chainID,
      })
    }

    const response = await axios.get(
      `${CMC_BASE_URL}/v1/cryptocurrency/quotes/latest`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": CMC_API_KEY,
          Accept: "application/json",
        },
        params: {
          symbol: mapping.symbol,
          convert: "USD",
        },
        timeout: 15000,
      }
    )

    const asset = response.data?.data?.[mapping.symbol]
    const usd = asset?.quote?.USD

    if (!usd) {
      return res.status(404).json({
        error: "No USD quote returned from CMC",
        chainID,
        symbol: mapping.symbol,
      })
    }

    return res.json({
      chainID,
      name: mapping.name,
      symbol: mapping.symbol,
      price: usd.price ?? null,
      volume_24h: usd.volume_24h ?? null,
      market_cap: usd.market_cap ?? null,
      percent_change_24h: usd.percent_change_24h ?? null,
      last_updated: usd.last_updated ?? null,
    })
  } catch (error) {
    return res.status(error?.response?.status || 500).json({
      error: "Failed to fetch current CMC volume",
      details: error?.response?.data || error.message,
    })
  }
})

module.exports = router