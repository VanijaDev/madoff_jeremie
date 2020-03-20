pragma solidity 0.4.25;

import "./SafeMath.sol";


contract CountdownSessionManager {
  using SafeMath for uint256;

  uint256 public ongoingSessionIdx; //  number of times, when timer got to 0 (reset)

  struct PurchaseInfo {
    address sharePurchaser;
    uint256 shareNumber;
    uint256 previousSharePrice;
  }

  struct ProfitWithdrawalInfo {
    uint256 sharesProfitWithdrawnOnSessionIdx;
    uint256 sharesProfitWithdrawnOnPurchaseIdx;
    uint256 jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx;  //  sessionInfoIdxsForPurchaser array is used
  }

  //  starts from S1 first purchase
  struct SessionInfo {
    uint256 purchaseNumberForOngoingSession;    //  separate purchase count made during ongoing session
    uint256 sharesPurchasedForOngoingSession;   //  shares purchased during ongoing session
    uint256 jackpotSharePrice;                  //  share price after jackpot calculation for ongoing session
    
    mapping (uint256 => PurchaseInfo) purchaseInfoForIdx;
    mapping (address => uint256[]) addressPurchasedAtIdxs;
    mapping (address => uint256) sharesPurchasedByAddress;
  }

  mapping (uint256 => SessionInfo) public sessionInfoForIdx; //  session info after countdown reset time idx
  mapping (address => uint256[]) private sessionInfoIdxsForPurchaser; //  sessions, where purchaser participated
  mapping (address => ProfitWithdrawalInfo) private addressWithdrawalProfitInfo;  //  information about address profit withdrawal
  
  
  //  SHARES PURCHASED
  function sharesPurchased(uint256 _shareNumber, address _purchaser, uint256 _rewardForPreviousShares) internal {
    require(_shareNumber > 0, "Wrong _shareNumber");
    require(_purchaser != address(0), "Wrong _purchaser");
    require(_rewardForPreviousShares > 0, "Wrong _rewardForPreviousShares");

    SessionInfo storage session = sessionInfoForIdx[ongoingSessionIdx];
    uint256 sharePrice = (session.purchaseNumberForOngoingSession == 0) ? 0 : _rewardForPreviousShares.div(session.sharesPurchasedForOngoingSession);
    session.purchaseInfoForIdx[session.purchaseNumberForOngoingSession] = PurchaseInfo({sharePurchaser: _purchaser, shareNumber: _shareNumber, previousSharePrice: sharePrice});
    session.addressPurchasedAtIdxs[_purchaser].push(session.purchaseNumberForOngoingSession);
    session.sharesPurchasedByAddress[_purchaser] = session.sharesPurchasedByAddress[_purchaser].add(_shareNumber);
    
    session.sharesPurchasedForOngoingSession = session.sharesPurchasedForOngoingSession.add(_shareNumber);
    session.purchaseNumberForOngoingSession = session.purchaseNumberForOngoingSession.add(1);

    addSessionForPurchaser(ongoingSessionIdx, _purchaser);
  }

  function addSessionForPurchaser(uint256 _session, address _purchaser) private {
    uint256[] storage sessionsForPurchaser = sessionInfoIdxsForPurchaser[_purchaser];
    if (sessionsForPurchaser.length == 0) {
      sessionInfoIdxsForPurchaser[_purchaser].push(_session);
    } else if (sessionsForPurchaser[sessionsForPurchaser.length - 1] < _session) {
      sessionInfoIdxsForPurchaser[_purchaser].push(_session);
    }
  }

  //  SESSION COUNTDOWN RESET
  function countdownWasReset(uint256 _prevSharesPart) internal {
    SessionInfo storage session = sessionInfoForIdx[ongoingSessionIdx];
    uint256 sharePrice = _prevSharesPart.div(session.sharesPurchasedForOngoingSession);
    session.jackpotSharePrice = sharePrice;
    
    ongoingSessionIdx = ongoingSessionIdx.add(1);
  }


  //  PROFIT
  function getAddressWithdrawalProfitInfo() public view returns(uint256 sharesProfitWithdrawnOnSessionIdx, uint256 sharesProfitWithdrawnOnPurchaseIdx, uint256 jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx) {
    ProfitWithdrawalInfo info = addressWithdrawalProfitInfo[msg.sender];
    return(info.sharesProfitWithdrawnOnSessionIdx, info.sharesProfitWithdrawnOnPurchaseIdx, info.jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx);
  }

  //  1. jackpot for shares
  function getJackpotRevenueForShares(address _address, uint256 _loopLimit) public view returns(uint256 profit) {
    uint256[] sessionsParticipated = sessionInfoIdxsForPurchaser[_address];
    require(sessionsParticipated.length > 0, "No sessions participated");

    ProfitWithdrawalInfo storage info = addressWithdrawalProfitInfo[_address];
    uint256 jackpotWithdrawnOnSessionIdx = info.jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx;
    
    uint256 startIdx = (jackpotWithdrawnOnSessionIdx == 0) ? sessionsParticipated[0] : sessionsParticipated[jackpotWithdrawnOnSessionIdx + 1];
    uint256 loopCount = sessionsParticipated.length.sub(startIdx).sub(1);
    if (loopCount > _loopLimit) {
      loopCount = _loopLimit;
    }

    for (uint256 i  = startIdx; i < loopCount; i ++) {
      uint256 sessionInfoIdx = sessionsParticipated[i];
      SessionInfo sessionInfo = sessionInfoForIdx[sessionInfoIdx];
      
      uint256 sharePrice = session.jackpotSharePrice;
      uint256 sharesPurchasedByAddress = session.sharesPurchasedByAddress[_address];
      uint256 profitTmp = sharePrice.mul(sharesPurchasedByAddress);
      profit = profit.add(profitTmp);
    }

    info.jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx = startIdx.add(loopCount).sub(1);
  }

  //  2. shares profit
  function getSharesProfit(address _address, uint256 _loopLimit) public view returns(uint256 profit) {
    uint256[] sessionsParticipated = sessionInfoIdxsForPurchaser[_address];
    require(sessionsParticipated.length > 0, "No sessions participated");

    ProfitWithdrawalInfo storage info = addressWithdrawalProfitInfo[msg.sender];
    uint256 withdrawnOnSessionIdx = info.sharesProfitWithdrawnOnSessionIdx;
    uint256 withdrawnOnPurchaseIdx = info.sharesProfitWithdrawnOnPurchaseIdx;

    uint256 loopCount;
    uint256 sessionStartIdx = (withdrawnOnSessionIdx == 0) ? 0 : withdrawnOnSessionIdx.add(1);

    

    // do {
    //   for(uint256 i  = sessionStartIdx; i < ongoingSessionIdx; i ++) {
    //     uint256 profitTmp = profitForPurchaserInSession(_address, i);
    //     profit = profit.add(profitTmp);
    //   }

    //   loopCount = loopCount.add(1);
    // } while(loopCount <= _loopLimit)

    // uint256 lastSessionIdx = sessionStartIdx.add(loopCount).sub(1)
    // addressWithdrawalProfitInfo[_address].sharesProfitWithdrawnOnPurchaseIdx = sessionInfo[lastSessionIdx].purchaseNumberForOngoingSession.sub(1);  //  TODO: sub(1) - ?
    // addressWithdrawalProfitInfo[_address].jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx = lastSessionIdx;
  }









  function ongoingProfit(uint256 _loopLimit) public view returns(uint256 profit) {
    //  profit for purchased shares for each session (or manually by session)
    uint256 sharesProfit = getSharesProfit(msg.sender, _loopLimit);

    //  profit for jackpot for purchased shares
    uint256 jackpotsProfit = getJackpotRevenueForShares(msg.sender, _loopLimit);

    profit = sharesProfit.add(jackpotsProfit);
  }

  function withdrawOngoingProfit() public {
    uint256 profit = ongoingProfit(msg.sender);
    require(profit > 0, "No profit");

    msg.sender.transfer(profit);
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

}
