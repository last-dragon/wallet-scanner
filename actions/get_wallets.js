const fs = require("fs");
const { checkMEV, getTrading, checkSwapWallet, getTopAddress } = require("../utils/subgraph");
const { minProfit, winRate, minPnl } = require("../config/config.js");
const { sendWalletMessage } = require("./messages.js");

const getWallets = async (lpData) => {
  let existWallets = [];
  const filepath = "./walletData.json";
  if (fs.existsSync(filepath)) {
    const fileContent = fs.readFileSync(filepath, "utf8");
    if (fileContent.trim().length > 0) {
      existWallets = JSON.parse(fileContent);
    } else {
      existWallets = [];
    }
  } else {
    existWallets = [];
  }

  for (let i = 0; i < lpData.length; i++) {
    console.log(`Checking traders for ${lpData[i].pool_address} ${i}/${lpData.length}`)
    const wallets = await getTopAddress(lpData[i].pool_address);
    let newWallets = [];
    console.log("checking wallets", wallets);
    for (let index = 0; index < wallets.length; index++) {
      const notified = existWallets.some(wallet => wallet.address === wallets[index]);
      if (!notified) {
        newWallets.push({
          address: wallets[index],
          top_rate: index + 1,
          token_name: lpData[i].symbol,
          token_address: lpData[i].address,
          profit_rate: 0,
        });
      }
    }
    let checkedWallets = [];
    for (let index = 0; index < newWallets.length; index++) {
      console.log("Checking mev.", newWallets[index].address);
      const mev = await checkMEV(newWallets[index].address);
      console.log("Finished Checking mev.", newWallets[index].address)
      if (!mev) {
        checkedWallets.push(newWallets[index]);
      }
    }
    for (let j = 0; j < checkedWallets.length; j++) {
      let reason = "";
      let passed = false;

      const tradingState = await getTrading(checkedWallets[j].address);
      // profit should bigger tha 200 usd
      if (tradingState.totalTrades == 1 && tradingState.totalPnl > 200) {

        const fresh = await checkSwapWallet(checkedWallets[j].address);
        if (fresh) {
          reason = "Fresh wallet in Top trades";
          passed = true;
        }
      }
      if (tradingState.totalTrades > 1) {
        if (tradingState.totalPnl / tradingState.totalTrades >= parseInt(minProfit)) {
          passed = true;
          reason = ` Average profit is $${(tradingState.totalPnl / tradingState.totalTrades).toFixed(2)}`;
        }
        if (tradingState.winRate >= parseInt(winRate)) {
          if (passed) reason = reason + ",";
          passed = true;
          reason = reason + ` Win rate is ${tradingState.winRate.toFixed(2)}%`;
        }
        // init deposit should be more than 0.1 eth
        let initValue = tradingState.initEth > 200 ? tradingState.initEth : 200;
        // if (tradingState.totalPnl * 100 / initValue >= parseInt(minPnl)) {
        //   if (passed) reason = reason + ",";
        //   passed = true;
        //   reason = ` Total PNL by roi is ${(tradingState.totalPnl * 100 / initValue).toFixed(2)}%`;
        // }

        if (tradingState.totalPnl > 50000) {
          if (passed) reason = reason + ",";
          passed = true;
          reason = ` Total PNL by roi is $${(tradingState.totalPnl).toFixed(2)}`;
        }
      }
      if (passed) {
        console.log({ reason, passed, address: checkedWallets[j].address })
        checkedWallets[j].reason = reason;
        existWallets.push(checkedWallets[j]);
        sendWalletMessage(checkedWallets[j]);
      }
    }
  }
  return existWallets;
};


module.exports = {
  getWallets,
};
