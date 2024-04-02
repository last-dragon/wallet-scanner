const fs = require("fs");
const { sendMessage } = require("./telegram");
const { make_buy_transaction_message } = require("./messages");

async function process_transaction(
  buyer_address,
  transaction_data,
  pool_data,
  version,
  wallet_data
) {
  let coins_buy = 0;
  const checked_address = check_address(buyer_address,wallet_data);

  if (checked_address.state) {
    try {
      if (version === 2) {
        if(pool_data.istoken0){
          coins_buy = Number(transaction_data.data[2]) / 10 ** pool_data.decimals;
        }else{
          coins_buy = Number(transaction_data.data[3]) / 10 ** pool_data.decimals;
        }
      } else {
        if(pool_data.istoken0){
          coins_buy = -Number(transaction_data.data[0]) / 10 ** pool_data.decimals;
        }else{
          coins_buy = -Number(transaction_data.data[1]) / 10 ** pool_data.decimals;
        }
      }
      if (coins_buy > 0) {
        const buy_message = make_buy_transaction_message(
          buyer_address,
          pool_data.pool_address,
          transaction_data.tx,
          pool_data.symbol,
          pool_data.address,
          coins_buy,
          checked_address.wallet_info
        );
        await sendMessage(buy_message);
      }
    } catch (e) {
      console.log(e);
    }
  } else {
    console.log("Unregistered address");
  }
}

function check_address(wallet_address,wallet_data) {
  let wallet_info;
  if (wallet_data.length > 0) {
    const address_index = wallet_data.findIndex((wallet) => {
      wallet_info = wallet;
      return wallet.address.toLowerCase() == wallet_address.toLowerCase();
    });
    if (address_index > -1) {
      return {
        state: true,
        wallet_info: wallet_info,
      };
    } else {
      return {
        state: false,
        wallet_info: wallet_info,
      };
    }
  } else {
    console.log("There is no wallet address!");
    return {
      state: false,
      wallet_info: wallet_info,
    };
  }
}

module.exports = {
  process_transaction,
};
