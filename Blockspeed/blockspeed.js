const express = require("express")
const axios = require("axios")

const router = express.Router()

const LCD = "https://terra-classic-lcd.publicnode.com"
const TARGET_BLOCK_TIME = 6.0
const SAMPLE_BLOCKS = 120

function getStatus(currentBlockTime, average24h, target) {
  const compare = Math.max(currentBlockTime, average24h)

  if (compare <= target * 1.15) return "Healthy"
  if (compare <= target * 1.75) return "Slightly Slow"
  return "Degraded"
}

function average(numbers) {
  if (!numbers.length) return 0
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

function toSeconds(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 1000
}

async function getLatestHeight() {
  const { data } = await axios.get(
    `${LCD}/cosmos/base/tendermint/v1beta1/blocks/latest`,
    { timeout: 15000 }
  )

  const height = Number(data?.block?.header?.height)
  if (!height) {
    throw new Error("Could not get latest block height")
  }

  return height
}

async function getBlockByHeight(height) {
  const { data } = await axios.get(
    `${LCD}/cosmos/base/tendermint/v1beta1/blocks/${height}`,
    { timeout: 15000 }
  )

  const header = data?.block?.header
  if (!header?.time) {
    throw new Error(`Missing block time for height ${height}`)
  }

  return {
    height: Number(header.height),
    time: header.time,
  }
}

async function buildBlockSpeed() {
  const latestHeight = await getLatestHeight()

  const heights = []
  for (let i = 0; i < SAMPLE_BLOCKS; i++) {
    const h = latestHeight - i
    if (h > 0) heights.push(h)
  }

  const blocks = await Promise.all(
    heights.map(async (height) => {
      try {
        return await getBlockByHeight(height)
      } catch (error) {
        return null
      }
    })
  )

  const validBlocks = blocks
    .filter(Boolean)
    .sort((a, b) => a.height - b.height)

  if (validBlocks.length < 3) {
    throw new Error("Not enough blocks returned to calculate block speed")
  }

  const intervals = []
  for (let i = 1; i < validBlocks.length; i++) {
    const diff = toSeconds(validBlocks[i].time, validBlocks[i - 1].time)
    if (diff > 0 && diff < 60) {
      intervals.push(diff)
    }
  }

  const currentBlockTime = intervals.length
    ? Number(intervals[intervals.length - 1].toFixed(2))
    : 0

  const average24h = Number(average(intervals).toFixed(2))

  const status = getStatus(currentBlockTime, average24h, TARGET_BLOCK_TIME)

  return {
    chainID: "columbus-5",
    current_block_time: currentBlockTime,
    average_24h: average24h,
    target_block_time: TARGET_BLOCK_TIME,
    status,
  }
}

router.get("/api/blockspeed", async (req, res) => {
  try {
    const data = await buildBlockSpeed()
    res.json(data)
  } catch (error) {
    console.error("Block speed error:", error.message)
    res.status(500).json({
      error: "Failed to calculate block speed",
      details: error.message,
    })
  }
})

module.exports = router