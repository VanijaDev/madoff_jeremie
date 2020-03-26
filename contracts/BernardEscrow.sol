pragma solidity 0.4.25;

import "./token/MadoffProfitToken.sol";
import "./SafeMath.sol";


contract BernardEscrow {
  using SafeMath for uint256;

  MadoffProfitToken public token;

  uint256 public constant CALCULATION_DISABLED_BLOCKS = 21600;
  
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

  modifier onlyTokenOwner() {
    require(token.balanceOf(msg.sender) > 0, "Not token owner");

    tokenFractionProfitCalculatedTimes = 1;  //  idx 0 can not be used
    _;
  }

  modifier onlyToken() {
    require(msg.sender == address(token), "Not MPT");
    _;
  }


  constructor (address _token) public {
    token = MadoffProfitToken(_token);
  }

  function calculateTokenFractionProfit() public onlyTokenOwner onlyCalculationEnabled {
    uint256 fractionProfit = ongoingBernardFee.div(10000);
    require(fractionProfit > 0, "Wrong profit");
   
    tokenFractionProfitForCalculatedIdx[tokenFractionProfitCalculatedTimes] = fractionProfit;
    
    tokenFractionProfitCalculatedTimes = tokenFractionProfitCalculatedTimes.add(1);
    prevCalculationBlock = block.number;
  }

  function withdrawProfit(uint256 _loopLimit) public onlyTokenOwner {
    _withdrawProfit(msg.sender, _loopLimit);
  }

  function withdrawProfitFromToken(address recipient, uint256 _loopLimit) public onlyToken {
    _withdrawProfit(recipient, _loopLimit);
  }

  function _withdrawProfit(address recipient, uint256 _loopLimit) private {
    uint256 startIdx = profitWithdrawnOnCalculationIdx[recipient].add(1);
    require(startIdx < tokenFractionProfitCalculatedTimes, "No profit");
  
    uint256 endIdx = (tokenFractionProfitCalculatedTimes.sub(startIdx) > _loopLimit) ? startIdx.add(_loopLimit).sub(1) : tokenFractionProfitCalculatedTimes.sub(startIdx);
    uint256 priceSum;

    for (uint256 i = startIdx; i <= endIdx; i ++) {
      priceSum = priceSum.add(tokenFractionProfitForCalculatedIdx[i]);
    }
    uint256 profit = priceSum.mul(token.balanceOf(recipient));

    profitWithdrawnOnCalculationIdx[recipient] = endIdx;
    recipient.transfer(profit);
    emit BernardFeeWithdrawn(recipient, profit);
  }
}
