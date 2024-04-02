const { ApolloClient } = require("apollo-boost");
const { fetch } = require("cross-fetch/polyfill");
const { InMemoryCache } = require("apollo-cache-inmemory");
const { createHttpLink } = require("apollo-link-http");

const subgraph = {
  1: {
    2: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev",
    3: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
  },
};
module.exports = {
  weht:"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  tg_api: "6898367964:AAGdLzubQtOAxgeOcW4dcMDVUGorsM97p30",
  chat_id: '-1001983895133', //4085571318,
  // chat_id: -4072982727, //4085571318,
  etherscankey: "TQFRWS7IZAZTZE8XYXKCAI6R17BYISAP2D",
  apiUrl: "https://api.etherscan.io/api",
  providerUrl: "https://eth.getblock.io/7c14aadb-9524-4852-a2c1-5036e1f9c6f4/mainnet/",
  nodeProviderUrl: "https://eth.getblock.io/7c14aadb-9524-4852-a2c1-5036e1f9c6f4/mainnet/",

  APPOLO: (chainId, version) => {
    const defaultOptions = {
      watchQuery: {
        fetchPolicy: "no-cache",
        errorPolicy: "ignore",
      },
      query: {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      },
    };
    return new ApolloClient({
      link: createHttpLink({
        uri: subgraph[chainId][version],
        fetch: fetch,
      }),
      cache: new InMemoryCache(),
      defaultOptions: defaultOptions,
    });
  },
  launchtime: 24,
  minlp: 1,
  maxlp: 100,
  minbuys: 10,
  minsells: 10,
  limitMCap: 500000,
  pnlLimit: 1000,
  trade_ago_days: 60,
  minProfit: 5000,
  winRate: 70,
  minPnl: 3000,
  firstProfit: 2000,
};
