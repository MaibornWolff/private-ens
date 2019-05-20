pragma solidity ^0.5;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";

import "../contracts/ENSInfrastructureInterface.sol";


contract TestContractWorkflow {
    ENS private ens;
    FIFSRegistrar private registrar;
    Resolver private resolver;

    bytes32 private node = // namehash('test.eth')
        0xeb4f647bea6caa36333c816d7b46fdcb05f9466ecacc140ea8c66faf15b3d9f1;

    bytes32 private tldNamehash = // namehash('eth')
        0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;

    constructor() public {
        ens = ENS(DeployedAddresses.ENSRegistry());
        registrar = FIFSRegistrar(DeployedAddresses.FIFSRegistrar());
        resolver = Resolver(DeployedAddresses.PublicResolver());
        registerAndStoreAddress();
    }

    function testSetup() public {
        Assert.equal(
            ens.owner(tldNamehash),
            address(registrar),
            "Owner of eth is the registrar"
        );

        Assert.equal(
            ens.owner(node),
            address(this),
            "Owner of registered domain is this contract"
        );

        Assert.equal(
            ens.resolver(node),
            address(resolver),
            "Resolver for the test.eth node is set in registry"
        );

        Assert.equal(
            resolver.addr(node),
            address(this),
            "Resolver should point to this"
        );
    }

    function testLookup() public {
        Assert.equal(
            lookup(node),
            address(this),
            "Lookup returns this address"
        );
    }

    function labelOf(string memory _name) private returns (bytes32) {
        return keccak256(abi.encodePacked(_name));
    }

    function registerAndStoreAddress() private {
        registrar.register(labelOf("test"), address(this));
        ens.setResolver(node, address(resolver));

        require(resolver.supportsInterface(0x2203ab56));
        require(resolver.supportsInterface(0x3b3b57de));
        require(resolver.supportsInterface(0xbc1c58d1));
        require(resolver.supportsInterface(0x01ffc9a7));
        require(resolver.supportsInterface(0x691f3431));

        resolver.setAddr(node, address(this));
    }

    function lookup(bytes32 _node) private returns (address) {
        return Resolver(ens.resolver(_node)).addr(_node);
    }
}
