// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../root/Controllable.sol";

contract ERC721Datastore is Controllable {
    struct Record {
        string name;
        bytes32 labelhash;
        bytes32 nodehash;
    }
    mapping(address=>mapping(uint256=>Record)) records;

    event NewName(address indexed addr, uint256 indexed tokenId, string name);
    event NewLabelHash(address indexed addr, uint256 indexed tokenId, bytes32 labelhash);
    event NewNodeHash(address indexed addr, uint256 indexed tokenId, bytes32 nodehash);

    function setRecord(
        address _addr,
        uint256 _tokenId,
        string memory _name,
        bytes32 _labelhash,
        bytes32 _nodehash
    ) external onlyController {
        setName(_addr, _tokenId, _name);
        setLabelHash(_addr, _tokenId, _labelhash);
        setNodeHash(_addr, _tokenId, _nodehash);
    }

    function setName(address _addr, uint256 _tokenId, string memory _name) internal onlyController {
        records[_addr][_tokenId].name = _name;
        emit NewName(_addr, _tokenId, _name);
    }

    function setLabelHash(address _addr, uint256 _tokenId, bytes32 _labelhash) internal onlyController {
        records[_addr][_tokenId].labelhash = _labelhash;
        emit NewLabelHash(_addr, _tokenId, _labelhash);
    }

    function setNodeHash(address _addr, uint256 _tokenId, bytes32 _nodehash) internal onlyController {
        records[_addr][_tokenId].nodehash = _nodehash;
        emit NewNodeHash(_addr, _tokenId, _nodehash);
    }

    function name(address addr, uint256 tokenId) view external returns (string memory) {
        return records[addr][tokenId].name;
    }

    function labelhash(address addr, uint256 tokenId) view external returns (bytes32) {
        return records[addr][tokenId].labelhash;
    }

    function nodehash(address addr, uint256 tokenId) view external returns (bytes32) {
        return records[addr][tokenId].nodehash;
    }
}