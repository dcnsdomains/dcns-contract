import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer, BigNumber } from 'ethers'
import { DcNSRegistry, DummyNameWrapper, NamedRegistrar, PriceOracle, PublicResolver, RegistrarController, ReverseRegistrar } from '../../typechain-types'
import { sha3 } from 'web3-utils'
const namehash = require('eth-ens-namehash')

const DAYS = 24 * 60 * 60;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('RegistrarController', function () {
  let registry: DcNSRegistry
  let resolver: PublicResolver
  let baseRegistrar: NamedRegistrar
  let controller: RegistrarController
  let reverseRegistrar: ReverseRegistrar
  let priceOracle: PriceOracle
  let nameWrapper: DummyNameWrapper

  let accounts: Signer[]
  let ownerAccount: string
  let registrantAccount: string

  before(async function () {
    accounts = await ethers.getSigners()
    ownerAccount = await accounts[0].getAddress()
    registrantAccount = await accounts[1].getAddress()

    const DcNSRegistry = await ethers.getContractFactory('DcNSRegistry')
    const PublicResolver = await ethers.getContractFactory('PublicResolver')
    const NamedRegistrar = await ethers.getContractFactory('NamedRegistrar')
    const RegistrarController = await ethers.getContractFactory('RegistrarController')
    const PriceOracle = await ethers.getContractFactory('PriceOracle')
    const DummyNameWrapper = await ethers.getContractFactory('DummyNameWrapper')
    const ReverseRegistrar = await ethers.getContractFactory('ReverseRegistrar')

    registry = await DcNSRegistry.deploy()
    nameWrapper = await DummyNameWrapper.deploy()
    resolver = await PublicResolver.deploy(registry.address, nameWrapper.address)
    baseRegistrar = await NamedRegistrar.deploy(registry.address, namehash.hash('dc')!, 'dc')
    priceOracle = await PriceOracle.deploy([0, 0, 234496672381308, 58624168095327, 7288410087527])
    reverseRegistrar = await ReverseRegistrar.deploy(registry.address, resolver.address)
    controller = await RegistrarController.deploy(baseRegistrar.address, priceOracle.address, reverseRegistrar.address)

    await registry.setSubnodeOwner(ZERO_HASH, sha3('dc')!, baseRegistrar.address)
    await baseRegistrar.connect(accounts[0]).addController(controller.address)
    await controller.connect(accounts[0]).setPriceOracle(priceOracle.address)
    await reverseRegistrar.connect(accounts[0]).setController(controller.address, true)
    await registry.connect(accounts[0]).setSubnodeOwner(ZERO_HASH, sha3('reverse')!, ownerAccount)
    await registry.connect(accounts[0]).setSubnodeOwner(namehash.hash('reverse')!, sha3('addr')!, reverseRegistrar.address)
  })

  const checkLabels: { [key: string]: boolean } = {
    "testing": true,
    "longname12345678": true,
    "sixsix": true,
    "five5": true,
    "four": true,
    "iii": true,
    "ii": true,
    "i": true,
    "": false,

    // { ni } { hao } { ma } (chinese; simplified)
    "\u4f60\u597d\u5417": true,

    // { ta } { ko } (japanese; hiragana)
    "\u305f\u3053": true,

    // { poop } { poop } { poop } (emoji)
    "\ud83d\udca9\ud83d\udca9\ud83d\udca9": true,

    // { poop } { poop } (emoji)
    "\ud83d\udca9\ud83d\udca9": true,

    // zwj modifier
    "🤼‍♀️": false,
    "7️⃣": false,
    "🏴‍☠️": false,
  }

  it('should report label validity', async () => {
    for (const label in checkLabels) {
      expect(await controller.valid(label)).to.equal(checkLabels[label], label)
    }
  })

  it('should report unused names as available', async () => {
    expect(await controller.available(sha3('available')!)).to.true
  })

  it('should permit new registrations', async () => {
    await controller.connect(accounts[0]).register('newname', registrantAccount, 28 * DAYS, { value: BigNumber.from('30000000000000000000') })
  })

  it('should report registered names as unavailable', async () => {
    expect(await controller.available('newname')).to.false
  })

  it('should permit new registrations with config', async () => {
    await controller.connect(accounts[0]).registerWithConfig('newconfigname', registrantAccount, 28 * DAYS, resolver.address, registrantAccount, { value: BigNumber.from('30000000000000000000') })

    const nodehash = namehash.hash('newconfigname.dc')
    expect(await registry.resolver(nodehash)).to.eq(resolver.address)
    expect(await registry.owner(nodehash)).to.eq(registrantAccount)
    expect(await resolver.addr(nodehash)).to.eq(registrantAccount)
  })

  it('should permit a registration with resolver but not addr', async () => {
    await controller.registerWithConfig("newconfigname2", registrantAccount, 28 * DAYS, resolver.address, ZERO_ADDRESS, { value: BigNumber.from('30000000000000000000') })

    const nodehash = namehash.hash("newconfigname2.dc");
    expect((await registry.resolver(nodehash)), resolver.address);
    expect((await resolver.addr(nodehash)), ZERO_ADDRESS);
  })

  it('should reject duplicate registrations', async () => {
    await expect(controller.register('newname', registrantAccount, 28 * DAYS, { value: BigNumber.from('30000000000000000000') })).to.be.rejected
  })

  it('should allow anyone to renew a name', async () => {
    const expires = await baseRegistrar.nameExpires(sha3('newname')!)
    await controller.renew('newname', 86400, { value: BigNumber.from('30000000000000000000') })
    const newExpires = await baseRegistrar.nameExpires(sha3('newname')!)
    expect(newExpires.toNumber() - expires.toNumber()).to.eq(86400)
  })

  it('should require sufficient value for a renewal', async () => {
    await expect(controller.renew('name', 86400)).to.be.rejected
  })

  it('should allow anyone to withdraw funds and transfer to the registrar owner', async () => {
    expect(await ethers.provider.getBalance(controller.address)).to.not.eq(0)
    await controller.withdraw({ from: ownerAccount })
    expect(await ethers.provider.getBalance(controller.address)).to.eq(0)
  })

  it('forbids withdraw by non-owners', async () => {
    await expect(controller.withdraw({ from: registrantAccount })).to.be.rejected
  })
})