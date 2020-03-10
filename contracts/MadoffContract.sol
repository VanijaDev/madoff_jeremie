pragma solidity 0.4.25;

import "./SafeMath.sol";

contract MadoffContract {
  using SafeMath for uint256;

  uint8 constant SHARE_PURCHASE_PERCENT_JACKPOT = 40;
  uint8 constant SHARE_PURCHASE_PERCENT_PURCHASED_SHARES = 50;
  uint8 constant SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE = 5;  //  both has 5%

  uint8 constant JACKPOT_PERCENT_WINNER = 80;
  uint8 constant JACKPOT_PERCENT_SHAREHOLDERS = 80;

  uint8 ongoingStage;

  // remove from constructor
  // address constant OWNER_ADDR = "";
  address OWNER_ADDR;

  uint16[14] sharePriceForStage = [10, 20, 40, 80, 125, 160, 200, 250, 320, 500, 800, 1000, 1000, 1000];
  uint16[14] blocksForStage = [21600, 18000, 14400, 10800, 7200, 3600, 1200, 600, 300, 100, 20, 10, 7, 4];
  uint32[14] sharesForStageToPurchase = [2500, 5000, 3125, 12500, 10000, 62500, 62500, 400000, 390625, 2000000, 1562500, 10000000, 12500000, 25000000];

  uint256 public ongoingJackpot;
  uint256 public ongoingBernardFee;
  mapping(address => uint256) public websiteFee;
  mapping(address => uint256) public sharesForAddr;


  constructor(address _OWNER_ADDR) public {
    OWNER_ADDR = _OWNER_ADDR;
  }

  /**
   * @dev Purchase share(s).
   * @param _websiteAddr Website address, that trx was sent from.
   */
  function purchase(address _websiteAddr) public payable {
    uint256 shares = getSharesAndUpdateOngoingStage(msg.value);
    require(shares > 0, "Min 1 share");
    
    sharesForAddr[msg.sender] = sharesForAddr[msg.sender].add(shares);

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
  }

  function getSharesAndUpdateOngoingStage(uint256 _amount) private view returns(uint256) {
    bool loop = true;
    uint256 resultShares;
    uint256 valueToSpend = _amount; 

    do {
      uint256 sharesForOngoingStage = getShares(ongoingStage, valueToSpend);
      
      if (sharesForOngoingStage <= sharesForStageToPurchase[ongoingStage]) {
        resultShares = resultShares.add(sharesForOngoingStage);
        sharesForStageToPurchase[ongoingStage] = sharesForStageToPurchase[ongoingStage].sub(sharesForOngoingStage);

        uint256 valueSpent = sharesForOngoingStage.mul(sharePriceForStage[ongoingStage]);
        valueToSpend = valueToSpend.sub(valueSpent);

        if (sharesForStageToPurchase[ongoingStage] == 0) {
          ongoingStage += 1;
        }

        loop = false;
      } else {
        uint256 valueSpent = sharesForStageToPurchase[ongoingStage].mul(sharePriceForStage[ongoingStage]);
        valueToSpend = valueToSpend.sub(valueSpent);
        resultShares = resultShares.add(sharesForStageToPurchase[ongoingStage]);

        delete sharesForStageToPurchase[ongoingStage];
        ongoingStage += 1;
      }
    } while (loop); 

    require(valueToSpend == 0, "Wrong value sent");  //  should be no unspent amount in msg.value
    return resultShares;

  }

  function getShares(uint8 _stage, uint256 _amount) private view returns(uint256 shares) {
    uint16 sharePrice = sharePriceForStage[_stage];
    shares = _amount.div(uint256(sharePrice));
  }
  
}
