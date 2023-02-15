import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { DcNSRegistry, NamedRegistrar } from '../../typechain-types'
import { sha3, toBN } from 'web3-utils'
const namehash = require('eth-ens-namehash')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('NamedRegistrar', function () {
  let accounts: Signer[]
  let ownerAccount: string
	let controllerAccount: string
	let registrantAccount: string
	let otherAccount: string

  let registry: DcNSRegistry
  let registrar: NamedRegistrar

  before(async function () {
    accounts = await ethers.getSigners()
    ownerAccount = await accounts[0].getAddress()
    controllerAccount = await accounts[1].getAddress()
    registrantAccount = await accounts[2].getAddress()
    otherAccount = await accounts[3].getAddress()

    const DcNSRegistry = await ethers.getContractFactory('DcNSRegistry')
    const NamedRegistrar = await ethers.getContractFactory('NamedRegistrar')

    registry = await DcNSRegistry.deploy()
    registrar = await NamedRegistrar.deploy(registry.address, namehash.hash('dc')!, 'dc')

    await registrar.connect(accounts[0]).addController(controllerAccount)
    await registry.setSubnodeOwner(ZERO_HASH, sha3('dc')!, registrar.address)
  })

  it('should allow new registrations', async () => {
    await registrar.connect(accounts[1]).register(sha3('new')!, registrantAccount, 86400)

    expect(await registry.owner(namehash.hash('new.dc'))).to.equal(registrantAccount)
    expect(await registrar.ownerOf(sha3('new')!)).to.equal(registrantAccount)
  })

  it('should allow registrations without updating the registry', async () => {
    await registrar.connect(accounts[1]).registerOnly(sha3('silent')!, registrantAccount, 86400)

    expect(await registry.owner(namehash.hash('silent.dc'))).to.equal(ZERO_ADDRESS)
    expect(await registrar.ownerOf(sha3('silent')!)).to.equal(registrantAccount)
  })

  it('should allow renewals', async () => {
    const id = sha3('new')!
    const oldExpires = await registrar.nameExpires(id)
    await registrar.connect(accounts[1]).renew(id, 86400)
    expect((await registrar.nameExpires(id)).toNumber()).to.equal(oldExpires.add(86400).toNumber())
  })

  it('should only allow the controller to register', async () => {
    await expect(registrar.connect(accounts[3]).register(sha3('foo')!, otherAccount, 86400)).to.be.rejected
	})

  it('should only allow the controller to renew', async () => {
    await expect(registrar.connect(accounts[3]).renew(sha3('new')!, 86400)).to.be.rejected
	})

  it('should not permit registration of already registered names', async () => {
    const id = sha3('new')!
    await expect(registrar.connect(accounts[1]).register(id, otherAccount, 86400)).to.be.rejected
    expect(await registrar.ownerOf(id)).to.equal(registrantAccount)
	})

  it('should not permit renewing a name that is not registered', async () => {
    await expect(registrar.connect(accounts[1]).renew(sha3('name3')!, 86400)).to.be.rejected
	})

  it('should permit the owner to reclaim a name', async () => {
    await registry.setSubnodeOwner(ZERO_HASH, sha3('dc')!, ownerAccount)
    await registry.setSubnodeOwner(namehash.hash('dc'), sha3('new')!, ZERO_ADDRESS)
    expect(await registry.owner(namehash.hash('new.dc'))).to.equal(ZERO_ADDRESS)

    await registry.setSubnodeOwner(ZERO_HASH, sha3('dc')!, registrar.address)
    await registrar.connect(accounts[2]).reclaim(sha3('new')!, registrantAccount)
    expect(await registry.owner(namehash.hash('new.dc'))).to.equal(registrantAccount)
	})

  it('should prohibit anyone else from reclaiming a name', async () => {
    await expect(registrar.connect(accounts[3]).reclaim(sha3('new')!, registrantAccount)).to.be.rejected
	})

  it('should permit the owner to transfer a registration', async () => {
    await registrar.connect(accounts[2]).transferFrom(registrantAccount, otherAccount, sha3('new')!)
    expect(await registrar.ownerOf(sha3('new')!)).to.equal(otherAccount)

    // Transfer does not update ENS without a call to reclaim.
    expect(await registry.owner(namehash.hash('new.dc'))).to.equal(registrantAccount)
    await registrar.connect(accounts[3]).transferFrom(otherAccount, registrantAccount, sha3('new')!)
	})

  it('should prohibit anyone else from transferring a registration', async () => {
    await expect(registrar.connect(accounts[3]).transferFrom(otherAccount, otherAccount, sha3('new')!)).to.be.rejected
	})

  it('should allow renewal during the grace period', async () => {
		await registrar.connect(accounts[1]).renew(sha3("new")!, 86400)
	})

  it('should allow the owner to set a resolver address', async () => {
		await registrar.connect(accounts[0]).setResolver(controllerAccount)
    expect(await registry.resolver(namehash.hash('dc')), controllerAccount)
	})
})