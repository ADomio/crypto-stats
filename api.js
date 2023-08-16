require('dotenv').config();
const express = require('express');
const {getPositionInfo, getBalance} = require("./methods");
const app = express();

app.get('/position', async (req, res) => {
  const pair = req.query.pair;
  const trade = await getPositionInfo(pair);
  res.send(trade);
});

app.get('/balance', async (req, res) => {
  const balance = await getBalance();
  res.send(balance);
});

app.listen(process.env.APP_PORT, () => {
  console.log(`API started on port ${process.env.APP_PORT}`)
})