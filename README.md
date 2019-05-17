# Deploy and use the Ethereum Name Service on a private chain
The ENS is a set of smart contracts that allow users to assign additional information, in particular human-readable names, to Ethereum addresses (see [the official introduction](https://docs.ens.domains/) for more information about ENS and its uses).

This truffle project serves to facilitate deployment of a complete ENS setup (registry, registrar, and resolver) on a private network. The contracts for the ENS registry and registrar ([@ensdomains/ens](https://github.com/ensdomains/ens)) and the resolver ([@ensdomains/resolver](https://github.com/ensdomains/resolvers)) are fetched from npm. They are deployed and interlinked with a single `truffle migrate`.


## Introduction to the ENS architecture
Before going into the technical details, first a brief recap of ENS its contracts through the lens of the requirements of a private network.

#### Terminology
A 'node' is the output of the [namehash](https://docs.ens.domains/#namehash) of an ENS identifier. It uniquely identifies a complete domain. It is the result of recursive hashing of subdomains until the TLD is reached. For example `namehash("test.eth") = keccak256(namehash("eth"), keccak256("test"))`.

A 'label' is a component of an ENS identifier, e.g. "test" in the previous example. Within contracts this usually refers to the hash of the label, `keccac256(<name>)`. E.g. 'test' can be registered on the 'eth' registrar to receive 'test.eth', the node of which can then be looked up in the registry.



#### ENS Registry
This is the central smart contract which stores records for a node.

```js
struct Record {
    address owner;
    address resolver;
    uint64 ttl;
}
```

The remainder of the functionality of the registry is getters and setters for those values.

``` js
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
The registry contains only basic access control (the deployer may assign domains after which the owners control subdomains). For more control over the domain allocation, a registrar contract can be installed to be the owner of a domain, after which it can distribute subdomains. Until May 2019 the mainnet used an auction-based registrar. On a private net however where there is no need to prevent squatting the 'first in first served' registrar which gives out unused domains to whoever claims them first is sufficient.

Typically the main registrar is set up to own the `'eth'` node and can assign control over subdomains such as `'test.eth'`. Once someone owns a (sub-)domain they are free to deploy another registrar and make that registrar owner of this domain, allowing for custom domain distribution within a subdomain.

```js
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
While the registry only contains ownership information about nodes and a pointer to the resolver, the resolver is the place where detailed information about a node can be stored. A common use-case is to have the resolver store a account address under an ENS identifier, potentially with ABI and other data for contract accounts. Resolvers can implement different schemes of who can modify the stored information. Usually there is either a single owner of the resolver that may modify it, or more user-friendly: the resolver relies on the node ownership information of the registrar.

```js
pragma solidity ^0.5.0;

import "@ensdomains/ens/contracts/ENS.sol";
import "./profiles/ABIResolver.sol";
import "./profiles/AddrResolver.sol";
import "./profiles/ContentHashResolver.sol";
import "./profiles/InterfaceResolver.sol";
import "./profiles/NameResolver.sol";
import "./profiles/PubkeyResolver.sol";
import "./profiles/TextResolver.sol";

/**
 * A simple resolver anyone can use; only allows the owner of a node to set its
 * address.
 */
contract PublicResolver is ABIResolver, AddrResolver, ContentHashResolver, InterfaceResolver, NameResolver, PubkeyResolver, TextResolver {
    ENS ens;

    /**
     * A mapping of authorisations. An address that is authorised for a name
     * may make any changes to the name that the owner could, but may not update
     * the set of authorisations.
     * (node, owner, caller) => isAuthorised
     */
    mapping(bytes32=>mapping(address=>mapping(address=>bool))) public authorisations;

    event AuthorisationChanged(bytes32 indexed node, address indexed owner, address indexed target, bool isAuthorised);

    constructor(ENS _ens) public {
        ens = _ens;
    }

    /**
     * @dev Sets or clears an authorisation.
     * Authorisations are specific to the caller. Any account can set an authorisation
     * for any name, but the authorisation that is checked will be that of the
     * current owner of a name. Thus, transferring a name effectively clears any
     * existing authorisations, and new authorisations can be set in advance of
     * an ownership transfer if desired.
     *
     * @param node The name to change the authorisation on.
     * @param target The address that is to be authorised or deauthorised.
     * @param isAuthorised True if the address should be authorised, or false if it should be deauthorised.
     */
    function setAuthorisation(bytes32 node, address target, bool isAuthorised) external {
        authorisations[node][msg.sender][target] = isAuthorised;
        emit AuthorisationChanged(node, msg.sender, target, isAuthorised);
    }

    function isAuthorised(bytes32 node) internal view returns(bool) {
        address owner = ens.owner(node);
        return owner == msg.sender || authorisations[node][owner][msg.sender];
    }
}
```

```js
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


## ENS deployment
#### Short version
1. `npm install`
2. `npm run copyContracts` to copy the relevant contracts from the contract repos in `node_modules` to the `contracts` folder
3. `npm run deployContracts` to deploy the registry, registrar, and resolver


#### Under the hood
The migration script does the following:
1. Deploy `ENSRegistry`. By default the deployer will own the root node `0x00`
2. Deploy TLD `'eth'` registrar. All label registered here will automatically receive the suffix .eth in the registry resulting in the domain label.eth. The registrar is deployed with parameters:
  - `ensAddr`: Address of the ENSRegistry dpeloyed in step 1
  - `node`: Namehash, for `'eth'` this is `0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae`
3. Set Registrar to be subnode owner of `'eth'` by calling `setSubnodeOwner` in the registry with parameters:
  - `node`: `0x00` (initial root node)
  - `label`: Label of the node that the registrar should be the owner of, for `'eth'` the this is `keccak256('eth')` which is `0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0`.
  - `owner`: Address of the registrar deployed in step 2
4. Deploy the `PublicResolver` which allows owner of domains to set the stored addreess, ABI, etc. The resolver is deployed with the parameter
  - `ens`: address of the registry deployed in step 1. Domain ownership will be looked up there.


## Use
With the basic infrastructure in place, anybody on the network can now register and resolve domains since we used the publicly accessible `FIFSRegistrar` and `PublicResolver`. Say someone has deployed a new contract and wants it and its ABI to be findable under the domain `'test.eth'`. We will go through the whole process from registering a domain to lookup. Code examples of the following steps can also be found in `test\testWorkflow.js` or `test\TestContractWorkflow.sol`.

### Initial Setup
The only thing we need is the address of the registry, registrar, and resolver.

#### Registering a domain with the registrar
A domain such as `'test.eth'` can be registered by calling the registrar's register function with the parameters:
  - `label`: `keccak256('test')` = `0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658`
  - `owner`: Address of an account, probably the sender of the registration transaction

To check whether this worked, the node (`namehash('test.eth')` = `0xeb4f647bea6caa36333c816d7b46fdcb05f9466ecacc140ea8c66faf15b3d9f1`) can be looked up in the registry and should return the owner we set during registration.

#### Setting a resolver in the registry
Now that we own the node `'test.eth'` we can change the resolver by calling the registry's `setResolver(namehash('test.eth'))` with the address of the resolver contract. Note that this can only be done by the owner we set in the previous step. Calling the registry's resolver function with our node should now return the resolver address.

#### Store an address and other data with the resolver
Since we own the `'test.eth'` node we now can call `resolver.setAddr(node, contractAddress)` to store the address with the resolver. Similarly, we can store an ABI, name, etc.


### Lookup
Once `'test.eth'` is properly registered and resolvable, we can look it up based on the name alone in two steps. First we need to look up the resolver which stores the information for this node with `registry.resolver(node)`. Then, we can query the resolver for the address corresponding to our node: `resolver.addr(node)`.




# TODOs
- Library
