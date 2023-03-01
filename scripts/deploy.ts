import { ethers, run, network } from "hardhat";
const n = require('eth-ens-namehash')
const namehash = n.hash
const utils = ethers.utils;
const labelhash = (label: string) => utils.keccak256(utils.toUtf8Bytes(label))

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

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

  const resolverNode = namehash('resolver')
  const resolverLabel = labelhash('resolver')

  console.log('resolverNode: ', resolverNode)
  console.log('resolverLabel: ', resolverLabel)

  await registry.setSubnodeOwner(ZERO_HASH, resolverLabel, deployer.address)
  await registry.setResolver(resolverNode, resolver.address)
  await resolver.setAddr(resolverNode, resolver.address)

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

  // DcRegistrarController
  const DcRegistrarController = await ethers.getContractFactory('DcRegistrarController')
  const DcRegistrarController = await DcRegistrarController.deploy(namedRegistrar.address, priceOracle.address)
  await DcRegistrarController.deployTransaction.wait()
  console.log('DcRegistrarController address', DcRegistrarController.address)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});