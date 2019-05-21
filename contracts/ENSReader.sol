pragma solidity ^0.5.0;

import "../contracts/ENS.sol";
import "../contracts/Resolver.sol";


contract ENSReader {
    ENS internal ens;

    constructor(address _ensAddr) public {
        ens = ENS(_ensAddr);
    }

    function abiOf(bytes32 _node, uint256 _contentTypes)
        internal
        view
        returns (uint256, bytes memory)
    {
        Resolver resolver = Resolver(ens.resolver(_node));
        require(resolver.supportsInterface(0x01ffc9a7)); // ResolverBase
        require(resolver.supportsInterface(0x2203ab56)); // ABIResolver
        return resolver.ABI(_node, _contentTypes);
    }

    function addressOf(bytes32 _node) internal view returns (address) {
        Resolver resolver = Resolver(ens.resolver(_node));
        require(resolver.supportsInterface(0x01ffc9a7)); // ResolverBase
        require(resolver.supportsInterface(0x3b3b57de)); // AddrResolver
        return resolver.addr(_node);
    }

    function contenthashOf(bytes32 _node) internal view returns (bytes memory) {
        Resolver resolver = Resolver(ens.resolver(_node));
        require(resolver.supportsInterface(0x01ffc9a7)); // ResolverBase
        require(resolver.supportsInterface(0xbc1c58d1)); // ContentHashResolver
        return resolver.contenthash(_node);
    }

    function interfaceImplementerOf(bytes32 _node, bytes4 _interfaceID)
        internal
        view
        returns (address)
    {
        Resolver resolver = Resolver(ens.resolver(_node));
        require(resolver.supportsInterface(0x01ffc9a7)); // ResolverBase
        require(resolver.supportsInterface(0x01ffc9a7)); // InterfaceResolver
        return resolver.interfaceImplementer(_node, _interfaceID);
    }

    function nameOf(bytes32 _node) internal view returns (string memory) {
        Resolver resolver = Resolver(ens.resolver(_node));
        require(resolver.supportsInterface(0x01ffc9a7)); // ResolverBase
        require(resolver.supportsInterface(0x691f3431)); // NameResolver
        return resolver.name(_node);
    }

    function pubkeyOf(bytes32 _node) internal view returns (bytes32 x, bytes32 y) {
        Resolver resolver = Resolver(ens.resolver(_node));
        require(resolver.supportsInterface(0x01ffc9a7)); // ResolverBase
        require(resolver.supportsInterface(0xc8690233)); // PubkeyResolver
        return resolver.pubkey(_node);
    }

    function textOf(bytes32 _node, string memory _key) internal view returns (string memory) {
        Resolver resolver = Resolver(ens.resolver(_node));
        require(resolver.supportsInterface(0x01ffc9a7)); // ResolverBase
        require(resolver.supportsInterface(0x59d1d43c)); // TextResolver
        return resolver.text(_node, _key);
    }
}
