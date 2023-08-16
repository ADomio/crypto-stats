const {RestClientV5} = require("bybit-api");
const addedCoins = ["HOOKUSDT", "XRPUSDT", "PHBUSDT", "BLZUSDT"];

const byBitClient = new RestClientV5({
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    testnet: false
  },
);

async function getBalance() {
  try {
    const response = await byBitClient.getWalletBalance({ accountType: "UNIFIED" });
    return Number(response.result.list[0].totalEquity).toFixed(2);
  } catch (e) {
    console.error('Error fetching balance', e);
  }
}

async function getPositionInfo(pair) {
  try {
    const response = await byBitClient.getPositionInfo({
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

module.exports = {
  addedCoins,
  getBalance,
  getPositionInfo,
  buildMessage,
}