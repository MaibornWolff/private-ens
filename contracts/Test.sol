pragma solidity ^0.5.0;


contract Test {
    uint256 private storedValue = 0;

    function getValue() public view returns (uint256) {
        return storedValue;
    }

    function setValue(uint256 _newValue) public {
        storedValue = _newValue;
    }
}
