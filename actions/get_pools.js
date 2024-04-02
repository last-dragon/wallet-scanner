const {
  getPool,
  get_token_price,
  getTotalSupply,
} = require("../utils/subgraph");
const { EvmChain } = require("@moralisweb3/common-evm-utils");
const {
  launchtime,
  minlp,
  maxlp,
  minbuys,
  minsells,
  limitMCap,
} = require("../config/config.js");

async function start_get_pool() {
  console.log("...Starting to get LP address");
  let pools = [];
  const v2_pools = await getPool(
    60 * launchtime * 7,
    minlp,
    maxlp,
    minbuys,
    minsells,
    2,
    Math.floor(Date.now() / 1000),
    EvmChain.ETHEREUM
  );

  pools.push(...v2_pools);

  const v3_pools = await getPool(
    60 * launchtime,
    minlp,
    maxlp,
    minbuys,
    minsells,
    3,
    Math.floor(Date.now() / 1000),
    EvmChain.ETHEREUM
  );

  pools.push(...v3_pools);

  let lp_data = [];

  for (let index = 0; index < pools.length; index++) {
    console.log('Pool Index', index)
    const token_info = await get_token_info(pools[index]);
    console.log(`Checking LP ${pools[index].id} ${index}/${pools.length}`);
    if (token_info.token_mcap > limitMCap) {
      console.log(`Stored LP`);
      lp_data.push(token_info);
    } else {
      console.log(`Failed to pass.`);
    }
  }

  console.log('LPP------>>>>')

  return lp_data;
}

function select_token(pool_data) {
  if (pool_data.token0.id == "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2") {
    return {
      address: pool_data.token1.id,
      symbol: pool_data.token1.symbol,
      name: pool_data.token1.name,
      decimals: pool_data.token1.decimals,
      pool_address: pool_data.id,
      version: pool_data.version,
      istoken0: false
    };
  } else {
    return {
      address: pool_data.token0.id,
      symbol: pool_data.token0.symbol,
      name: pool_data.token0.name,
      decimals: pool_data.token0.decimals,
      pool_address: pool_data.id,
      version: pool_data.version,
      istoken0: true
    };
  }
}

async function get_token_info(pool_data) {
  const token_info = select_token(pool_data);
  const token_price = await get_token_price(
    token_info.address,
    token_info.pool_address,
    token_info.version
  );
  const token_mcap =
    Number(
      (await getTotalSupply(token_info.address)) / 10 ** token_info.decimals
    ) * token_price;
  const final_token_info = {
    ...token_info,
    token_price: token_price,
    token_mcap: token_mcap,
  };
  return final_token_info;
}

module.exports = {
  start_get_pool,
};
