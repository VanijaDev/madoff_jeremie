pragma solidity 0.4.25;

import "./SafeMath.sol";

contract MadoffContract {
  using SafeMath for uint256;

  uint8 constant SHARE_PURCHASE_PERCENT_JACKPOT = 40;
  uint8 constant SHARE_PURCHASE_PERCENT_PURCHASED_SHARES = 50;
  uint8 constant SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE = 5;  //  both has 5%

  uint8 constant JACKPOT_PERCENT_WINNER = 80;
  uint8 constant JACKPOT_PERCENT_SHAREHOLDERS = 80;

  uint8 public ongoingStage;
  uint8 public maxStageNumber = 13;

  // remove from constructor
  // address constant OWNER_ADDR = "";
  address OWNER_ADDR;

  uint16[14] public blocksForStage = [21600, 18000, 14400, 10800, 7200, 3600, 1200, 600, 300, 100, 20, 10, 7, 4];
  uint32[14] public sharesForStageToPurchaseOriginal = [2500, 5000, 3125, 12500, 10000, 62500, 62500, 400000, 390625, 2000000, 1562500, 10000000, 12500000, 25000000];
  uint32[14] public sharesForStageToPurchase = [2500, 5000, 3125, 12500, 10000, 62500, 62500, 400000, 390625, 2000000, 1562500, 10000000, 12500000, 25000000];
  uint256[14] public sharePriceForStage = [10000000, 20000000, 40000000, 80000000, 125000000, 160000000, 200000000, 250000000, 320000000, 500000000, 800000000, 1000000000, 1000000000, 1000000000];

  uint256 public ongoingStageStartBlock;
  uint256 public ongoingJackpot;
  uint256 public ongoingBernardFee;
  address public ongoingWinner;
  mapping(address => uint256) public websiteFee;
  mapping(address => uint256) public sharesForAddr;
  mapping(address => uint256) public prizeForAddr;

  event PrizeWithdrawn(address indexed to, uint256 indexed amount);
  event WebsiteFeeWithdrawn(address indexed to, uint256 indexed amount);
  event Purchase(address indexed from, uint256 indexed sharesNumber);

  constructor(address _OWNER_ADDR) public {
    OWNER_ADDR = _OWNER_ADDR;
  }

  function withdrawPrize() public {
    uint256 prizeTmp = prizeForAddr[msg.sender];
    delete prizeForAddr[msg.sender];
    msg.sender.transfer(prizeTmp);

    emit PrizeWithdrawn(msg.sender, prizeTmp);
  }

  function withdrawWebsiteFee() public {
    uint256 feeTmp = websiteFee[msg.sender];
    delete websiteFee[msg.sender];
    msg.sender.transfer(feeTmp);

    emit WebsiteFeeWithdrawn(msg.sender, feeTmp);
  }

  /**
   * @dev Purchase share(s).
   * @param _websiteAddr Website address, that trx was sent from.
   */
  function purchase(address _websiteAddr) public payable {
    if ((ongoingStage == maxStageNumber) && (sharesForStageToPurchase[ongoingStage] == 0)) {
      resetGameDataToRestart();
    }

    if (ongoingStageStartBlock.add(blocksForStage[ongoingStage]) > block.number) {
      ongoingStageDurationEnded();
    }

    //  make calculations
    uint256 partJackpot = msg.value.mul(uint256(SHARE_PURCHASE_PERCENT_JACKPOT)).div(uint256(100));
    ongoingJackpot = ongoingJackpot.add(partJackpot);

    uint256 partBernardWebsiteFee = msg.value.mul(uint256(SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE)).div(uint256(100));
    ongoingBernardFee = ongoingBernardFee.add(partBernardWebsiteFee);

    //  TODO: add to all shareholders

    if (_websiteAddr == address(0)) {
      websiteFee[OWNER_ADDR] = websiteFee[OWNER_ADDR].add(partBernardWebsiteFee);
    } else {
      websiteFee[_websiteAddr] = websiteFee[_websiteAddr].add(partBernardWebsiteFee);
    }

    uint256 shares = getSharesAndUpdateOngoingStageInfo(msg.value);
    require(shares > 0, "Min 1 share");
    
    ongoingWinner = msg.sender;
    sharesForAddr[ongoingWinner] = sharesForAddr[ongoingWinner].add(shares);

    emit Purchase(ongoingWinner, shares);
  }

  function resetGameDataToRestart() private {
    ongoingStage = 0;
    ongoingStageStartBlock = block.number;
    sharesForStageToPurchase = sharesForStageToPurchaseOriginal;

    //  TODO: reset other properties
  }

  function ongoingStageDurationEnded() private {
    uint256 jptTmp = ongoingJackpot;
    delete ongoingJackpot;
    prizeForAddr[ongoingWinner] = prizeForAddr[ongoingWinner].add(jptTmp);
    delete ongoingWinner;

    ongoingStageStartBlock = block.number;
  }

  function getSharesAndUpdateOngoingStageInfo(uint256 _amount) private returns(uint256) {
    bool loop = true;
    uint256 resultShares;
    uint256 valueToSpend = _amount;
    uint256 valueSpent;

    do {
      uint256 sharesForOngoingStage = getShares(ongoingStage, valueToSpend);
      
      if (sharesForOngoingStage <= sharesForStageToPurchase[ongoingStage]) {
        resultShares = resultShares.add(sharesForOngoingStage);
        sharesForStageToPurchase[ongoingStage] = uint32(uint256(sharesForStageToPurchase[ongoingStage]).sub(sharesForOngoingStage));

        valueSpent = sharesForOngoingStage.mul(sharePriceForStage[ongoingStage]);
        valueToSpend = valueToSpend.sub(valueSpent);

        if (sharesForStageToPurchase[ongoingStage] == 0) {
          ongoingStage += 1;
        }

        loop = false;
      } else {
        valueSpent = uint256(sharesForStageToPurchase[ongoingStage]).mul(sharePriceForStage[ongoingStage]);
        valueToSpend = valueToSpend.sub(valueSpent);
        resultShares = resultShares.add(sharesForStageToPurchase[ongoingStage]);

        delete sharesForStageToPurchase[ongoingStage];
        ongoingStage += 1;
        ongoingStageStartBlock = block.number;
      }
    } while (loop); 

    require(valueToSpend == 0, "Wrong value sent");  //  should be no unspent amount

    return resultShares;
  }

  function getShares(uint8 _stage, uint256 _amount) private view returns(uint256 shares) {
    require(_stage <= maxStageNumber, "Stage overflow");

    uint256 sharePrice = sharePriceForStage[_stage];
    shares = _amount.div(uint256(sharePrice));
  }
  
}
