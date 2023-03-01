// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./PriceOracle.sol";

interface IRegistrarController {
    event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint cost, uint expires);
    event NameRenewed(string name, bytes32 indexed label, uint cost, uint expires);
    event NewPriceOracle(address indexed oracle);

    function rentPrice(string memory name, uint duration) external view returns (uint);
    function valid(string memory name) external view returns (bool);
    function available(string memory name) external view returns (bool);
    function register(string calldata name, address owner, uint duration) external payable;
    function registerWithConfig(string memory name, address owner, uint duration, address resolver, address addr) external payable;
    function renew(string calldata name, uint duration) external payable;
    function setPriceOracle(PriceOracle _prices) external;
    function withdraw() external;
}