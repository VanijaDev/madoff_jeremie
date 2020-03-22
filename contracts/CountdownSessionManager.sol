pragma solidity 0.4.25;

import "./SafeMath.sol";


contract CountdownSessionManager {
  using SafeMath for uint256;

  uint256 public ongoingSessionIdx; //  number of times reset

  struct PurchaseInfo {
    address sharePurchaser;
    uint256 shareNumber;
    uint256 previousSharePrice;
  }

  struct ProfitWithdrawalInfo {
    uint256 sharesProfitWithdrawnOnParticipatedSessionIdx;  //  sessionsInfoForPurchaser array is used
    uint256 sharesProfitWithdrawnOnPurchaseIdx;
    uint256 jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx;  //  sessionsInfoForPurchaser array is used
  }

  //  starts from S1 first purchase
  struct SessionInfo {
    uint256 purchaseNumberForOngoingSession;    //  separate purchase count made during ongoing session
    uint256 sharesPurchasedForOngoingSession;   //  shares purchased during ongoing session
    uint256 jackpotSharePrice;                  //  share price after jackpot calculation for ongoing session
    
    mapping (uint256 => PurchaseInfo) purchaseInfoForIdx;
    mapping (address => uint256[]) purchaseIdxsForPurchaser;  //  Purchase idxs within session, for purchaser
    mapping (address => uint256) sharesPurchasedByPurchaser;  //  number of shares purchased by Purchaser during Session
  }

  mapping (uint256 => SessionInfo) public sessionsInfo; //  session info, idx - number of times countdown reset
  mapping (address => uint256[]) private sessionsInfoForPurchaser; //  sessions, where purchaser participated
  mapping (address => ProfitWithdrawalInfo) private profitWithdrawalInfoForPurchaser;  //  information about address profit withdrawal
  
  
  //  SHARES PURCHASED
  function sharesPurchased(uint256 _shareNumber, address _purchaser, uint256 _rewardForPreviousShares) internal {
    require(_shareNumber > 0, "Wrong _shareNumber");
    require(_purchaser != address(0), "Wrong _purchaser");

    SessionInfo storage session = sessionsInfo[ongoingSessionIdx];
    uint256 sharePrice = (_rewardForPreviousShares == 0) ? 0 : _rewardForPreviousShares.div(session.sharesPurchasedForOngoingSession);
    session.purchaseInfoForIdx[session.purchaseNumberForOngoingSession] = PurchaseInfo({sharePurchaser: _purchaser, shareNumber: _shareNumber, previousSharePrice: sharePrice});
    session.purchaseIdxsForPurchaser[_purchaser].push(session.purchaseNumberForOngoingSession);
    session.sharesPurchasedByPurchaser[_purchaser] = session.sharesPurchasedByPurchaser[_purchaser].add(_shareNumber);
    
    session.sharesPurchasedForOngoingSession = session.sharesPurchasedForOngoingSession.add(_shareNumber);
    session.purchaseNumberForOngoingSession = session.purchaseNumberForOngoingSession.add(1);

    addSessionForPurchaser(ongoingSessionIdx, _purchaser);
  }

  function addSessionForPurchaser(uint256 _session, address _purchaser) private {
    uint256[] storage sessionsForPurchaser = sessionsInfoForPurchaser[_purchaser];
    if (sessionsForPurchaser.length == 0) {
      sessionsInfoForPurchaser[_purchaser].push(_session);
    } else if (sessionsForPurchaser[sessionsForPurchaser.length - 1] < _session) {
      sessionsInfoForPurchaser[_purchaser].push(_session);
    }
  }

  //  SESSION COUNTDOWN RESET
  function countdownWasReset(uint256 _prevSharesPart) internal {
    SessionInfo storage session = sessionsInfo[ongoingSessionIdx];
    uint256 sharePrice = _prevSharesPart.div(session.sharesPurchasedForOngoingSession);
    session.jackpotSharePrice = sharePrice;
    
    ongoingSessionIdx = ongoingSessionIdx.add(1);
  }

  //  PROFIT
  function getAddressWithdrawalProfitInfo() public view returns(uint256 sharesProfitWithdrawnOnSessionIdx, uint256 sharesProfitWithdrawnOnPurchaseIdx, uint256 jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx) {
    ProfitWithdrawalInfo info = profitWithdrawalInfoForPurchaser[msg.sender];
    return(info.sharesProfitWithdrawnOnSessionIdx, info.sharesProfitWithdrawnOnPurchaseIdx, info.jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx);
  }

  //  1. jackpot for holding shares
  function getJackpotProfitForShares(address _address, uint256 _loopLimit) public view returns(uint256 profit) {
    uint256[] sessionsParticipated = sessionsInfoForPurchaser[_address];
    require(sessionsParticipated.length > 0, "No sessions participated");

    ProfitWithdrawalInfo storage info = profitWithdrawalInfoForPurchaser[_address];
    uint256 jackpotWithdrawnOnSessionIdx = info.jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx;
    
    uint256 startIdx = (jackpotWithdrawnOnSessionIdx == 0) ? sessionsParticipated[0] : sessionsParticipated[jackpotWithdrawnOnSessionIdx + 1];
    uint256 loopCount = sessionsParticipated.length.sub(startIdx);
    uint256 workingIdx;

    for (uint256 i  = startIdx; i < loopCount; i ++) {
      if (i > _loopLimit) {
        break;
      }

      workingIdx = i;

      uint256 idx = sessionsParticipated[i];
      SessionInfo sessionInfo = sessionsInfo[idx];
      
      uint256 sharePrice = sessionInfo.jackpotSharePrice;
      uint256 sharesPurchasedByPurchaser = sessionInfo.sharesPurchasedByPurchaser[_address];
      uint256 profitTmp = sharePrice.mul(sharesPurchasedByPurchaser);
      profit = profit.add(profitTmp);
    }

    info.jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx = workingIdx;
  }

  //  2. shares profit
  function getSharesProfit(address _address, uint256 _loopLimitForSessions) public view returns(uint256 profit) {
    uint256[] sessionsParticipated = sessionsInfoForPurchaser[_address];
    require(sessionsParticipated.length > 0, "No sessions participated");

    ProfitWithdrawalInfo storage info = profitWithdrawalInfoForPurchaser[msg.sender];
    uint256 withdrawnOnSessionIdx = info.sharesProfitWithdrawnOnParticipatedSessionIdx;
    uint256 withdrawnOnPurchaseIdx = info.sharesProfitWithdrawnOnPurchaseIdx;

    uint256 sessionStartIdx = withdrawnOnSessionIdx;
    uint256 loopCount = sessionsParticipated.length.sub(sessionStartIdx);
    uint256 workingIdx;
    
    for (uint256 i  = sessionStartIdx; i < loopCount; i ++) {
      if (i > _loopLimitForSessions) {
        break;
      }

      workingIdx = i;

      uint256 sessionInfoIdx = sessionsParticipated[i];
      uint256 profitTmp = getSharesProfitForSession(_address, sessionInfoIdx);
      profit = profit.add(profitTmp);
    }





    info.jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx = workingIdx;


    
    // do {
    //   for(uint256 i  = sessionStartIdx; i < ongoingSessionIdx; i ++) {
    //     uint256 profitTmp = profitForPurchaserInSession(_address, i);
    //     profit = profit.add(profitTmp);
    //   }

    //   loopCount = loopCount.add(1);
    // } while(loopCount <= _loopLimit)

    // uint256 lastSessionIdx = sessionStartIdx.add(loopCount).sub(1)
    // profitWithdrawalInfoForPurchaser[_address].sharesProfitWithdrawnOnPurchaseIdx = sessionInfo[lastSessionIdx].purchaseNumberForOngoingSession.sub(1);  //  TODO: sub(1) - ?
    // profitWithdrawalInfoForPurchaser[_address].jackpotProfitForSharesWithdrawnOnParticipatedSessionIdx = lastSessionIdx;
  }

  function getSharesProfitForSession(address _address, uint256 _sessionInfoIdx) private view returns (uint256 profit) {
    
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
    sessions = sessionsInfoForPurchaser[_purchaser];
  }

  function profitForPurchaserInSession(address _purchaser, uint256 _session) public view returns(uint256 profit) {
    uint256[] memory purchaseIdxs = purchasesForPurchaserInSession(_purchaser, _session);

    for(uint256 i = 0; i < purchaseIdxs.length; i ++) {
      uint256 purchaseProfit = profitForPurchaseInSession(purchaseIdxs[i], _session);
      profit = profit.add(purchaseProfit);
    }
  }

  function purchasesForPurchaserInSession(address _purchaser, uint256 _session) public view returns(uint256[] purchaseIdxs) {
    SessionInfo storage session = sessionsInfo[_session];
    purchaseIdxs = session.purchaseIdxsForPurchaser[_purchaser];
  }

  function profitForPurchaseInSession(uint256 _purchase, uint256 _session) public view returns(uint256 profit) {
    SessionInfo storage session = sessionsInfo[_session];
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
    SessionInfo storage session = sessionsInfo[_session];
    PurchaseInfo storage purchase = session.purchaseInfoForIdx[_purchse];
    return (purchase.sharePurchaser, purchase.shareNumber, purchase.previousSharePrice);
  }

}
