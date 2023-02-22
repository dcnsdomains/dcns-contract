import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer, BigNumber } from 'ethers'
import { DcNSRegistry, DummyNameWrapper, NamedRegistrar, PriceOracle, PublicResolver, RegistrarController } from '../../typechain-types'
import { sha3, toBN } from 'web3-utils'
const namehash = require('eth-ens-namehash')

const DAYS = 24 * 60 * 60;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('PriceOracle', function () {
  let registry: DcNSRegistry
  let resolver: PublicResolver
  let baseRegistrar: NamedRegistrar
  let controller: RegistrarController
  let priceOracle: PriceOracle
  let nameWrapper: DummyNameWrapper

  let accounts: Signer[]
  let ownerAccount: string
  let someone: string
  const yearInSeconds = 31556951

  before(async function () {
    accounts = await ethers.getSigners()
    ownerAccount = await accounts[0].getAddress()
    someone = await accounts[2].getAddress()

    const DcNSRegistry = await ethers.getContractFactory('DcNSRegistry')
    const PublicResolver = await ethers.getContractFactory('PublicResolver')
    const NamedRegistrar = await ethers.getContractFactory('NamedRegistrar')
    const RegistrarController = await ethers.getContractFactory('RegistrarController')
    const PriceOracle = await ethers.getContractFactory('PriceOracle')
    const DummyNameWrapper = await ethers.getContractFactory('DummyNameWrapper')

    registry = await DcNSRegistry.deploy()
    nameWrapper = await DummyNameWrapper.deploy()
    resolver = await PublicResolver.deploy(registry.address, nameWrapper.address)
    baseRegistrar = await NamedRegistrar.deploy(registry.address, namehash.hash('dc')!, 'dc')
    priceOracle = await PriceOracle.deploy([0, 0, 234496672381308, 58624168095327, 7288410087527])
    controller = await RegistrarController.deploy(baseRegistrar.address, priceOracle.address)

    await registry.connect(accounts[0]).setSubnodeOwner(ZERO_HASH, sha3('dc')!, baseRegistrar.address)
    await baseRegistrar.connect(accounts[0]).addController(controller.address)
    await controller.connect(accounts[0]).setPriceOracle(priceOracle.address)
  })

  it('should not allow other users to call ownable methods', async () => {
    await expect(priceOracle.connect(accounts[2]).setPrices([])).to.be.rejected
  })

  it('should return correct prices', async () => {
    expect(await priceOracle.price('a', yearInSeconds)).to.eq(BigNumber.from('0'))
    expect(await priceOracle.price('aa', yearInSeconds)).to.eq(BigNumber.from('0'))
    expect(await priceOracle.price('aaa', yearInSeconds)).to.eq(BigNumber.from('7399999999999989871908'))
    expect(await priceOracle.price('aaaa', yearInSeconds)).to.eq(BigNumber.from('1849999999999997467977'))
    expect(await priceOracle.price('aaaaa', yearInSeconds)).to.eq(BigNumber.from('229999999999995250177'))
    expect(await priceOracle.price('aaaaaa', yearInSeconds)).to.eq(BigNumber.from('229999999999995250177'))
  })
})