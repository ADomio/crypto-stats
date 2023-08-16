require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const {addedCoins, getBalance, getPositionInfo, buildMessage} = require("./methods");

const whiteList = ["adomio", "surmag"];
const bot = new TelegramBot(process.env.TG_BOT_TOKEN, {polling: true});
console.log("Telegram bot started");

bot.onText(/\/add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const coin = match[1].toUpperCase();
  if (!addedCoins.includes(coin)) {
    addedCoins.push(coin);
    return bot.sendMessage(chatId, `Пара ${coin} добавлена`);
  } else return bot.sendMessage(chatId, `Пара ${coin} уже была добавлена`);
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