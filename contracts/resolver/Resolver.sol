// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IAddrResolver.sol";
import "./interfaces/INameResolver.sol";

interface Resolver is IAddrResolver, INameResolver {
    function setAddr(bytes32 node, address addr) external;
    function setName(bytes32 node, string memory _name) external;
}