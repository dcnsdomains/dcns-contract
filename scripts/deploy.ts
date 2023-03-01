import { ethers, run, network } from "hardhat";
import { sha3 } from 'web3-utils';
const n = require('eth-ens-namehash')
const namehash = n.hash
const utils = ethers.utils;
const labelhash = (label: string) => utils.keccak256(utils.toUtf8Bytes(label))

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function verify(address: string, constructorArguments: any[]){
  console.log(`npx hardhat verify --network ${network.name} ${address} ${constructorArguments.join(' ')}`)
}

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(`Deploying contracts to ${network.name} with the account:${deployer.address}`)

  // DcNSRegistry
  const DcNSRegistry = await ethers.getContractFactory('DcNSRegistry')
  const registry = await DcNSRegistry.deploy()
  await registry.deployTransaction.wait()
  console.log('DcNSRegistry address:', registry.address)

  // PublicResolver
  const PublicResolver = await ethers.getContractFactory('PublicResolver')
  const resolver = await PublicResolver.deploy(registry.address, ZERO_ADDRESS)
  await resolver.deployTransaction.wait()
  console.log('PublicResolver address', resolver.address)

  // NamedRegistrar
  const NamedRegistrar = await ethers.getContractFactory('NamedRegistrar')
  const namedRegistrar = await NamedRegistrar.deploy(registry.address, namehash('dc'), 'dc')
  await namedRegistrar.deployTransaction.wait()
  console.log('NamedRegistrar address', namedRegistrar.address)

  // PriceOracle
  const PriceOracle = await ethers.getContractFactory('PriceOracle')
  const priceOracle = await PriceOracle.deploy([0, 0, 234496672381308, 58624168095327, 7288410087527])
  await priceOracle.deployTransaction.wait()
  console.log('PriceOracle address', priceOracle.address)

  // ReverseRegistrar
  const ReverseRegistrar = await ethers.getContractFactory('ReverseRegistrar')
  const reverseRegistrar = await ReverseRegistrar.deploy(registry.address, resolver.address)
  await reverseRegistrar.deployTransaction.wait()
  console.log('ReverseRegistrar address', reverseRegistrar.address)

  // ERC721Datastore
  const ERC721Datastore = await ethers.getContractFactory('ERC721Datastore')
  const datastore = await ERC721Datastore.deploy()
  await datastore.deployTransaction.wait()
  console.log('ERC721Datastore address', datastore.address)

  // DcRegistrarController
  const DcRegistrarController = await ethers.getContractFactory('DcRegistrarController')
  const dcRegistrarController = await DcRegistrarController.deploy(namedRegistrar.address, priceOracle.address, reverseRegistrar.address, datastore.address)
  await dcRegistrarController.deployTransaction.wait()
  console.log('DcRegistrarController address', dcRegistrarController.address)

  // Verify arugments
  console.log('----- Verify Arguments -----')
  verify(registry.address, [])
  verify(resolver.address, [registry.address, ZERO_ADDRESS])
  verify(namedRegistrar.address, [registry.address, namehash('dc'), 'dc'])
  verify(priceOracle.address, [[0, 0, 234496672381308, 58624168095327, 7288410087527]])
  verify(reverseRegistrar.address, [registry.address, resolver.address])
  verify(datastore.address, [])
  verify(dcRegistrarController.address, [namedRegistrar.address, priceOracle.address, reverseRegistrar.address, datastore.address])

  // Contract settings
  console.log('----- Contract Settings -----')
  await registry.setSubnodeOwner(ZERO_HASH, sha3('dc')!, namedRegistrar.address)
  await namedRegistrar.addController(dcRegistrarController.address)
  await dcRegistrarController.setPriceOracle(priceOracle.address)
  await reverseRegistrar.setController(dcRegistrarController.address, true)
  await registry.setSubnodeOwner(ZERO_HASH, sha3('reverse')!, deployer.address)
  await registry.setSubnodeOwner(namehash('reverse')!, sha3('addr')!, reverseRegistrar.address)
  await datastore.setController(dcRegistrarController.address, true)

  const resolverNode = namehash('resolver')
  const resolverLabel = labelhash('resolver')

  console.log('resolverNode', resolverNode)
  console.log('resolverLabel', resolverLabel)

  await registry.setSubnodeOwner(ZERO_HASH, resolverLabel, deployer.address)
  await registry.setResolver(resolverNode, resolver.address)
  await resolver.setAddr(resolverNode, resolver.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
