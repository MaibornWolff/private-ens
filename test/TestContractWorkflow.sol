pragma solidity ^0.5;

import "../contracts/ENSReader.sol";

 // These imports are only needed for setup
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Registrar.sol";


// This test only works when the third migration script is not performed (it registers the same
// domain)
contract TestContractWorkflow is ENSReader(DeployedAddresses.ENSRegistry()) {

    bytes32 private node = // namehash('mycontract.example')
        0xb1fb37e96e7338878b6a0c1bbdd3df3ee6f93d0a483d334fb29707ba03085149;

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
    bytes32 private tldNamehash = // 'example'
        0xbb0807b9d6e8c2bb1dc2b84cfacb442a45a0de252e47e1f142f56db08a3327e4;

    string private someData = "This data is stored in the resolver";
    string private key = "key";

    constructor() public {
        Registrar registrar = Registrar(DeployedAddresses.FIFSRegistrar());
        registrar.register(keccak256(abi.encodePacked("mycontract")), address(this));
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
