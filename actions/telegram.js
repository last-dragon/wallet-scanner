const { tg_api, chat_id } = require("../config/config");
const { Bot } = require("grammy");
const { emojiParser } = require("@grammyjs/emoji");

const bot = new Bot(tg_api);
bot.use(emojiParser());

async function sendMessage(message, option = {}) {
  console.log("--------------- Telegram chat message ------------------");
  try {
    message_sent = await bot.api.sendMessage(chat_id, message, {
      ...option,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    });

    // message_sent = await bot.api.sendMessage("-4072982727", message, {
    //   ...option,
    //   parse_mode: "HTML",
    //   disable_web_page_preview: false,
    // });


    return message_sent;
  } catch (e) {
    console.log(e);
    return undefined;
  }
}

module.exports = {
  sendMessage,
};
