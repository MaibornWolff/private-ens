# Deploy and use ENS on a private chain
The ENS system consists of a set of smart contracts that govern the mapping of ENS domain to address, how the domains are distributed, access control over the data stored under a domain, as well as the lookup of information based on a domain. This repo provides a unified way of deploying a complete ENS setup (registry, registrar, and resolver) with usage examples. The contracts for the ENS registry and registrar ([@ensdomains/ens](https://github.com/ensdomains/ens)) and the resolver ([@ensdomains/resolver](https://github.com/ensdomains/resolvers)) are fetched from npm and can be deployed and linked together with a single 'truffle migrate'.



## Short introduction to the inner workings of ENS
In addition to the info below code examples can be found in the migration and test scripts.

#### Terminology
A 'node' is the [namehash](https://docs.ens.domains/#namehash) of the full domain, which is the result of recursive hashing of subdomains until the TLD is reached. For example `namehash("test.eth") = keccak256(namehash("eth"), keccak256("test"))`.

A 'label' is the `keccac256(<name>)` and identifies what is to be registered. E.g. the label for 'test' can be registered on the 'eth' registrar to receive 'test.eth', the namehash of which can then be looked up in the registry.



#### ENS Registry
This smart contract where the mapping of domain name to ownership record is stored. The key of this domain (e.g. 'test.eth') is the namehash. The value of this mapping stores the owner of this domain, the resolver, and a time limit.
```C
struct Record {
    address owner;
    address resolver;
    uint64 ttl;
}
```

The remainder of the functionality of the registry is getters and setters for those values.

```c
pragma solidity >=0.4.24;

interface ENS {

    // Logged when the owner of a node assigns a new owner to a subnode.
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);

    // Logged when the owner of a node transfers ownership to a new account.
    event Transfer(bytes32 indexed node, address owner);

    // Logged when the resolver for a node changes.
    event NewResolver(bytes32 indexed node, address resolver);

    // Logged when the TTL of a node changes
    event NewTTL(bytes32 indexed node, uint64 ttl);


    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external;
    function setResolver(bytes32 node, address resolver) external;
    function setOwner(bytes32 node, address owner) external;
    function setTTL(bytes32 node, uint64 ttl) external;
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function ttl(bytes32 node) external view returns (uint64);
}
```

#### Registrar
The registry contains only basic access control (the deployer may assign domains after which the owners control subdomains). For users to be able to claim domains on their own a registrar can be deployed. A registrar can be set up to hand out subdomains for a fixed domain. Typically the main registrar is set up to own the 'eth' node and can assign control over e.g. 'test.eth' domains. Once someone owns a (sub-)domain they are free to deploy another registrar and make that registrar owner of theis domain, allowing for custom domain distribution within a subdomain.

Registrars can assign ownership to subdomains in any way they choose. Until May 4th 2019 the mainnet used an auction-based HashRegistrar. One of the simplest registrars is the 'first in first served' registrar which gives out unused domains to whoever claims them first.


```c
pragma solidity ^0.5.0;

import "./ENS.sol";

/**
 * A registrar that allocates subdomains to the first person to claim them.
 */
contract FIFSRegistrar {
    ENS ens;
    bytes32 rootNode;

    modifier only_owner(bytes32 label) {
        address currentOwner = ens.owner(keccak256(abi.encodePacked(rootNode, label)));
        require(currentOwner == address(0x0) || currentOwner == msg.sender);
        _;
    }

    /**
     * Constructor.
     * @param ensAddr The address of the ENS registry.
     * @param node The node that this registrar administers.
     */
    constructor(ENS ensAddr, bytes32 node) public {
        ens = ensAddr;
        rootNode = node;
    }

    /**
     * Register a name, or change the owner of an existing registration.
     * @param label The hash of the label to register.
     * @param owner The address of the new owner.
     */
    function register(bytes32 label, address owner) public only_owner(label) {
        ens.setSubnodeOwner(rootNode, label, owner);
    }
}
```

#### Resolver
While the registry only contains ownership information about domains and a pointer to the resolver, the resolver is the place where detailed information about a domain can be stored. A common use-case is to have the resolver store the address of a contract that should be reachable under a domain as well as additional information such as the contract ABI. Resolvers can implement different schemes of who can modify the stored information. Usually there is either a single owner of the resolver that may modify it, or more user-friendly: the resolver relies on the node ownership information of the registrar. In addition, resolvers can extend specialized resolvers that store a mapping with specific information such as the address with getters and setters:

```c
pragma solidity ^0.5.0;

import "../ResolverBase.sol";

contract AddrResolver is ResolverBase {
    bytes4 constant private ADDR_INTERFACE_ID = 0x3b3b57de;

    event AddrChanged(bytes32 indexed node, address a);

    mapping(bytes32=>address) addresses;

    /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param addr The address to set.
     */
    function setAddr(bytes32 node, address addr) external authorised(node) {
        addresses[node] = addr;
        emit AddrChanged(node, addr);
    }

    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated address.
     */
    function addr(bytes32 node) public view returns (address) {
        return addresses[node];
    }

    function supportsInterface(bytes4 interfaceID) public pure returns(bool) {
        return interfaceID == ADDR_INTERFACE_ID || super.supportsInterface(interfaceID);
    }
}
```


## Setup
#### Short version
1. 'npm install'
2. 'npm run copyContracts' to copy the relevant contracts from the contract repos in 'node_modules' to the 'contracts' folder
3. 'npm run deployContracts' to deploy the registry, registrar, and resolver


#### Under the hood
The migration script does the following:
1. Deploy ENSRegistry. By default the deployer will own the root node '0x0'
2. Deploy TLD 'eth' registrar. All label registered here will automatically receive the suffix .eth in the registry resulting in the domain label.eth. The registrar is deployed with parameters:
  - ensAddr: Address of the ENSRegistry dpeloyed in step 1
  - node: Namehash, for 'eth' this is '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae'
3. Set Registrar to be subnode owner of 'eth' by calling setSubnodeOwner in the registry with parameters:
  - node: 0x00 (initial root node)
  - label: Label of the node that the registrar should be the owner of, for 'eth' the this is keccak256('eth') = 0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0.
  - owner: Address of the registrar deployed in step 2
4.


## Use
### Registration
A domain such as 'test.eth' can be registered by calling the registrar's register function with the parameters:
  - label: keccak(hex('test')) = 0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658
  - owner: Address of an account

Calling the ENSRegistry's owner function with namehash('test.eth') (0xeb4f647bea6caa36333c816d7b46fdcb05f9466ecacc140ea8c66faf15b3d9f1) will return the address of the owner.

### Setting a resolver
The owner of a node (e.g. 'test.eth') can change the resolver by calling setResolver with the node as a parameter (e.g. namehash('test.eth')).


# TODOs
- Tests for the registry and registrar
- Include resolver can be found [here](https://github.com/ensdomains/resolvers) on github.
