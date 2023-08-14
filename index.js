require('dotenv').config();
const express = require('express');
const {RestClientV5} = require("bybit-api");
const app = express();

const client = new RestClientV5({
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    testnet: false
  },
  // requestLibraryOptions
);
async function getBalance() {
  try {
    const response = await client.getWalletBalance({ accountType: "UNIFIED" });
    return response.result.list[0].totalEquity;
  } catch (e) {
    console.error('Error fetching balance', e);
  }
}

async function getPositionInfo(pair) {
  try {
    const response = await client.getPositionInfo({
      category: "linear",
      symbol: pair,
    });
    const result = response.result.list[0];
    const { leverage, avgPrice, liqPrice, takeProfit, unrealisedPnl, side, size, stopLoss } = result;
    return { leverage, avgPrice, liqPrice, takeProfit, unrealisedPnl, side, size, stopLoss };
  } catch (e) {
    console.error('Error fetching trade:', e);
  }
}

getPositionInfo("BAKEUSDT");

app.get('/position', async (req, res) => {
  const pair = req.query.pair;
  const trade = await getPositionInfo(pair);
  res.send(trade);
});

app.get('/balance', async (req, res) => {
  const balance = await getBalance();
  res.send(balance);
});

app.listen(3000)