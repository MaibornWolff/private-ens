import "./ENS.sol";


contract Resolver {
    function setAddr(bytes32 node, address addr) external;
    function addr(bytes32 node) public view returns (address);
}


contract FIFSRegistrar {
    function register(bytes32 label, address owner) public;
}
