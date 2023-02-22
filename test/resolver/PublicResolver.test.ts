import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { DcNSRegistry, DummyNameWrapper, PublicResolver } from '../../typechain-types'
import { sha3 } from 'web3-utils'
const namehash = require('eth-ens-namehash')

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('PublicResolver', function () {
  let node: string
  let accounts: Signer[]
  let addr0: string
  let addr1: string
  let addr2: string
  let registry: DcNSRegistry
  let resolver: PublicResolver
  let nameWrapper: DummyNameWrapper

  beforeEach(async function () {
    node = namehash.hash('dc')
    accounts = await ethers.getSigners()
    addr0 = await accounts[0].getAddress()
    addr1 = await accounts[1].getAddress()
    addr2 = await accounts[2].getAddress()

    const DcNSRegistry = await ethers.getContractFactory('DcNSRegistry')
    const DummyNameWrapper = await ethers.getContractFactory('DummyNameWrapper')
    const PublicResolver = await ethers.getContractFactory('PublicResolver')

    registry = await DcNSRegistry.deploy()
    nameWrapper = await DummyNameWrapper.deploy()
    resolver = await PublicResolver.deploy(registry.address, nameWrapper.address)

    await registry.connect(accounts[0]).setSubnodeOwner(ZERO_HASH, sha3('dc')!, addr0)
  })

  describe('supportsInterface function', async () => {
    it('supports known interface', async () => {
      expect(await resolver.supportsInterface('0x3b3b57de')).to.true // IAddrResolver
      expect(await resolver.supportsInterface('0x691f3431')).to.true // INameResolver
      expect(await resolver.supportsInterface('0x01ffc9a7')).to.true // IInterfaceResolver
    })

    it('does not support a random interface', async () => {
      expect(await resolver.supportsInterface('0x3b3b57df')).to.false
    })
  })

  describe('addr', async () => {
    it('permits setting address by owner', async () => {
      await resolver.connect(accounts[0]).setAddr(node, addr1)

      expect(await resolver.addr(node)).to.equal(addr1)
    })

    it('can overwrite previously set address', async () => {
      await resolver.connect(accounts[0]).setAddr(node, addr1)
      expect(await resolver.addr(node)).to.equal(addr1)

      await resolver.connect(accounts[0]).setAddr(node, addr0)
      expect(await resolver.addr(node)).to.equal(addr0)
    })

    it('can overwrite to same address', async () => {
      await resolver.connect(accounts[0]).setAddr(node, addr1)
      expect(await resolver.addr(node)).to.equal(addr1)

      await resolver.connect(accounts[0]).setAddr(node, addr1)
      expect(await resolver.addr(node)).to.equal(addr1)
    })

    it('forbids setting new address by non-owners', async () => {
      await expect(resolver.connect(accounts[1]).setAddr(node, addr1)).to.be.rejected
    })

    it('forbids writing same address by non-owners', async () => {
      await resolver.connect(accounts[0]).setAddr(node, addr1)
      await expect(resolver.connect(accounts[1]).setAddr(node, addr1)).to.be.rejected
    })

    it('forbids overwriting existing address by non-owners', async () => {
      await resolver.connect(accounts[0]).setAddr(node, addr1)

      await expect(resolver.connect(accounts[1]).setAddr(node, addr0)).to.be.rejected
    })

    it('returns zero when fetching nonexistent addresses', async () => {
      expect(await resolver.addr(node)).to.equal('0x0000000000000000000000000000000000000000')
    })
  })

  describe('name', async () => {
    it('permits setting name by owner', async () => {
      await resolver.connect(accounts[0]).setName(node, 'name1')
      expect(await resolver.name(node)).to.equal('name1')
    })

    it('can overwirte previously set names', async () => {
      await resolver.connect(accounts[0]).setName(node, 'name1')
      expect(await resolver.name(node)).to.equal('name1')

      await resolver.connect(accounts[0]).setName(node, 'name2')
      expect(await resolver.name(node)).to.equal('name2')
    })

    it('forbids setting name by non-owners', async () => {
      await expect(resolver.connect(accounts[1]).setName(node, 'name2')).to.be.rejected
    })

    it('returns empty when fetching nonexistent name', async () => {
        expect(await resolver.connect(accounts[0]).name(node)).to.equal('')
    })
  })
  
  describe('authorizations', async () => {
    it('permits authorizations to be set', async () => {
      await resolver.connect(accounts[0]).setApprovalForAll(addr1, true)
      expect(await resolver.isApprovedForAll(addr0, addr1)).to.true
    })

    it('permits authorised users to make changes', async () => {
      await resolver.connect(accounts[0]).setApprovalForAll(addr1, true);
      expect(await resolver.isApprovedForAll(await registry.owner(node), addr1)).to.true

      await resolver.connect(accounts[0]).setAddr(node, addr1)
      expect(await resolver.addr(node)).to.equal(addr1)
    })

    it('permits authorisations to be cleared', async () => {
      await resolver.connect(accounts[0]).setApprovalForAll(addr1, false)
      await expect(resolver.connect(accounts[1]).setAddr(node, addr0)).to.be.rejected
    })

    it('permits non-owners to set authorisations', async () => {
      await resolver.connect(accounts[1]).setApprovalForAll(addr2, true)

      // The authorisation should have no effect, because accounts[1] is not the owner.
      await expect(resolver.connect(accounts[2]).setAddr(node, addr0)).to.be.rejected
    })

    it('checks the authorisation for the current owner', async () => {
      await resolver.connect(accounts[1]).setApprovalForAll(addr2, true)
      await registry.connect(accounts[0]).setOwner(node, addr1)

      await resolver.connect(accounts[2]).setAddr(node, addr0)
      expect(await resolver.addr(node)).to.equal(addr0)
    })

    it('reverts if attempting to approve self as an operator', async () => {
      await expect(resolver.connect(accounts[1]).setApprovalForAll(addr1, true)).to.be.rejectedWith('ERC1155: setting approval status for self')
    })
  })
})