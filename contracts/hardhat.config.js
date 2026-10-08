require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const networks = {};
if (process.env.RPC_URL && process.env.PRIVATE_KEY) {
  networks.configured = {
    url: process.env.RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    chainId: Number(process.env.CHAIN_ID || 11155111)
  };
}

module.exports = { solidity: '0.8.24', networks };
