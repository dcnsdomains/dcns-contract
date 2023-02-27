const namehash = require('eth-ens-namehash')

export function getReverseNode(addr: string): string {
  return namehash.hash(addr.slice(2).toLowerCase() + '.addr.reverse')
}