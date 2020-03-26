pragma solidity 0.4.25;

import "../SafeMath.sol";
import "./ERC20Detailed.sol";
import "../BernardEscrow.sol";

contract MadoffProfitToken is ERC20Detailed("MadoffProfitToken", "MPT", 2) {

  using SafeMath for uint256;

  mapping (address => uint256) private _balances;

  uint256 private _totalSupply;

  BernardEscrow escrow;

  event Transfer(address indexed from, address indexed to, uint256 value);


  constructor (address _owner) public {
    _mint(_owner, 7000);
    _mint(msg.sender, 3000);
  }

  function updateBernardEscrow(address _address) public {
    require(address(escrow) == 0, "Already set");
    escrow = BernardEscrow(_address);
  }


  /**
    * @dev See {IERC20-totalSupply}.
    */
  function totalSupply() public view returns (uint256) {
      return _totalSupply;
  }

  /**
    * @dev See {IERC20-balanceOf}.
    */
  function balanceOf(address account) public view returns (uint256) {
      return _balances[account];
  }

  /**
    * @dev Transfers token amount.
    * @param recipient Recipient address.
    * @param amount Token amount.
    * @param _loopLimit Limit for loop iteractions.
    */
  function transfer(address recipient, uint256 amount, uint256 _loopLimit) public returns (bool) {
    escrow.withdrawProfitFromToken(msg.sender, _loopLimit);
    escrow.withdrawProfitFromToken(recipient, _loopLimit);

    _transfer(msg.sender, recipient, amount);
  }

  /**
    * @dev Moves tokens `amount` from `sender` to `recipient`.
    *
    * This is internal function is equivalent to {transfer}, and can be used to
    * e.g. implement automatic token fees, slashing mechanisms, etc.
    *
    * Emits a {Transfer} event.
    *
    * Requirements:
    *
    * - `sender` cannot be the zero address.
    * - `recipient` cannot be the zero address.
    * - `sender` must have a balance of at least `amount`.
    */
  function _transfer(address sender, address recipient, uint256 amount) private {
      require(sender != address(0), "Transfer from the zero address");
      require(recipient != address(0), "Transfer to the zero address");

      _balances[sender] = _balances[sender].sub(amount, "Transfer amount exceeds balance");
      _balances[recipient] = _balances[recipient].add(amount);
      emit Transfer(sender, recipient, amount);
  }

  /** @dev Creates `amount` tokens and assigns them to `account`, increasing
    * the total supply.
    *
    * Emits a {Transfer} event with `from` set to the zero address.
    *
    * Requirements
    *
    * - `to` cannot be the zero address.
    */
  function _mint(address account, uint256 amount) private {
      require(account != address(0), "ERC20: mint to the zero address");

      _totalSupply = _totalSupply.add(amount);
      _balances[account] = _balances[account].add(amount);
      emit Transfer(address(0), account, amount);
  }
}
