const { sendMessage } = require("./telegram");

function make_buy_transaction_message(
  buyer_address,
  pool_address,
  tx,
  token_name,
  token_address,
  coins_buy,
  wallet_info
) {
  let message = "📂 Signal bot Buy notification 📂\n\n\n";
  message += `🏆 Trader : <a href="https://etherscan.io/address/${buyer_address}"> ${replaceBetween(
    buyer_address
  )}</a>\n\n`;
  message += `☑️ Wallet top trader number ${wallet_info.top_rate} on ${wallet_info.token_name
    } token,\n\t\t${wallet_info.reason}\n\n`;
  message += `💰 Amount:  ${coins_buy}<a href="https://etherscan.io/address/${token_address}"> ${token_name}</a>\n\n`;
  message += `✈️ Tx : <a href="https://etherscan.io/tx/${tx}"> ${replaceBetween(
    tx,
    56
  )}</a>\n\n`;
  message += `🚨 LP : <a href="https://etherscan.io/address/${pool_address}"> ${replaceBetween(
    pool_address
  )}</a>\n\n`;
  return message;
}

function replaceBetween(origin, last = 32) {
  return origin.substring(0, 6) + "..." + origin.substring(last);
}


function sendWalletMessage(wallet_info) {
  let message = "📂 Signal bot wallet notification 📂\n\n\n";
  message += `🏆 Trader : <a href="https://etherscan.io/address/${wallet_info.address}"> ${replaceBetween(
    wallet_info.address
  )}</a>\n\n`;
  // message += `☑️ Wallet top trader number ${wallet_info.top_rate} on <a href="https://etherscan.io/address/${wallet_info.token_address}"> ${wallet_info.token_name
  //   } </a>token,\n\n\t\t${wallet_info.reason}\n\n`;
  message += `\n\n\t\t${wallet_info.reason}\n\n`;
  sendMessage(message);
}


module.exports = {
  make_buy_transaction_message,
  sendWalletMessage
};
