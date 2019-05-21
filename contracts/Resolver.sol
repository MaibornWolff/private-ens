pragma solidity ^0.5.0;

contract Resolver {
    function setABI(bytes32 node, uint256 contentType, bytes calldata data) external;
    function ABI(bytes32 node, uint256 contentTypes) external view returns (uint256, bytes memory);

    function setAddr(bytes32 node, address addr) external;
    function addr(bytes32 node) public view returns (address);

    function setContenthash(bytes32 node, bytes calldata hash) external;
    function contenthash(bytes32 node) external view returns (bytes memory);

    function setInterface(bytes32 node, bytes4 interfaceID, address implementer) external;
    function interfaceImplementer(bytes32 node, bytes4 interfaceID) external view returns (address);

    function setName(bytes32 node, string calldata name) external;
    function name(bytes32 node) external view returns (string memory);

    function setPubkey(bytes32 node, bytes32 x, bytes32 y) external;
    function pubkey(bytes32 node) external view returns (bytes32 x, bytes32 y);

    function setText(bytes32 node, string calldata key, string calldata value) external;
    function text(bytes32 node, string calldata key) external view returns (string memory);

    function setAuthorisation(bytes32 node, address target, bool isAuthorised) external;
    function supportsInterface(bytes4 interfaceID) public pure returns(bool);
}
