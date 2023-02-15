// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../registry/Registry.sol";
import "./AddrResolver.sol";
import "./NameResolver.sol";

interface INameWrapper {
    function ownerOf(uint256 id) external view returns (address);
}

contract PublicResolver is AddrResolver, NameResolver {
    Registry registry;
    INameWrapper nameWrapper;

    /**
     * A mapping of operators. An address that is authorised for an address
     * may make any changes to the name that the owner could, but may not update
     * the set of authorisations.
     * (owner, operator) => approved
     */
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Logged when an operator is added or removed.
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    constructor(Registry _registry, INameWrapper wrapperAddress){
        registry = _registry;
        nameWrapper = wrapperAddress;
    }

    /**
     * @dev See {IERC1155-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) external{
        require(
            msg.sender != operator,
            "ERC1155: setting approval status for self"
        );

        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isAuthorised(bytes32 node) internal override view returns(bool) {
        address owner = registry.owner(node);
        if(owner == address(nameWrapper) ){
            owner = nameWrapper.ownerOf(uint256(node));
        }
        return owner == msg.sender || isApprovedForAll(owner, msg.sender);
    }

    /**
     * @dev See {IERC1155-isApprovedForAll}.
     */
    function isApprovedForAll(address account, address operator) public view returns (bool){
        return _operatorApprovals[account][operator];
    }

    function supportsInterface(bytes4 interfaceID) public override(AddrResolver, NameResolver) pure returns(bool) {
        return interfaceID == type(AddrResolver).interfaceId || interfaceID == type(NameResolver).interfaceId || super.supportsInterface(interfaceID);
    }
}