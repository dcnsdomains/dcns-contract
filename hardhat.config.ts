import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const real_accounts = [] as string[]

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    localhost: {
      blockGasLimit: 30000000,
      gasPrice: 50000000000,
      gas: 30000000,
    },
    dogechain: {
      url: "https://dogechain.ankr.com",
      accounts: real_accounts,
      chainId: 2000,
      gasPrice: 50000000000,
    },
    "dogechain-testnet": {
      url: "https://rpc-testnet.dogechain.dog",
      accounts: real_accounts,
      chainId: 568,
      gasPrice: 500000000000,
    }
  },
  etherscan: {
    apiKey: {
      dogechain: "",
      'dogechain-testnet': "",
    },
    customChains: [
      {
        network: "dogechain",
        chainId: 2000,
        urls: {
          apiURL: "https://explorer.dogechain.dog/api",
          browserURL: "https://explorer.dogechain.dog/"
        }
      },
      {
        network: "dogechain-testnet",
        chainId: 568,
        urls: {
          apiURL: "https://explorer-testnet.dogechain.dog/api",
          browserURL: "https://explorer-testnet.dogechain.dog/"
        }
      }
    ]
  },
};

export default config;
