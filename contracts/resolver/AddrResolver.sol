// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ResolverBase.sol";
import "./interfaces/IAddrResolver.sol";

abstract contract AddrResolver is IAddrResolver, ResolverBase {
    mapping(bytes32=>address) _addresses;

    /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param _address The address to set.
     */
    function setAddr(bytes32 node, address _address) virtual external authorised(node) {
        emit AddrChanged(node, _address);
        _addresses[node] = _address;
    }

    function addr(bytes32 node) virtual override external view returns (address) {
        return _addresses[node];
    }

    function supportsInterface(bytes4 interfaceID) virtual override public pure returns(bool) {
        return interfaceID == type(IAddrResolver).interfaceId || super.supportsInterface(interfaceID);
    }
}
