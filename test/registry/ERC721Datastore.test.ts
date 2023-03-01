import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer, BigNumber } from 'ethers'
import { sha3 } from 'web3-utils'
import { ERC721Datastore } from '../../typechain-types'
const namehash = require('eth-ens-namehash')

describe('ERC721Datastore', function () {
  let accounts: Signer[]
  let datastore: ERC721Datastore

  beforeEach(async function () {
    accounts = await ethers.getSigners()

    const ERC721Datastore = await ethers.getContractFactory('ERC721Datastore')
    datastore = await ERC721Datastore.deploy()
  })

  async function setRecord() {
    const name = 'newname'
    const labelhash = sha3(name)!
    const tokenId = BigNumber.from(labelhash)
    const nodehash = namehash.hash(name + '.dc')
    return datastore.setRecord(datastore.address, tokenId, name, labelhash, nodehash)
  }

  it('allows controller to set record', async () => {
    const ownerAccount = await accounts[0].getAddress()
    await datastore.setController(ownerAccount, true)
    await expect(setRecord())
      .to
      .emit(datastore, 'NewName')
      .emit(datastore, 'NewLabelHash')
      .emit(datastore, 'NewNodeHash')
  })

  it('forbids non-controller to set record', async () => {
    await expect(setRecord()).to.be.rejected
  })
})