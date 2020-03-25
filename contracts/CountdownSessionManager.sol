pragma solidity 0.4.25;

import "./SafeMath.sol";


contract CountdownSessionManager {
  using SafeMath for uint256;

  struct PurchaseInfo {
    address purchaser;
    uint256 shareNumber;
    uint256 previousSharePrice;
  }

  struct ProfitWithdrawalInfo {
    bool jackpotProfitForSharesWithdrawn;
    mapping (uint256 => uint256) sharesPurchaseProfitWithdrawnOnPurchase; //  share profit, made in Purchase, withdrawn until including Purchase idx in Session, PurchaseMade => PurchaseWithdrawn
  }

  //  starts from S1 first purchase
  struct SessionInfo {
    uint256 sharesPurchased;    //  shares purchased during ongoing Session
    uint256 jackpotSharePrice;  //  share price after jackpot calculation for ongoing Session
    
    PurchaseInfo[] purchasesInfo;
    mapping (address => uint256[]) purchaseIdxsForPurchaser;  //  Purchase idxs within Session, for purchaser
    mapping (address => uint256) sharesPurchasedByPurchaser;  //  number of shares purchased by Purchaser during Session
    mapping (address => ProfitWithdrawalInfo) profitWithdrawalInfoForPurchaser;  //  information about address profit withdrawal
  }

  SessionInfo[] internal sessionsInfo; //  Sessions info, new Session after countdown reset
  mapping (address => uint256[]) private sessionsInfoForPurchaser; //  sessions, where purchaser participated
  
  event SharesProfitWithdrawn(address _address, uint256 _amount, uint256 _session, uint256 _purchase);
  event JackpotForSharesProfitWithdrawn(address _address, uint256 _amount, uint256 _session);
  
  //  SHARES PURCHASED
  function sharesPurchased(uint256 _shareNumber, address _purchaser, uint256 _rewardForPreviousShares) internal {
    require(_shareNumber > 0, "Wrong _shareNumber");
    require(_purchaser != address(0), "Wrong _purchaser");
    
    uint256 ongoingSessionIdx = (sessionsInfo.length == 0) ? 0 : sessionsInfo.length.sub(1);

    SessionInfo storage session = sessionsInfo[ongoingSessionIdx];
    uint256 sharePrice = (_rewardForPreviousShares == 0) ? 0 : _rewardForPreviousShares.div(session.sharesPurchased);
    session.purchasesInfo.push(PurchaseInfo({purchaser: _purchaser, shareNumber: _shareNumber, previousSharePrice: sharePrice}));
    session.purchaseIdxsForPurchaser[_purchaser].push(session.purchasesInfo.length);
    session.sharesPurchasedByPurchaser[_purchaser] = session.sharesPurchasedByPurchaser[_purchaser].add(_shareNumber);
    
    session.sharesPurchased = session.sharesPurchased.add(_shareNumber);
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
    uint256 ongoingSessionIdx = (sessionsInfo.length == 0) ? 0 : sessionsInfo.length.sub(1);
    
    SessionInfo storage session = sessionsInfo[ongoingSessionIdx];
    uint256 sharePrice = _prevSharesPart.div(session.sharesPurchased);
    session.jackpotSharePrice = sharePrice;
  }

  //  PROFIT
  
  // function profitForSharesForPurchaseInSession(uint256 _purchase, uint256 _session) public view returns(uint256 profit) {

  // }

  // function withdrawProfitForSharesForPurchaseInSession(uint256 _purchase, uint256 _session) public view returns(uint256 profit) {

  // }


  //  1. jackpot for purchased shares in Session
  function jackpotProfitForSharesInSession(uint256 _session) public view returns(uint256 profit) {
    require(_session < sessionsInfo.length, "No session");

    SessionInfo storage sessionInfo = sessionsInfo[_session];

    uint256 sharePrice = sessionInfo.jackpotSharePrice;
    require(sharePrice > 0, "No jackpot yet");

    uint256 sharesPurchasedByPurchaser = sessionInfo.sharesPurchasedByPurchaser[msg.sender];
    require(sharesPurchasedByPurchaser > 0, "No shares");

    profit = sharePrice.mul(sharesPurchasedByPurchaser);
  }

  function withdrawJackpotProfitForSharesInSession(uint256 _session) public {
    require(_session < sessionsInfo.length, "No session");

    SessionInfo storage session = sessionsInfo[_session];
    ProfitWithdrawalInfo storage profitWithdrawalInfo = session.profitWithdrawalInfoForPurchaser[msg.sender];
    require(profitWithdrawalInfo.jackpotProfitForSharesWithdrawn == false, "Already withdrawn");
    
    profitWithdrawalInfo.jackpotProfitForSharesWithdrawn == true;
    uint256 profit = jackpotProfitForSharesInSession(_session);

    msg.sender.transfer(profit);
    emit JackpotForSharesProfitWithdrawn(msg.sender, profit, _session);
  }

  //  2. shares profit for Purchase in Session
  function profitForPurchaseInSession(uint256 _purchase, uint256 _session, uint256 _fromPurchase, uint256 _toPurchase) public view returns(uint256 profit) {
    require(_session < sessionsInfo.length, "No session");
    require(_fromPurchase > _purchase, "Wrong _fromPurchase");

    SessionInfo storage session = sessionsInfo[_session];
    PurchaseInfo storage purchaseInfo = session.purchasesInfo[_purchase];

    require(_purchase < session.purchasesInfo.length.sub(1), "Last purchase");

    uint256 shares = purchaseInfo.shareNumber;

    for (uint256 i = _fromPurchase; i <= _toPurchase; i ++) {
      uint256 sharePrice = session.purchasesInfo[i].previousSharePrice;
      uint256 profitTmp = shares.mul(sharePrice);
      profit = profit.add(profitTmp);
    }
  }

  function withdrawProfitForPurchaseInSession(uint256 _purchase, uint256 _session, uint256 _loopLimit) public {
    require(_session < sessionsInfo.length, "No session");

    SessionInfo storage session = sessionsInfo[_session];
    PurchaseInfo storage purchaseInfo = session.purchasesInfo[_purchase];
    require(purchaseInfo.purchaser == msg.sender, "Not purchaser");

    ProfitWithdrawalInfo storage profitWithdrawalInfo = session.profitWithdrawalInfoForPurchaser[msg.sender];
    uint256 purchaseIdxWithdrawnOn = profitWithdrawalInfo.sharesPurchaseProfitWithdrawnOnPurchase[_purchase];
    uint256 fromPurchaseIdx = purchaseIdxWithdrawnOn.add(1);
    uint256 toPurchaseIdx = session.purchasesInfo.length.sub(1);
    require(fromPurchaseIdx <= toPurchaseIdx, "No more profit");

    if (toPurchaseIdx.sub(fromPurchaseIdx) > _loopLimit) {
      toPurchaseIdx = fromPurchaseIdx.add(_loopLimit);
    }

    uint256 profit = profitForPurchaseInSession(_purchase, _session, fromPurchaseIdx, toPurchaseIdx);

    purchaseIdxWithdrawnOn = toPurchaseIdx;
    
    msg.sender.transfer(profit);
    emit SharesProfitWithdrawn(msg.sender, profit, _session, _purchase);
  }
  

  //  VIEW

  //  SessionInfo list, where user made purchase
  function participatedSessions() public view returns(uint256[] sessions) {
    sessions = sessionsInfoForPurchaser[msg.sender];
  }

  //  Purchases for purchaser in Session
  function participatedPurchasesForSession(uint256 _session) public view returns(uint256[] purchaseIdxs) {
    require(_session < sessionsInfo.length, "No session");

    SessionInfo storage session = sessionsInfo[_session];
    purchaseIdxs = session.purchaseIdxsForPurchaser[msg.sender];
  }
  
  function purchaseInfoInSession(uint256 _purchase, uint256 _session) public view returns (address purchaser, uint256 shareNumber, uint256 previousSharePrice) {
    require(_session < sessionsInfo.length, "No session");

    SessionInfo storage session = sessionsInfo[_session];
    PurchaseInfo storage purchase = session.purchasesInfo[_purchase];
    return (purchase.purchaser, purchase.shareNumber, purchase.previousSharePrice);
  }


  //  ProfitWithdrawalInfo
  function jackpotProfitForSharesWithdrawn(uint256 _session) public view returns(bool) {
    require(_session < sessionsInfo.length, "No session");

    SessionInfo storage session = sessionsInfo[_session];
    return session.profitWithdrawalInfoForPurchaser[msg.sender].jackpotProfitForSharesWithdrawn;
  }

  function sharesPurchaseProfitWithdrawnOnPurchase(uint256 _purchase, uint256 _session) public view returns (uint256 purchase) {
    require(_session < sessionsInfo.length, "No session");

    SessionInfo storage session = sessionsInfo[_session];
    purchase = session.profitWithdrawalInfoForPurchaser[msg.sender].sharesPurchaseProfitWithdrawnOnPurchase[_purchase];
  }
}
