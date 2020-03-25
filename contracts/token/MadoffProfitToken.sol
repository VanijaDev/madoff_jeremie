pragma solidity 0.4.25;

import "./ERC20.sol";
import "./ERC20Detailed.sol";

contract MadoffProfitToken is ERC20, ERC20Detailed("MadoffProfitToken", "MPT", 2) {
  constructor (address _owner) public {
    _mint(_owner, 70);
    _mint(msg.sender, 30);
  }
}
