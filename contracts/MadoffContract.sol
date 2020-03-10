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
  uint16[14] maxBlocksForStage = [21600, 18000, 14400, 10800, 7200, 3600, 1200, 600, 300, 100, 20, 10, 7, 4];
  uint32[14] maxSharesForStage = [2500, 5000, 3125, 12500, 10000, 62500, 62500, 400000, 390625, 2000000, 1562500, 10000000, 12500000, 25000000];

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
    uint256 sharesNumber = getSharesNumberAndUpdateOngoingStage(msg.value);
    require(sharesNumber > 0, "Min 1 share");

    //  make calculations
    uint256 partJackpot = msg.value.mul(uint256(PURCHASE_PERCENT_JACKPOT)).div(uint256(100));
    ongoingJackpot = ongoingJackpot.add(partJackpot);

    uint256 partPurchasedShares = msg.value.mul(uint256(PURCHASE_PERCENT_PURCHASED_SHARES)).div(uint256(100));
    //  add to all shareholders

    uint256 partBernardWebsiteFee = msg.value.mul(uint256(PURCHASE_PERCENT_BERNARD_WEBSITE)).div(uint256(100));
    ongoingBernardFee = ongoingBernardFee.add(partBernardWebsiteFee);

    if (_websiteAddr == address(0)) {
      websiteFee[OWNER_ADDR] = websiteFee[OWNER_ADDR].add(partBernardWebsiteFee);
    } else {
      websiteFee[_websiteAddr] = websiteFee[_websiteAddr].add(partBernardWebsiteFee);
    }
  }

  function getSharesNumberAndUpdateOngoingStage(uint256 _amount) private view returns(uint256) {
    uint16 sharePrice = sharePriceForStage[ongoingStage];
    uint256 sharesNumberForOngoingStage = msg.value.div(uint256(sharePrice));
    sharesForAddr[msg.sender] = sharesForAddr[msg.sender].add(sharesNumber);

  }
  
}
