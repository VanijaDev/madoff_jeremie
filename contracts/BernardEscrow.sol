pragma solidity 0.4.25;

import "./token/BernardsCutToken.sol";
import "./SafeMath.sol";


contract BernardEscrow {
  using SafeMath for uint256;

  BernardsCutToken public token;

//   uint256 public constant CALCULATION_DISABLED_BLOCKS = 21600; //  used to avoid spam
  uint256 public constant CALCULATION_DISABLED_BLOCKS = 5;   // TODO: testing
  
  uint256 public prevCalculationBlock;
  uint256 public tokenFractionProfitCalculatedTimes;
  uint256 public ongoingBernardFee;

  mapping (uint256 => uint256) public tokenFractionProfitForCalculatedIdx;
  mapping (address => uint256) public profitWithdrawnOnCalculationIdx;

  event BernardFeeWithdrawn(address by, uint256 amount);

  //  MODIFIERS
  modifier onlyCalculationEnabled() {
    require(block.number.sub(prevCalculationBlock) >= CALCULATION_DISABLED_BLOCKS, "Calculation disabled");
    _;
  }

  modifier onlyTokenHolder() {
    require(token.balanceOf(msg.sender) > 0, "Not token holder");
    _;
  }

  modifier onlyToken() {
    require(msg.sender == address(token), "Not BCT");
    _;
  }

  /**
   * @dev Constructor.
   * @param _token Token address.
   * TESTED
   */
  constructor (address _token) public {
    token = BernardsCutToken(_token);

    tokenFractionProfitCalculatedTimes = 1;  //  idx 0 can not be used
  }

  /**
   * @dev Calculates token fraction profit.
   * TESTED
   */
  function calculateTokenFractionProfit() public onlyTokenOwner onlyCalculationEnabled {
    require(ongoingBernardFee >= 0.1 szabo, "Not enough Bernardcut"); //  TODO: change from ether to TRX
    uint256 fractionProfit = ongoingBernardFee.div(10000);
   
    tokenFractionProfitForCalculatedIdx[tokenFractionProfitCalculatedTimes] = fractionProfit;
    
    tokenFractionProfitCalculatedTimes = tokenFractionProfitCalculatedTimes.add(1);
    prevCalculationBlock = block.number;
    delete ongoingBernardFee;
  }
  
  /**
   * @dev Gets pending profit in BernardCut for sender.
   * @param _loopLimit  Limit of loops.
   * @return Profit amount.
   * TESTED
   */
  function pendingProfitInBernardCut(uint256 _loopLimit) public view returns(uint256 profit) {
    profit = _pendingProfit(msg.sender, _loopLimit);
  }
  
  /**
   * @dev Gets pending profit in BernardCut for address.
   * @param recipient  Recipient address.
   * @param _loopLimit  Limit of loops.
   * @return Profit amount.
   * TESTED
   */
  function _pendingProfit(address recipient, uint256 _loopLimit) private view returns(uint256 profit) {
    uint256 startIdx = profitWithdrawnOnCalculationIdx[recipient].add(1);
    
    if(startIdx >= tokenFractionProfitCalculatedTimes) {
        return;
    }
  
    uint256 endIdx = (tokenFractionProfitCalculatedTimes.sub(startIdx) > _loopLimit) ? startIdx.add(_loopLimit).sub(1) : tokenFractionProfitCalculatedTimes.sub(1);
    uint256 priceSum;

    for (uint256 i = startIdx; i <= endIdx; i ++) {
      priceSum = priceSum.add(tokenFractionProfitForCalculatedIdx[i]);
    }
    profit = priceSum.mul(token.balanceOf(msg.sender));
  }

  function withdrawProfit(uint256 _loopLimit) public onlyTokenOwner {
    _withdrawProfit(msg.sender, _loopLimit, false);
  }

  function withdrawProfitFromToken(address recipient, uint256 _loopLimit) public onlyToken {
    _withdrawProfit(recipient, _loopLimit, true);
  }

  function _withdrawProfit(address recipient, uint256 _loopLimit, bool _fromToken) private {
    uint256 profit = _pendingProfit(recipient, _loopLimit);
    
    if (profit == 0) {
        if (_fromToken) {
          profitWithdrawnOnCalculationIdx[recipient] = tokenFractionProfitCalculatedTimes.sub(1);
          return;
        }
        revert("Nothing to withdraw");
    }

    uint256 startIdx = profitWithdrawnOnCalculationIdx[recipient].add(1);
    uint256 endIdx = (tokenFractionProfitCalculatedTimes.sub(startIdx) > _loopLimit) ? startIdx.add(_loopLimit).sub(1) : tokenFractionProfitCalculatedTimes.sub(startIdx);
    
    profitWithdrawnOnCalculationIdx[recipient] = endIdx;
    recipient.transfer(profit);
    emit BernardFeeWithdrawn(recipient, profit);
  }
  
  function TEST_addBernardFee() public payable {
      ongoingBernardFee = ongoingBernardFee.add(msg.value);
  }
  
  function TEST_balance() public view returns (uint256 balance) {
      return address(this).balance;
  }
}
