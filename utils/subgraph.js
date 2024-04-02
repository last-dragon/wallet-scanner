const gql = require("graphql-tag");
const { EvmChain } = require("@moralisweb3/common-evm-utils");
const { ethers } = require("ethers");
const axios = require('axios');
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { weht, APPOLO, providerUrl, nodeProviderUrl, etherscankey, apiUrl } = require("../config/config.js");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const provider = ethers.getDefaultProvider(providerUrl);
const nodeProvider = new ethers.providers.JsonRpcProvider(nodeProviderUrl);
let options = new chrome.Options();
options.addArguments("--headless");
options.addArguments("--disable-gpu");
options.addArguments("--window-size=1920x1080");
options.addArguments("--disable-dev-shm-usage");
options.addArguments("--no-sandbox");
options.addArguments("--remote-debugging-port=9230");
options.addArguments("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537");
options.addArguments("--disable-blink-features");
options.addArguments("--disable-blink-features=AutomationControlled");
let driver = new Builder().forBrowser("chrome").setChromeOptions(options).build();

async function getcurrentstamp() {
  try {

    let latestBlockNumber = await provider.getBlockNumber();
    let block = await provider.getBlock(latestBlockNumber);
    console.log(block.timestamp);

    let latestTimeStampInMs = block.timestamp * 1000;
    return latestTimeStampInMs
  } catch (error) {
    console.log("error", error);
    return Date.now();
  }
}

async function getPool(
  launchtime,
  minlp,
  maxlp,
  minbuys,
  minsells,
  version,
  endTo,
  chain = EvmChain.ETHEREUM
) {
  const timestamp = await getcurrentstamp();
  const startFrom = Math.floor((timestamp - launchtime * 60 * 1000) / 1000);

  const minTx = Number(minbuys) + Number(minsells);
  const queryv3 = `
    {
        pools(first:100,where:{createdAtTimestamp_gt:${startFrom},
                    createdAtTimestamp_lt:${endTo},
                    totalValueLockedETH_lt:${maxlp},
                    totalValueLockedETH_gt:${minlp},
                    txCount_gt:${minTx}},
                    orderBy: createdAtTimestamp ,orderDirection:desc, subgraphError: allow) {
            id
            token0{
              id
              symbol
              name
              decimals
            }
            token1{
              id
              symbol
              name
              decimals
            }
            totalValueLockedETH
            totalValueLockedToken0
            totalValueLockedToken1
            createdAtTimestamp
            txCount
            mints{
                amount0
                amount1
                timestamp
            }
            swaps(first:1,orderBy:timestamp,orderDirection:asc){
                timestamp
            }
          
        }   
  }
  `;
  const queryv2 = `
  {
        pairs(first:200,where:{
            createdAtTimestamp_gt:${startFrom},
            reserveETH_gt:${Number(minlp) * 2},
            reserveETH_lt:${Number(maxlp) * 2},
            txCount_gt:${minTx}},
            orderBy: createdAtTimestamp ,
            orderDirection:desc, subgraphError: allow){
          id
          token0{
            id
            symbol
            name
            decimals
          }
          
          token1{
            id
            symbol
            name
            decimals
          }
          totalSupply
          reserveETH
          reserve0
          reserve1
          createdAtTimestamp
          txCount
          mints{
            amount0
            amount1
            timestamp
          }
          swaps(first:1,orderBy:timestamp,orderDirection:asc){
            timestamp
          }
    }
      }
  `;
  const query = gql(version.toString() == 2 ? queryv2 : queryv3);
  const chainId = Number(chain._value);
  const appoloClient = APPOLO(chainId, version);
  let newpool = [];
  try {
    const data0 = await appoloClient.query({
      query: query,
    });
    const pools = data0?.data?.pairs ? data0?.data?.pairs : data0?.data?.pools;
    pools?.map((pool) => {
      newpool.push({
        id: pool.id,
        token0: pool.token0,
        token1: pool.token1,
        totalSupply: pool.totalSupply ? pool.totalSupply : 0,
        reserveETH: pool.reserveETH
          ? Number(pool.reserveETH) / 2
          : pool.totalValueLockedETH,
        txCount: pool.txCount,
        reserve0: pool.reserve0 ? pool.reserve0 : pool.totalValueLockedToken0,
        reserve1: pool.reserve1 ? pool.reserve1 : pool.totalValueLockedToken1,
        createdAtTimestamp: pool.createdAtTimestamp,
        version: version,
        mints: pool.mints,
        firstswaps: pool.swaps[0].timestamp,
      });
    });
  } catch (error) {
    console.error("Error:", error);
  }
  return newpool;
}

async function get_token_price(token_address, pool_address, version) {
  if (version == 3) {
    const query2 = `
    query {
      swaps(first:1, orderDirection:desc,orderBy:timestamp,
        where:{pool:"${pool_address}"}){
          token0 {
            id
            symbol
          }
          token1 {
            id
            symbol
          }
          amount0
          amount1
          amountUSD
      }
    }`;
    const appoloClient = APPOLO(1, version);
    try {
      const data0 = await appoloClient.query({
        query: gql(query2),
      });
      const pool_data = data0.data.swaps[0];
      let value = 0;
      if (pool_data.token0.id == token_address) {
        value = pool_data.amountUSD / pool_data.amount0;
      } else {
        value = pool_data.amountUSD / pool_data.amount1;
      }
      return Math.abs(value);
    } catch (error) {
      console.error("Error:", error);
      return 0;
    }
  } else {
    const query1 = `
    query {
        tokenDayDatas(first:1,orderBy:date,orderDirection:desc,where:{token:"${token_address}"})
        {
            priceUSD
        }
    }        
    `;
    let value = 0;
    try {
      const appoloClient = APPOLO(1, version);
      const data0 = await appoloClient.query({
        query: gql(query1),
      });
      data0?.data?.tokenDayDatas.map((data) => {
        value = Number(data.priceUSD);
      });
    } catch (error) {
      console.error("Error:", error);
    }
    return value;
  }
}

async function get_token_price_eth(token_address, pool_address, version) {
  let valueToken = 0;
  let valueEth = 0;
  const appoloClient = APPOLO(1, version);

  if (version == 3) {
    const query2 = `
    query {
      swaps(first:1, orderDirection:desc,orderBy:timestamp,
        where:{pool:"${pool_address}"}){
          token0 {
            id
            symbol
          }
          token1 {
            id
            symbol
          }
          amount0
          amount1
          amountUSD
      }
    }`;
    try {
      const data0 = await appoloClient.query({
        query: gql(query2),
      });
      const pool_data = data0.data.swaps[0];
      if (pool_data.token0.id.toLowerCase() == token_address.toLowerCase()) {
        valueToken = Number(pool_data.amount1) / Number(pool_data.amount0);
        valueEth = Number(pool_data.amountUSD) / Number(pool_data.amount1);
      } else {
        valueToken = Number(pool_data.amount0) / Number(pool_data.amount1);
        valueEth = Number(pool_data.amountUSD) / Number(pool_data.amount0);
      }

    } catch (error) {
      console.error("Error:", error);
    }
  } else {
    const query2 = `
    query {
      swaps(first:1, orderDirection:desc,orderBy:timestamp,
        where:{pair:"${pool_address}"}){
          pair{
            token0 {
              id
              symbol
            }
            token1 {
              id
              symbol
            }

          }
          amount0In
          amount1In
          amount0Out
          amount1Out
          amountUSD
      }
    }`;
    try {
      const data0 = await appoloClient.query({
        query: gql(query2),
      });
      const pool_data = data0.data.swaps[0];

      if (pool_data.pair.token0.id == token_address) {
        valueToken = (pool_data.amount1In + pool_data.amount1Out) / (pool_data.amount0In + pool_data.amount0Out);
        valueEth = pool_data.amountUSD / (pool_data.amount1In + pool_data.amount1Out);
      } else {
        valueToken = (pool_data.amount0In + pool_data.amount0Out) / (pool_data.amount1In + pool_data.amount1Out);
        valueEth = pool_data.amountUSD / (pool_data.amount0In + pool_data.amount0Out);
      }
    } catch (error) {
      console.log(error);
    }
  }
  return { valueToken: Math.abs(valueToken), valueEth: Math.abs(valueEth) }

}

async function getTotalSupply(tokenAddress) {
  try {
    const abi = ["function totalSupply() view returns (uint256)"];
    const contract = new ethers.Contract(tokenAddress, abi, nodeProvider);
    const totalSupply = await contract.totalSupply();
    return totalSupply.toString();
  } catch (error) {
    console.error("Error:", error);
    return 0;
  }
}

getTotalSupply("0x4691937a7508860f876c9c0a2a617e7d9e945d4b")
// Check erc20 tx count, it should be less than 1
async function checkSwapWallet(targetAddress) {
  try {
    let swaps2 = await getSwaps(targetAddress, 2);
    let swaps3 = await getSwaps(targetAddress, 3);
    let tradeLength = swaps2.length + swaps3.length;

    let swaps = swaps2.concat(swaps3);

    swaps.sort((b, a) => parseInt(a.timestamp) - parseInt(b.timestamp));
    let sellSwaps = swaps.filter(swap => swap.mode === "sell")

    if (sellSwaps.length != 1)
      return false;
    else {
      if (sellSwaps[0] != swaps[0])
        return false;
    }

    let targetBlockNumber = 99999999999; // Replace with your desired block number
    const apiKey = etherscankey;

    const queryParams = new URLSearchParams({
      module: 'account',
      action: 'tokentx',
      address: targetAddress,
      startblock: 0, // Start from the first block
      endblock: targetBlockNumber,
      sort: 'desc',
      apikey: apiKey,
    });
    // const response = await fetch(`${apiUrl}?${queryParams}`);
    const resp = await axios.get(`${apiUrl}?${queryParams}`, { keepAlive: true });
    const data = resp.data;
    const transactions = data.result;
    if (transactions.length != tradeLength) {
      console.log("Transaction length is bigger than 1.")
      return false
    }
    return true;
  } catch (error) {
    console.log("error:", error);
    return false;
  }
}


async function getSwaps(tradeAddress, version) {
  try {
    let currentTimestamp = parseInt(Date.now() / 1000 - 2592000);//1,month tx

    const querySwapV2 = `
      query {
        swaps(
          first:1000,orderBy: pair__id , orderDirection: desc,where:{ from: "${tradeAddress}"}
        ) {
          pair{
            id
            token0 {
              id
            }
            token1 {
                id
            }
          }
          timestamp   
            transaction{
              id
            }
            amount0In,
            amount1In
            amountUSD
        }
      }   
    `;

    const querySwapV3 = `
      query {
        swaps(first:1000,orderBy: pool__id,where:{origin:"${tradeAddress}"}
        ) {
           timestamp
            origin
            pool{
              id
            }
            transaction{
              id
            }
            token0 {
              id
            }
            token1 {
              id
            }
            amount0
            amount1
            amountUSD
        }
      }   
      `;

    const query = gql(version == 2 ? querySwapV2 : querySwapV3);

    const appoloClient = APPOLO(1, version);
    const data0 = await appoloClient.query({
      query: query,
    });
    let swaps = [];
    let newSwaps = [];

    if (data0?.data?.swaps.length > 0) {
      swaps = data0?.data?.swaps;
      for (let i = 0; i < swaps.length; i++) {
        let swap = swaps[i];
        let txId = swap?.transaction?.id;
        let existFlag = newSwaps.some(obj => obj?.transaction?.id === txId);
        if (!existFlag) {
          if (version == 2) {

            if (swap.pair.token0.id.toLowerCase() == weht) {
              swap["mode"] = parseFloat(swap.amount0In) > 0 ? "buy" : "sell";
            } else {
              swap["mode"] = parseFloat(swap.amount0In) > 0 ? "sell" : "buy";
            }
            swap.poolId = swap.pair.id;
          } else {
            if (swap.token0.id.toLowerCase() == weht) {
              swap["mode"] = parseFloat(swap.amount0) > 0 ? "buy" : "sell";
            } else {
              swap["mode"] = parseFloat(swap.amount0) > 0 ? "sell" : "buy";
            }
            swap.poolId = swap.pool.id;
          }
          newSwaps.push(swap);
        }
      }
      return newSwaps;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error:", error);
  }
  return [];
}

async function getTopAddress(lpaddress) {

  try {
    await driver.get(`https://io.dexscreener.com/dex/log/amm/v2/uniswap/top/ethereum/${lpaddress}?q=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`);

    const data = await driver.getPageSource();
    console.log('get-top-address------------------->',data)
    let match;
    let matches = [];
    const regexPattern = /0x[a-fA-F0-9]{40}\b/g;
    while ((match = regexPattern.exec(data)) !== null) {
      matches.push(match[0]);

      if (matches.length === 50) {
        break;
      }
    }
    console.log(matches);
    return matches;
  } catch {
    return [];
  }
}


const getTrading = async (targetAddress) => {
  try {
    let swaps2 = await getSwaps(targetAddress, 2);
    let swaps3 = await getSwaps(targetAddress, 3);
    let swaps = swaps2.concat(swaps3);
    let trades = []
    let trade = {};
    let totalPnl = 0;
    let winCount = 0;
    let loseCount = 0;
    // set fee for swap 10$
    let totalFee = swaps.length * 10;
    trade.pln = 0;
    let initEth = 0;
    let initTimestamp = 9999999999999999;
    for (let i = 0; i < swaps.length; i++) {
      swap = swaps[i];
      // calcuating init eth
      if (initTimestamp > parseInt(swap.timestamp)) {
        initTimestamp = parseInt(swap.timestamp);
        initEth = parseFloat(swap.amountUSD);
      }
      if (trade.currentPair) {
        if (trade.currentPair == swap.poolId) {
          trade.pln += swap.mode === "buy" ? -parseFloat(swap.amountUSD) : parseFloat(swap.amountUSD);
          if (swap.mode === "buy")
            trade.airdrop = false;
        } else {
          if (!trade.airdrop) {
            trades.push(trade);
            totalPnl += trade.pln;
            if (trade.pln > 0) winCount += 1;
            else loseCount += 1;
          }
          trade = {};
          trade.pln = 0;
          trade.currentPair = swap.poolId;
          trade.pln += swap.mode === "buy" ? -parseFloat(swap.amountUSD) : parseFloat(swap.amountUSD);
        }

      } else {
        trade.airdrop = true;
        trade.currentPair = swap.poolId;
        trade.pln += swap.mode === "buy" ? -parseFloat(swap.amountUSD) : parseFloat(swap.amountUSD);
      }

    }
    if (trade.pln) {
      if (!trade.airdrop) {
        totalPnl += trade.pln;
        if (trade.pln > 200) winCount += 1;
        else loseCount += 1;
        trades.push(trade);
      }
    }
    let winRate = (winCount / (winCount + loseCount)) * 100;
    return {
      trades: trades,
      win: winCount,
      lose: loseCount,
      totalPnl: totalPnl - totalFee,
      totalTrades: winCount + loseCount,
      winRate: winRate,
      initEth: initEth
    };
  } catch (error) {
    return {};
  }
}

// getTrading("0x4a7c6899cdcb379e284fbfd045462e751da4c7ce")

const checkMEV = async (trader_address) => {
  try {

    let currentTimestamp = parseInt(Date.now() / 1000 - 2592000);//1,month tx

    const querySwapV2 = `
          query {
              swaps(
                first:1000,orderBy: timestamp, orderDirection: desc,where:{ from:"${trader_address}",timestamp_gt:"${currentTimestamp}"}
              ) {
                  transaction{
                      id
                      swaps{
                          id
                      }
                  }                
               }
          }        
          `;
    const querySwapV3 = `
          query {
              swaps(
                first:1000,orderBy: timestamp, orderDirection: desc,where:{ origin :"${trader_address}",timestamp_gt:"${currentTimestamp}"}
              ) {
                  transaction{
                    id
                    swaps{
                        id
                    }
                  }                
               }
          }        
          `;
    const query2 = gql(querySwapV2);
    const appoloClient = APPOLO(1, 2);
    const data2 = await appoloClient.query({
      query: query2,
    });
    let swap2 = data2?.data?.swaps;

    const query3 = gql(querySwapV3);
    const appoloClient3 = APPOLO(1, 3);
    const data3 = await appoloClient3.query({
      query: query3,
    });
    let swap3 = data3?.data?.swaps;
    const swaps = swap2.concat(swap3);

    if (swaps?.length > 0) {
      let mev = false;
      for (let index = 0; index < swaps.length; index++) {
        if (swaps[index].transaction.swaps.length > 1) {
          mev = true;
          break;
        }
      }
      let txIds = swaps.map(swap => swap.transaction.id);
      let uniqueTxs = new Set(txIds);
      if (uniqueTxs.size !== txIds.length)
        return true;
      return mev;
    } else {
      return false;
    }
  } catch (e) {
    console.log('==================================', e);
    return false;
  }
};

// checkMEV("0x4B042F60e2cE30F136C52a467dCCF59029eEb307")

module.exports = {
  getPool,
  get_token_price,
  get_token_price_eth,
  getTotalSupply,
  getTrading,
  checkMEV,
  checkSwapWallet,
  getTopAddress
};
