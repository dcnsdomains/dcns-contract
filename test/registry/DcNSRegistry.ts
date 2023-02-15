import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer, utils } from "ethers"
import { DcNSRegistry } from "../../typechain-types"
import { sha3 } from 'web3-utils'
import { experimentalAddHardhatNetworkMessageTraceHook } from 'hardhat/config'
const namehash = require('eth-ens-namehash')

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('DcNSRegistry', function () {
  let accounts: Signer[]
  let registry: DcNSRegistry

  beforeEach(async function () {
    accounts = await ethers.getSigners()
    const DcNSRegistry = await ethers.getContractFactory('DcNSRegistry')
    registry = await DcNSRegistry.deploy()
  })

  it('should allow ownership transfers', async () => {
    const addr = '0x0000000000000000000000000000000000001234'
    const transaction = await registry.connect(accounts[0]).setOwner(ZERO_HASH, addr)
    const result = await transaction.wait()

    expect(await registry.owner(ZERO_HASH)).to.equal(addr)
    expect(result.logs.length).to.equal(1)
  })

  it('should allow setting resolvers', async () => {
    const addr = '0x0000000000000000000000000000000000001234'
    const transaction = await registry.connect(accounts[0]).setResolver(ZERO_HASH, addr)
    const result = await transaction.wait()

    expect(await registry.resolver(ZERO_HASH)).to.equal(addr)
    expect(result.logs.length).to.equal(1)
  })

  it('should allow setting the TTL', async () => {
    const transaction = await registry.connect(accounts[0]).setTTL(ZERO_HASH, 3600)
    const result = await transaction.wait()

    expect(await registry.ttl(ZERO_HASH)).to.equal(3600)
    expect(result.logs.length).to.equal(1)
  })

  it('should allow the creation of subnodes', async () => {
    const owner = await accounts[1].getAddress()
    const label = sha3('dc')!
    const transaction = await registry.connect(accounts[0]).setSubnodeOwner(ZERO_HASH, label, owner)
    const result = await transaction.wait()

    expect(await registry.owner(namehash.hash('dc'))).to.equal(owner)

    expect(result.logs.length).to.equal(1)
  })

  it('should allow setting the record', async () => {
    const addr1 = await accounts[1].getAddress()
    const addr2 = await accounts[2].getAddress()
    
    await registry.connect(accounts[0]).setRecord(ZERO_HASH, addr1, addr2, 3600)

    expect(await registry.owner(ZERO_HASH)).to.equal(addr1)
    expect(await registry.resolver(ZERO_HASH)).to.equal(addr2)
    expect(await registry.ttl(ZERO_HASH)).to.equal(3600)
  })

  it('should allow setting subnode records', async () => {
    const addr1 = await accounts[1].getAddress()
    const addr2 = await accounts[2].getAddress()
    const label = sha3('teset')!
    await registry.connect(accounts[0]).setSubnodeRecord(ZERO_HASH, label, addr1, addr2, 3600)

    const hash = namehash.hash('test')
    expect(await registry.owner(hash)).to.equal(addr1)
    expect(await registry.resolver(hash)).to.equal(addr2)
    expect(await registry.ttl(hash)).to.equal(3600)
  })

  it('should implement authorizations/operators', async () => {
    const addr1 = await accounts[1].getAddress()
    const addr2 = await accounts[2].getAddress()
    
    await registry.connect(accounts[0]).setApprovalForAll(addr1, true)
    await registry.connect(accounts[0]).setOwner(ZERO_HASH, addr2)

    expect(await registry.owner(ZERO_HASH)).to.equal(addr2)
  })
})
