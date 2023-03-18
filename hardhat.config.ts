import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "@nomiclabs/hardhat-etherscan"

require('dotenv').config({silent: true})

const FAKE_KEY = '1534212400595780128907894565908032193840975895983208948093128444'
const real_accounts = [
  process.env.DEPLOYER_KEY || FAKE_KEY
]

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    localhost: {
      blockGasLimit: 30000000,
      gasPrice: 50000000000,
      gas: 30000000,
      allowUnlimitedContractSize: true
    },
    hardhat: {
      allowUnlimitedContractSize: true
    },
    dogechain: {
      url: "https://rpc.dogechain.dog",
      accounts: real_accounts,
      chainId: 2000,
      blockGasLimit: 50000000000,
      gasPrice: 'auto',
      allowUnlimitedContractSize: true
    },
    "dogechain-testnet": {
      url: "https://rpc-testnet.dogechain.dog",
      accounts: real_accounts,
      chainId: 568,
      blockGasLimit: 50000000000,
      gasPrice: 500000000000,
      allowUnlimitedContractSize: true
    }
  },
  etherscan: {
    apiKey: "48828825-a751-4b2a-956e-7b6f1e10ecff",
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
}

export default config
