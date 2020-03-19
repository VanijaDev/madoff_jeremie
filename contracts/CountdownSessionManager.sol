pragma solidity 0.4.25;

import "./SafeMath.sol";


contract CountdownSessionManager {
  using SafeMath for uint256;

  uint256 public countdownResetTimes; //  number of times, when timer got to 0

  struct PurchaseInfo {
    address sharePurchaser;
    uint256 shareNumber;
    uint256 previousSharePrice;
  }

  //  starts from S1 first purchase
  struct SessionInfo {
    uint256 purchaseNumberForOngoingSession;   //  separate purchase count made during ongoing session
    uint256 sharesPurchasedForOngoingSession;  //  shares purchased during ongoing session
    
    mapping (uint256 => PurchaseInfo) purchaseInfoForIdx;
    mapping (address => uint256[]) addressPurchasedAtIdxs;
    mapping (address => uint256) addressWithdrawnProfitOnPurchaseIdx; //  address withdrawn profit for own shares
  }

  mapping (uint256 => SessionInfo) public sessionInfoForIdx; //  session info after countdown reset time idx
  mapping (address => uint256[]) private sessionInfoIdxsForPurchaser; //  sessions, where purchaser participated
  
  
  function sharesPurchased(uint256 _shareNumber, address _purchaser, uint256 _rewardForPreviousShares) internal {
    require(_shareNumber > 0, "Wrong _shareNumber");
    require(_purchaser != address(0), "Wrong _purchaser");
    require(_rewardForPreviousShares > 0, "Wrong _rewardForPreviousShares");

    SessionInfo storage session = sessionInfoForIdx[countdownResetTimes];
    //  TODO:  check in outer function and send devFee
    uint256 sharePrice = (session.purchaseNumberForOngoingSession == 0) ? 0 : _rewardForPreviousShares.div(session.sharesPurchasedForOngoingSession);
    session.purchaseInfoForIdx[session.purchaseNumberForOngoingSession] = PurchaseInfo({sharePurchaser: _purchaser, shareNumber: _shareNumber, previousSharePrice: sharePrice});
    session.addressPurchasedAtIdxs[_purchaser].push(session.purchaseNumberForOngoingSession);
    session.sharesPurchasedForOngoingSession = session.sharesPurchasedForOngoingSession.add(_shareNumber);
    session.purchaseNumberForOngoingSession = session.purchaseNumberForOngoingSession.add(1);

    addSessionForPurchaser(countdownResetTimes, _purchaser);
  }

  function addSessionForPurchaser(uint256 _session, address _purchaser) private {
    uint256[] storage sessionsForPurchaser = sessionInfoIdxsForPurchaser[_purchaser];
    if (sessionsForPurchaser.length == 0) {
      sessionInfoIdxsForPurchaser[_purchaser].push(_session);
    } else if (sessionsForPurchaser[sessionsForPurchaser.length - 1] < _session) {
      sessionInfoIdxsForPurchaser[_purchaser].push(_session);
    }
  }

  function sessionsForPurchaser(address _purchaser) public view returns(uint256[] sessions) {
    sessions = sessionInfoIdxsForPurchaser[_purchaser];
  }

  function profitForPurchaserInSession(address _purchaser, uint256 _session) public view returns(uint256 profit) {
    uint256[] memory purchaseIdxs = purchasesForPurchaserInSession(_purchaser, _session);

    for(uint256 i = 0; i < purchaseIdxs.length; i ++) {
      uint256 purchaseProfit = profitForPurchaseInSession(purchaseIdxs[i], _session);
      profit = profit.add(purchaseProfit);
    }
  }

  function purchasesForPurchaserInSession(address _purchaser, uint256 _session) public view returns(uint256[] purchaseIdxs) {
    SessionInfo storage session = sessionInfoForIdx[_session];
    purchaseIdxs = session.addressPurchasedAtIdxs[_purchaser];
  }

  function profitForPurchaseInSession(uint256 _purchase, uint256 _session) public view returns(uint256 profit) {
    SessionInfo storage session = sessionInfoForIdx[_session];
    PurchaseInfo storage purchaseInfo = session.purchaseInfoForIdx[_purchase];

    uint256 shares = purchaseInfo.shareNumber;
    uint256 startPurchaseIdx = (session.addressWithdrawnProfitOnPurchaseIdx[purchaseInfo.sharePurchaser] == 0) ? _purchase.add(1) : session.addressWithdrawnProfitOnPurchaseIdx[purchaseInfo.sharePurchaser].add(1);

    for (uint256 i = startPurchaseIdx; i <= session.purchaseNumberForOngoingSession; i ++) {
      PurchaseInfo storage purchaseInfoTmp = session.purchaseInfoForIdx[i];
      uint256 price = purchaseInfoTmp.previousSharePrice;
      uint256 purchaseProfit = shares.mul(price);
      profit = profit.add(purchaseProfit);
    }
  }
  
  function purchaseInfoInSession(uint256 _purchse, uint256 _session) public view returns (address sharePurchaser, uint256 shareNumber, uint256 previousSharePrice) {
      SessionInfo storage session = sessionInfoForIdx[_session];
      PurchaseInfo storage purchase = session.purchaseInfoForIdx[_purchse];
      return (purchase.sharePurchaser, purchase.shareNumber, purchase.previousSharePrice);
  }

  function countdownWasReset() internal {
    countdownResetTimes = countdownResetTimes.add(1);
  }

}
