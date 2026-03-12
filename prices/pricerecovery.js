const axios = require("axios")
const currencies = require("../currencies")

const CMC_SYMBOLS = {
  uluna: "LUNC",
  "uluna:classic": "LUNC",
  uluna_classic: "LUNC",
  lunc: "LUNC",

  "uluna:phoenix": "LUNA",
  luna2: "LUNA",
  luna: "LUNA",

  uusd: "USTC",
  ustc: "USTC",

  uatom: "ATOM",
  atom: "ATOM",

  uosmo: "OSMO",
  osmo: "OSMO",

  ujuno: "JUNO",
  juno: "JUNO",

  usei: "SEI",
  sei: "SEI",

  uinj: "INJ",
  inj: "INJ",

  uakt: "AKT",
  akt: "AKT",

  uscrt: "SCRT",
  scrt: "SCRT",

  ukuji: "KUJI",
  kuji: "KUJI",

  ustars: "STARS",
  stars: "STARS",

  udydx: "DYDX",
  dydx: "DYDX",

  untrn: "NTRN",
  ntrn: "NTRN",

  uwhale: "WHALE",
  whale: "WHALE",

  urun: "RUN",
  run: "RUN",

  uusdc: "USDC",
  usdc: "USDC",

  uusdt: "USDT",
  usdt: "USDT",

  weth: "ETH",
  eth: "ETH",

  wbtc: "BTC",
  btc: "BTC",
}

async function fetchCoinMarketCapPrices() {
  const apiKey = process.env.CMC_API_KEY || process.env.REACT_APP_CMC_API_KEY

  if (!apiKey) {
    console.error("CMC_API_KEY missing")
    return {}
  }

  try {
    const symbols = Array.from(new Set(Object.values(CMC_SYMBOLS)))

    const { data } = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
        },
        params: {
          symbol: symbols.join(","),
          convert: "USD",
        },
        timeout: 10000,
      }
    )

    const payload = data?.data || {}
    const prices = {}

    Object.entries(CMC_SYMBOLS).forEach(([key, symbol]) => {
      const entry = payload[symbol]

      prices[key] = {
        price: entry?.quote?.USD?.price ?? 0,
        change: entry?.quote?.USD?.percent_change_24h ?? 0,
        source: "coinmarketcap",
      }
    })

    return prices
  } catch (error) {
    console.error("CoinMarketCap price fetch failed:", error.message)
    return {}
  }
}

async function fetchFiatRates() {
  const apiKey = process.env.CURRENCY_KEY
  const currencyIds = currencies
    .map((item) => item.id)
    .filter((id) => id && id !== "USD")

  if (!apiKey) {
    return {
      USD: {
        rate: 1,
        name: "United States Dollar",
        symbol: "$",
        source: "fallback",
      },
    }
  }

  try {
    const { data } = await axios.get("https://apilayer.net/api/live", {
      params: {
        source: "USD",
        currencies: currencyIds.join(","),
        access_key: apiKey,
      },
      timeout: 10000,
    })

    const quotes = data?.quotes || {}
    const result = {}

    currencies.forEach(({ id, name, symbol }) => {
      if (id === "USD") {
        result[id] = {
          rate: 1,
          name,
          symbol,
          source: "apilayer",
        }
        return
      }

      result[id] = {
        rate: quotes[`USD${id}`] ?? null,
        name,
        symbol,
        source: "apilayer",
      }
    })

    if (!result.USD) {
      result.USD = {
        rate: 1,
        name: "United States Dollar",
        symbol: "$",
        source: "apilayer",
      }
    }

    return result
  } catch (error) {
    console.error("Fiat rate fetch failed:", error.message)
    return {
      USD: {
        rate: 1,
        name: "United States Dollar",
        symbol: "$",
        source: "fallback",
      },
    }
  }
}

async function priceRecoveryHandler(req, res) {
  try {
    const prices = await fetchCoinMarketCapPrices()
    res.json(prices)
  } catch (error) {
    console.error("Price recovery handler failed:", error.message)
    res.status(500).json({ error: "Failed to fetch prices" })
  }
}

async function fiatRecoveryHandler(req, res) {
  try {
    const rates = await fetchFiatRates()
    res.json(rates)
  } catch (error) {
    console.error("Fiat recovery handler failed:", error.message)
    res.status(500).json({ error: "Failed to fetch fiat rates" })
  }
}

module.exports = {
  fetchCoinMarketCapPrices,
  fetchFiatRates,
  priceRecoveryHandler,
  fiatRecoveryHandler,
}