// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./Registry.sol";
import "../root/Controllable.sol";
import "../resolver/Resolver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract NameResolver {
    function setName(bytes32 node, string memory newName) external virtual;
}

bytes32 constant lookup = 0x3031323334353637383961626364656600000000000000000000000000000000;

// namehash('addr.reverse')
bytes32 constant ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

contract ReverseRegistrar is Ownable, Controllable {
    Registry public registry;
    NameResolver public defaultResolver;

    event ReverseClaimed(address indexed addr, bytes32 indexed node);
    event DefaultResolverChanged(NameResolver indexed resolver);

    constructor(Registry _registry, NameResolver _resolver) {
        registry = _registry;
        defaultResolver = _resolver;
    }

    modifier authorised(address addr) {
        require(
            addr == msg.sender ||
                controllers[msg.sender] ||
                registry.isApprovedForAll(addr, msg.sender) ||
                ownsContract(addr),
            "ReverseRegistrar: Caller is not a controller or authorised by address or the address itself"
        );
        _;
    }

    function setDefaultResolver(address resolver) public onlyOwner {
        require(address(resolver) != address(0), "ReverseRegistrar: Resolver address must not be 0");
        defaultResolver = NameResolver(resolver);
        emit DefaultResolverChanged(NameResolver(resolver));
    }

    /**
     * @dev Transfers ownership of the reverse DcNS record associated with the calling account.
     * @param owner The address to set as the owner of the reverse record in DcNS.
     * @return The DcNS node hash of the reverse record.
     */
    function claim(address owner) public returns (bytes32) {
        return _claimWithResolver(msg.sender, owner, address(0x0));
    }

    /**
     * @dev Transfers ownership of the reverse DcNS record associated with the calling account.
     * @param addr The reverse record to set
     * @param owner The address to set as the owner of the reverse record in DcNS.
     * @return The DcNS node hash of the reverse record.
     */
    function claimForAddr(address addr, address owner) public authorised(addr) returns (bytes32) {
        return _claimWithResolver(addr, owner, address(0x0));
    }

    /**
     * @dev Transfers ownership of the reverse DcNS record associated with the calling account.
     * @param owner The address to set as the owner of the reverse record in DcNS.
     * @param resolver The address of the resolver to set; 0 to leave unchanged.
     * @return The DcNS node hash of the reverse record.
     */
    function claimWithResolver(address owner, address resolver) public returns (bytes32) {
        return _claimWithResolver(msg.sender, owner, resolver);
    }

    /**
     * @dev Transfers ownership of the reverse DcNS record specified with the address provided
     * @param addr The reverse record to set
     * @param owner The address to set as the owner of the reverse record in DcNS.
     * @param resolver The address of the resolver to set; 0 to leave unchanged.
     * @return The DcNS node hash of the reverse record.
     */
    function claimWithResolverForAddr(address addr, address owner, address resolver) public authorised(addr) returns (bytes32) {
        return _claimWithResolver(addr, owner, resolver);
    }

    /**
     * @dev Sets the `name()` record for the reverse DcNS record associated with the calling account.
     * First updates the resolver to the default reverse resolver if necessary.
     * @param name The name to set for this address.
     * @return The DcNS hash of the reverse record.
     */
    function setName(string memory name) public returns (bytes32) {
        return setNameForAddr(msg.sender, msg.sender, name);
    }

    /**
     * @dev Sets the `name()` record for the reverse DcNS record associated with the account provided.
     * First updates the resolver to the default reverse resolver if necessary.
     * Only callable by controllers and authorised users.
     * @param addr The reverse record to set.
     * @param owner The owner of the reverse node.
     * @param name The name to set for this address.
     * @return The DcNS node hash of the reverse record.
     */
    function setNameForAddr(
        address addr,
        address owner,
        string memory name
    ) public authorised(addr) returns (bytes32) {
        bytes32 _node = _claimWithResolver(
            addr,
            address(this),
            address(defaultResolver)
        );
        defaultResolver.setName(_node, name);
        registry.setSubnodeOwner(ADDR_REVERSE_NODE, sha3HexAddress(addr), owner);
        return _node;
    }

    /**
     * @dev Returns the node hash for a given account's reverse records.
     * @param addr The address to hash
     * @return The DcNS node hash.
     */
    function node(address addr) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr))
            );
    }

    /**
     * @dev An optimised function to compute the sha3 of the lower-case hexadecimal representation of an Ethereum address.
     * @param addr The address to hash.
     * @return ret The SHA3 hash of the lower-case hexadecimal encoding of the input address.
     */
    function sha3HexAddress(address addr) private pure returns (bytes32 ret) {
        assembly {
            for {
                let i := 40
            } gt(i, 0) {

            } {
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
            }

            ret := keccak256(0, 40)
        }
    }

    /* Internal functions */

    function _claimWithResolver(address addr, address owner, address resolver) internal returns (bytes32) {
        bytes32 label = sha3HexAddress(addr);
        bytes32 reverseNode = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, label));
        address currentResolver = registry.resolver(reverseNode);
        bool shouldUpdateResolver = (resolver != address(0x0) && resolver != currentResolver);
        address newResolver = shouldUpdateResolver ? resolver : currentResolver;

        registry.setSubnodeRecord(ADDR_REVERSE_NODE, label, owner, newResolver, 0);

        emit ReverseClaimed(addr, reverseNode);
        
        return reverseNode;
    }

    function ownsContract(address addr) internal view returns (bool) {
        try Ownable(addr).owner() returns (address owner) {
            return owner == msg.sender;
        } catch {
            return false;
        }
    }
}