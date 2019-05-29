pragma solidity ^0.5;

import "../contracts/ENSReader.sol";

 // These imports are only needed for setup
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Registrar.sol";


// This test only works when the third migration script is not performed
contract TestContractWorkflow is ENSReader(DeployedAddresses.ENSRegistry()) {

    bytes32 private node = // namehash('test.eth')
        0xeb4f647bea6caa36333c816d7b46fdcb05f9466ecacc140ea8c66faf15b3d9f1;

    function testAddressLookup() public {
        address resolverAddrForNode = addressOf(node);
        Assert.equal(resolverAddrForNode, address(this), "Address lookup returns stored address");
    }

    function testTextLookup() public {
        string memory resolverTextForNode = textOf(node, key);
        Assert.equal(resolverTextForNode, someData, "Text lookup returns stored data");
    }

    //
    // Everything below here is just setup, registering the name, and storing information
    //
    bytes32 private tldNamehash = // namehash('eth')
        0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;

    string private someData = "This data is stored in the resolver";
    string private key = "key";

    constructor() public {
        Registrar registrar = Registrar(DeployedAddresses.FIFSRegistrar());
        registrar.register(keccak256(abi.encodePacked("test")), address(this));
        ens.setResolver(node, DeployedAddresses.PublicResolver());
        Resolver(DeployedAddresses.PublicResolver()).setAddr(node, address(this));
        Resolver(DeployedAddresses.PublicResolver()).setText(node, key, someData);
    }

    function testSetup() public {
        Assert.equal(
            ens.owner(tldNamehash),
            DeployedAddresses.FIFSRegistrar(),
            "Owner of eth is the registrar"
        );
        Assert.equal(
            ens.owner(node),
            address(this),
            "Owner of registered domain is this contract"
        );
        Assert.equal(
            ens.resolver(node),
            DeployedAddresses.PublicResolver(),
            "Resolver for the test.eth node is set in registry"
        );
    }

}
