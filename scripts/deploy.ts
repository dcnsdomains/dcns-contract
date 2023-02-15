import { ethers, run, network } from "hardhat";
const n = require('eth-ens-namehash')
const namehash = n.hash
const utils = ethers.utils;
const labelhash = (label: string) => utils.keccak256(utils.toUtf8Bytes(label))

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function verify(address: string, constructorArguments: string[]) {
  console.log(`verify ${address} with arguments ${constructorArguments.join(',')}`)
  await run('verify', {
    address,
    constructorArguments
  })
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

  const resolverNode = namehash('resolver')
  const resolverLabel = labelhash('resolver')

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
  const priceOracle = await PriceOracle.deploy([7400, 1850, 230])
  await priceOracle.deployTransaction.wait()
  console.log('PriceOracle address', priceOracle.address)

  // RegistrarController
  const RegistrarController = await ethers.getContractFactory('RegistrarController')
  const registrarController = await RegistrarController.deploy(namedRegistrar.address, priceOracle.address)
  await registrarController.deployTransaction.wait()
  console.log('RegistrarController address', registrarController.address)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
