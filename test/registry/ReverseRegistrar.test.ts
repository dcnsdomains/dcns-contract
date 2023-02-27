import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { DummyNameWrapper, PublicResolver, Registry, ReverseRegistrar } from "../../typechain-types"
import { getReverseNode } from '../test-utils/reverse'
import { sha3 } from 'web3-utils'

const namehash = require('eth-ens-namehash')
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('ReverseRegistrar', function () {
  let accounts: Signer[]
  let addr1: string
  let addr2: string
  let addr3: string

  let node1: string
  let node2: string
  let node3: string

  let registry: Registry
  let nameWrapper: DummyNameWrapper
  let registrar: ReverseRegistrar
  let resolver: PublicResolver
  let dummyOwnable: ReverseRegistrar
  let dummyOwnableReverseNode: string
  let defaultResolver: PublicResolver

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    addr1 = await accounts[0].getAddress()
    addr2 = await accounts[1].getAddress()
    addr3 = await accounts[2].getAddress()

    node1 = getReverseNode(addr1)
    node2 = getReverseNode(addr2)
    node3 = getReverseNode(addr3)

    const DcNSRegistry = await ethers.getContractFactory('DcNSRegistry')
    registry = await DcNSRegistry.deploy()

    const DummyNameWrapper = await ethers.getContractFactory('DummyNameWrapper')
    nameWrapper = await DummyNameWrapper.deploy()

    const PublicResolver = await ethers.getContractFactory('PublicResolver')
    resolver = await PublicResolver.deploy(
      registry.address,
      nameWrapper.address,
    )

    const ReverseRegistrar = await ethers.getContractFactory('ReverseRegistrar')
    registrar = await ReverseRegistrar.deploy(registry.address, resolver.address)

    await registrar.setDefaultResolver(resolver.address)
    defaultResolver = resolver
    
    const Ownable = await ethers.getContractFactory('ReverseRegistrar')
    dummyOwnable = await Ownable.deploy(registrar.address, resolver.address)
    dummyOwnableReverseNode = getReverseNode(dummyOwnable.address)

    await registry.setSubnodeOwner(ZERO_HASH, sha3('reverse')!, addr1)
    await registry.setSubnodeOwner(namehash.hash('reverse')!, sha3('addr')!, registrar.address)
  })

  it('should calculate node hash correctly', async () => {
    expect(await registrar.node(addr1)).to.eq(node1)
  })

  describe('claim', () => {
    it('allows an account to claim its address', async () => {
      await registrar.connect(accounts[0]).claim(addr2)
      expect(await registry.owner(node1)).to.eq(addr2)
    })
  })

  describe('claimForAddr', () => {
    it('allows an account to claim its address', async () => {
      await registrar.connect(accounts[0]).claimForAddr(addr1, addr2)
      expect(await registry.owner(node1)).to.eq(addr2)
    })

    it('forbids an account to claim another address', async () => {
      await expect(registrar.connect(accounts[0]).claimForAddr(addr2, addr1)).to.be.rejected
    })

    it('allows an authorised account to claim a different address', async () => {
      await registry.connect(accounts[1]).setApprovalForAll(addr1, true)
      await registrar.connect(accounts[0]).claimForAddr(addr2, addr3)
      expect(await registry.owner(node2)).to.eq(addr3)
    })

    it('allows a controller to claim a different address', async () => {
      await registrar.setController(addr1, true)
      await registrar.claimForAddr(addr2, addr3)
      expect(await registry.owner(node2)).to.eq(addr3)
    })

    it('allows an owner() of a contract to claim the reverse node of that contract', async () => {
      await registrar.setController(addr1, true)
      await registrar.claimForAddr(dummyOwnable.address, addr1)
      expect(await registry.owner(dummyOwnableReverseNode)).to.eq(addr1)
    })
  })

  describe('claimWithResolver', () => {
    it('allows an account to specify resolver', async () => {
      await registrar.connect(accounts[0]).claimWithResolver(addr2, addr3)
      expect(await registry.owner(node1)).to.eq(addr2)
      expect(await registry.resolver(node1)).to.eq(addr3)
    })
  })

  describe('setName', () => {
    it('sets name records', async () => {
      await registrar.connect(accounts[0]).setName('testname')
      expect(await registry.resolver(node1)).to.eq(defaultResolver.address)
      expect(await defaultResolver.name(node1)).to.eq('testname')
    })
  })

  describe('setNameForAddr', () => {
    it('allows controller to set name records for other accounts', async () => {
      await registrar.setController(addr1, true)
      await registrar.setNameForAddr(addr2, addr1, 'testname')
      expect(await registry.resolver(node2)).to.eq(resolver.address)
      expect(await resolver.name(node2)).to.eq('testname')
    })

    it('forbids non-controller if address is different from sender and not authorised', async () => {
      await expect(registrar.connect(accounts[0]).setNameForAddr(addr2, addr1, 'testname')).to.be.rejected
    })

    it('allows name to be set for an address if the sender is the address', async () => {
      await registrar.connect(accounts[0]).setNameForAddr(addr1, addr1, 'testname')
      expect(await registry.resolver(node1)).to.eq(resolver.address)
      expect(await resolver.name(node1)).to.eq('testname')
    })

    it('allows name to be set for an address if the sender is authorized', async () => {
      await registry.connect(accounts[0]).setApprovalForAll(addr2, true)
      await registrar.connect(accounts[1]).setNameForAddr(addr1, addr1, 'testname')
      expect(await registry.resolver(node1)).to.eq(resolver.address)
      expect(await resolver.name(node1)).to.eq('testname')
    })

    it('allows an owner() of a contract to claimWithResolverForAddr on behalf of the contract', async () => {
      await registrar.connect(accounts[0]).setNameForAddr(
        dummyOwnable.address,
        addr1,
        'dummyownable.dc'
      )
      expect(await registry.owner(dummyOwnableReverseNode)).to.eq(addr1)
      expect(await resolver.name(dummyOwnableReverseNode)).to.eq('dummyownable.dc')
    })
  })

  describe('setController', () => {
    it('forbid non-owner from setting a controller', async () => {
      await expect(registrar.connect(accounts[1]).setController(addr2, true)).to.be.rejected
    })
  })
})