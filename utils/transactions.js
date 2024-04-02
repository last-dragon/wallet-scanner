const ethers = require("ethers");
const { nodeProviderUrl } = require("../config/config.js");

const provider = new ethers.providers.JsonRpcProvider(nodeProviderUrl);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let from_block;
let to_block;
let step_block = 10;

let pool_data, callback;

async function setMonitor(_pool_data, _blocknumber, _callback, wallet_data) {
  console.log("set monitor");
  pool_data = _pool_data;
  callback = _callback;
  from_block = _blocknumber;
  try {
    const lastblock = await provider.getBlockNumber();
    to_block = Math.min(lastblock, from_block + step_block);
    console.log({ from_block, to_block })
    if (from_block <= lastblock) {
      console.log('start scan...')
      const fromIndex = Math.min(100, pool_data.length - 1);
      for (let index = fromIndex; index >= 0; index--) {
        console.log('scan for ', pool_data[index].symbol)
        const topics =
          pool_data[index].version == 3
            ? "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
            : "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822";
        const filter = {
          fromBlock: from_block,
          toBlock: to_block,
          address: pool_data[index].pool_address,
          topics: [topics],
        };
        const logList = await provider.getLogs(filter);
        console.log(logList.length, "found transactions");
        if (logList.length > 0) {
          for (let i = 0; i < logList.length; i++) {
            let tx = await provider.getTransaction(logList[i].transactionHash);
            await process_transaction(
              tx.from,
              logList[i],
              pool_data[index],
              pool_data[index].version,
              callback,
              wallet_data
            );
            await delay(100);
          }
        }
      }
    }
  } catch (error) {
    console.log(error)
    await delay(5000);
  }
}

async function process_transaction(buyer_address, log, pool, version, callback, wallet_data) {
  try {
    const { topics, data, raw, transactionHash } = log;
    let decoded;
    if (version == 2) {
      decoded = ethers.utils.defaultAbiCoder.decode(
        ["uint256", "uint256", "uint256", "uint256"],
        data ? data : raw.data
      );
    } else {
      decoded = ethers.utils.defaultAbiCoder.decode(
        ["int256", "int256", "uint160", "uint128", "int24"],
        data ? data : raw.data
      );
    }
    const receiver = ethers.utils.defaultAbiCoder.decode(
      ["address"],
      topics[2]
    );

    let decoded_topics = [];

    for (let index = 0; index < topics.length; index++) {
      decoded_topics.push(
        ethers.utils.defaultAbiCoder.decode(["address"], topics[index])
      );
    }
    if (callback) {
      await callback(
        buyer_address,
        {
          topic: decoded_topics,
          data: decoded,
          tx: transactionHash,
          receiver: receiver[0],
        },
        pool,
        version,
        wallet_data
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function get_block_number() {
  try {
    return await provider.getBlockNumber();
  } catch (error) {
    return 18559965;
  }
}

module.exports = {
  setMonitor,
  get_block_number,
};
