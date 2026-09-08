import "@nomicfoundation/hardhat-toolbox";

export default {
  solidity: "0.8.20",
  paths: {
    sources: "../contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};
