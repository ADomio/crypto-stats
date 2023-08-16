require('dotenv').config();
const express = require('express');
const {RestClientV5} = require("bybit-api");
const app = express();
const TelegramBot = require('node-telegram-bot-api');

const client = new RestClientV5({
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    testnet: false
  },
  // requestLibraryOptions
);
const whiteList = ["adomio", "surmag"];
const addedCoins = ["HOOKUSDT", "XRPUSDT", "PHBUSDT", "BLZUSDT"];
const bot = new TelegramBot(process.env.TG_BOT_TOKEN, {polling: true});

bot.onText(/\/add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const coin = match[1].toUpperCase();
  if (!addedCoins.includes(coin)) {
    addedCoins.push(coin);
    return bot.sendMessage(chatId, `Пара ${coin} добавлена`);
  } else {
    return bot.sendMessage(chatId, `Пара ${coin} уже была добавлена`);
  }
});

bot.onText(/\/delete (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!whiteList.includes(msg.from.username)) return bot.sendMessage(chatId, "forbidden");
  const coin = match[1].toUpperCase();
  const index = addedCoins.indexOf(coin);
  if (index !== -1) {
    addedCoins.splice(index, 1);
    return bot.sendMessage(chatId, `Пара ${coin} удалена.`);
  } else {
    return bot.sendMessage(chatId, `Пара ${coin} не найдена`);
  }
});

bot.onText(/\/info/, async (msg) => {
  console.log("Getting info", msg.from.username, new Date().toISOString());
  const chatId = msg.chat.id;
  if (!whiteList.includes(msg.from.username)) return bot.sendMessage(chatId, "forbidden");
  if (addedCoins.length > 0) {
    const balance = await getBalance();
    let totalPnl = 0;
    await bot.sendMessage(chatId, `Баланс: <b>${balance}</b>`, { parse_mode: "HTML" });
    await bot.sendMessage(chatId, `Отслеживаемые монеты: <b>${addedCoins.join(", ")}</b>`, { parse_mode: "HTML" });
    for (const pair of addedCoins) {
      const result = await getPositionInfo(pair);
      if (!Number(result.avgPrice)) {
        const index = addedCoins.indexOf(pair);
        if (index !== -1) addedCoins.splice(index, 1);
        return;
      }
      const message = buildMessage(balance, result);
      await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
      totalPnl = totalPnl + parseFloat(result.unrealisedPnl);
    }
    await bot.sendMessage(chatId, `PNL: ${Number(totalPnl).toFixed(2)}`);
    totalPnl = 0;
  } else {
    return bot.sendMessage(chatId, 'Монеты для отслеживания не добавлены');
  }
});

async function getBalance() {
  try {
    const response = await client.getWalletBalance({ accountType: "UNIFIED" });
    return Number(response.result.list[0].totalEquity).toFixed(2);
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
    const { leverage, avgPrice, liqPrice, takeProfit, unrealisedPnl, side, size, stopLoss, markPrice } = result;
    return { pair, leverage, avgPrice, liqPrice, takeProfit, unrealisedPnl, side, size, stopLoss, markPrice };
  } catch (e) {
    console.error('Error fetching trade:', e);
  }
}

function buildMessage(balance, trade) {
  const takeProfitUSDT = trade.takeProfit ? Number(trade.size * (trade.takeProfit - trade.avgPrice)).toFixed(2) : 0;
  const stopLossUSDT = trade.stopLoss ? Number(trade.size * (trade.stopLoss - trade.avgPrice)).toFixed(2) : 0;
  return `
<b>${trade.pair} ${trade.side === "Buy" ? "LONG" : "SHORT"}</b>
Точка входа: ${Number(trade.avgPrice).toFixed(4)}
Текущая цена: ${Number(trade.markPrice).toFixed(4)}
Текущий результат: ${Number(trade.unrealisedPnl).toFixed(2)}
Размер позиции: ${trade.size}
TP: ${trade.takeProfit || "Нет"} (${takeProfitUSDT}$)
SL: ${trade.stopLoss || "Нет"} (${stopLossUSDT}$)
`
}

app.get('/position', async (req, res) => {
  const pair = req.query.pair;
  const trade = await getPositionInfo(pair);
  res.send(trade);
});

app.get('/balance', async (req, res) => {
  const balance = await getBalance();
  res.send(balance);
});

app.listen(3000, "localhost")