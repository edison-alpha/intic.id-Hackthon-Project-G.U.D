require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1  // Minimize deployment size (smaller bytecode)
          },
          viaIR: true,  // Use IR-based code generator for better optimization
          evmVersion: "paris"  // Use Paris EVM version for better compatibility
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true,
          evmVersion: "paris"
        }
      },
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true,
          evmVersion: "paris"
        }
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true
    },
    pushTestnet: {
      url: process.env.PUSH_TESTNET_RPC || "https://evm.rpc-testnet-donut-node1.push.org/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42101
    }
  },
  etherscan: {
    apiKey: {
      pushTestnet: process.env.PUSH_API_KEY || "dummy"
    },
    customChains: [
      {
        network: "pushTestnet",
        chainId: 42101,
        urls: {
          apiURL: "https://donut.push.network/api",
          browserURL: "https://donut.push.network"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
