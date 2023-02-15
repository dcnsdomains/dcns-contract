import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer, utils } from "ethers";
import { DcNSRegistry } from "../../typechain-types";

describe('DcNSRegistry', function () {
  let accounts: Signer[]
  let registry: DcNSRegistry

  beforeEach(async function () {
    accounts = await ethers.getSigners()
    const DcNSRegistry = await ethers.getContractFactory('DcNSRegistry')
    registry = await DcNSRegistry.deploy()
  })
})
