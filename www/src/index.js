//  TODO:
//  - node check + showError
//  "test addr"
//  window.onload

import BigNumber from "bignumber.js";

const Index = {
  Config: {
    "tokenAddress": "TLsMjwkFSLKSWovx2a11z4ZgRg6VfYNRUx",
    "gameAddress": "TTnbEvURFjbn2rxJcNjYNPdf1rJqtJp9zQ"
  },

  ErrorType: {
    noTronLink: 0,
    wrongNode: 1,
    noInst: 2,
  },

  currentAccount: "",
  gameInst: null,
  tokenInst: null,
  languageSource: null,

  LOOP_LIMIT: new BigNumber("50"),
  WEBSITE_ADDR: "TQphDXxumffC81VTaChhNuFuK1efRAYQJ4", //  TODO: change

  setup: async function() {
    console.log("\n     SETUP\n");
    
    Index.setLanguage(0);

    //  test addr
    Index.currentAccount =  window.tronWeb.defaultAddress.base58;
    // console.log("currentAccount: ", Index.currentAccount);

    //  Instances
    try {
      Index.gameInst = await tronWeb.contract().at(tronWeb.address.toHex(Index.Config.gameAddress));
      // console.log("gameInst: ", Index.gameInst);
      Index.tokenInst = await tronWeb.contract().at(tronWeb.address.toHex(Index.Config.tokenAddress));
      // console.log("tokenInst: ", Index.tokenInst);
    } catch (error) {
      console.error("No contract instanses.");
      Index.showError(Index.ErrorType.wrongNode);
      return;
    }

    Index.updateData();
  },

  updateData: function() {
    console.log("\n     UPDATE\n");
    Index.showSpinner(true, " ");

    Index.updateJackpot();
    Index.updateWinner();
    Index.updateCountdown();
    Index.updateCurrentStagePrice();
    Index.updateCurrentEarnings();
  },

  // setupEventListeners: function() {
  //   // Index.gameInst.Purchase().watch((err, eventResult) => {
  //   //   if (err) {
  //   //     return console.error('Error with Purchase event:', err);
  //   //   }
  //   //   if (eventResult) { 
  //   //     console.log('eventResult Purchase :',eventResult);
  //   //     Index.updateData();
  //   //   }

  //   //   Index.hideSpinner();
  //   // });
  // },

  updateJackpot: async function() {
    let jp = await Index.gameInst.ongoingJackpot().call();
    document.getElementById("currentJackpot").textContent = tronWeb.fromSun(jp);
  },

  updateWinner: async function() {
    let winner = await Index.gameInst.ongoingWinner().call();
    // console.log("winner: ", winner);
    if (winner.localeCompare("410000000000000000000000000000000000000000") == 0) {
      document.getElementById("currentWinner").textContent = "0x0";
    } else {
      // console.log("winner hex : ", tronWeb.address.fromHex(winner));
      document.getElementById("currentWinner").textContent = tronWeb.address.fromHex(winner);
    }
  },

  updateCountdown: async function() {
    let blocksLeft = new BigNumber(await Index.blocksUntilStageFinish());
    // console.log("blocksLeft: ", blocksLeft.toString());
    if (blocksLeft.comparedTo(new BigNumber("0")) == 1) {
      const BLOCK_MINING_TIME = new BigNumber("3");
      let secLeft = BLOCK_MINING_TIME.multipliedBy(blocksLeft);
      // console.log("secLeft: ", secLeft.toString());

      let nowDate = new Date();
      // console.log("nowDate: ", nowDate);

      let winDate = new Date(nowDate.setSeconds(nowDate.getSeconds() + parseInt(secLeft)));
      // console.log("winDate: ", winDate);

      jQuery('#clock').countdown(winDate);
    } else {
      jQuery('#clock').countdown('2000/01/01');
    }
  },

  updateCurrentStagePrice: async function() {
    console.log("     updateCurrentStagePrice");

    let ongoingStage = new BigNumber("0");

    if (!(await Index.isStageExpired())) {
      ongoingStage = new BigNumber(await Index.gameInst.ongoingStage().call());
    }

    document.getElementById("current_stage").textContent = ongoingStage.toString();

    let sharePriceForStage = new BigNumber(await Index.gameInst.sharePriceForStage(ongoingStage.toString()).call());
    document.getElementById("current_share_price").textContent = tronWeb.fromSun(sharePriceForStage.toString());
  },

  updateCurrentEarnings: async function() {
    console.log("     updateCurrentEarnings");

    //  JP
    let jp = await Index.jackpotAmountForCurrentAccount();
    console.log("jackpotAmountForCurrentAccount: ", jp.toString());
    document.getElementById("jp").textContent = "If you are the winner withdraw the jackpot here: " + tronWeb.fromSun(jp) + " TRX";

    //  JP for shares
    let jpForShares = await Index.jackpotForSharesForCurrentAccount();
    // console.log("jackpotForSharesForCurrentAccount: ", jpForShares.toString());
    document.getElementById("jp_for_shares").textContent = "Withdraw your part of the 20% from the jackpot here: " + tronWeb.fromSun(jpForShares) + " TRX";

    //  purchased shares
    let purchasedSharesProfit = await Index.profitForPurchasedShares();
    console.log("purchasedSharesProfit: ", purchasedSharesProfit.toString());

    document.getElementById("current_earnings_amount").textContent = tronWeb.fromSun((new BigNumber(jp)).plus(new BigNumber(jpForShares)).plus(new BigNumber(purchasedSharesProfit)).toString());

    Index.showSpinner(false);
  },

  jackpotAmountForCurrentAccount: async function() {
    console.log("jackpotAmountForCurrentAccount");
    let totalAmount = new BigNumber("0");

    //  previous jpts
    let jackpotForAddr = new BigNumber(await Index.gameInst.jackpotForAddr(Index.currentAccount).call());
    console.log("jackpotForAddr: ", jackpotForAddr.toString());
    if (jackpotForAddr.comparedTo(new BigNumber("0")) > 0) {
      totalAmount = totalAmount.plus(jackpotForAddr);
      console.log("totalAmount previous: ", totalAmount.toString());
    }

    return totalAmount;
  },

  jackpotForSharesForCurrentAccount: async function() {
    console.log("jackpotForSharesForCurrentAccount");
    
    let totalAmount = new BigNumber("0");

    let participatedSessionsForUserResponse = await Index.gameInst.participatedSessionsForUser().call();
    let participatedSessionsForUser = participatedSessionsForUserResponse.sessions;
    // console.log("participatedSessionsForUser: ", participatedSessionsForUser);

    let length = participatedSessionsForUser.length;
    let ongoingSessionIdx = await Index.gameInst.ongoingSessionIdx().call();
    if (new BigNumber(participatedSessionsForUser[length-1]).comparedTo(new BigNumber(ongoingSessionIdx)) == 0) {
      participatedSessionsForUser.pop();
      length = participatedSessionsForUser.length;
    }
    // console.log("participatedSessionsForUser: ", participatedSessionsForUser);

    for (let i = 0; i < length; i++) {
      const sessionId = participatedSessionsForUser[i];
      // console.log("sessionId: ", sessionId);
      let profit;
      try {
        if (!(await Index.gameInst.isJackpotForSharesInSessionWithdrawnForUser(sessionId).call()).withdrawn) {
          profit = (await Index.gameInst.jackpotForSharesInSessionForUser(sessionId).call()).profit;
          // console.log("jackpotForShares: ", profit.toString());
          totalAmount = totalAmount.plus(new BigNumber(profit));
        }
      } catch (error) {
        console.error("jackpotForSharesForCurrentAccount");
      }
    }

    return totalAmount;
  },

  profitForPurchasedShares: async function() {
    console.log("- profitForPurchasedShares");

    let totalAmount = new BigNumber("0");

    let participatedSessionsForUserResponse = await Index.gameInst.participatedSessionsForUser().call();
    let participatedSessionsForUser = participatedSessionsForUserResponse.sessions;
    console.log("profitForPurchasedShares - participatedSessionsForUser: ", participatedSessionsForUser.toString());

    let length = participatedSessionsForUser.length;
    let ongoingSessionIdx = await Index.gameInst.ongoingSessionIdx().call();
    
    // //  remove ongoing session
    // if (new BigNumber(participatedSessionsForUser[length-1]).comparedTo(new BigNumber(ongoingSessionIdx)) == 0) {
    //   participatedSessionsForUser.pop();
    //   length = participatedSessionsForUser.length;
    // }
    participatedSessionsForUser = participatedSessionsForUser.reverse();
    console.log("profitForPurchasedShares - participatedSessionsForUser: ", participatedSessionsForUser.toString());

    for (let i = 0; i < length; i++) {
      const sessionId = participatedSessionsForUser[i];
      // console.log("sessionId: ", sessionId);
      let profit = await Index.profitInSession(sessionId);
      totalAmount = totalAmount.plus(new BigNumber(profit));
    }

    return totalAmount;
  },

  profitInSession: async function(_sessionId) {
    console.log("-- profitInSession: ", _sessionId.toString());

    let totalAmount = new BigNumber("0");

    let purchasesInSession = (await Index.gameInst.purchasesInSessionForUser(_sessionId).call()).purchases;
    console.log("purchasesInSession: ", purchasesInSession.toString());
    let length = purchasesInSession.length;

    for (let i = 0; i < length; i++) {
      const profit = await Index.profitForPurchaseInSession(purchasesInSession[i], _sessionId);
      totalAmount = totalAmount.plus(new BigNumber(profit));
    }

    return totalAmount;
  },

  profitForPurchaseInSession: async function(_purchaseId, _sessionId) {
    console.log("--- profitForPurchaseInSession: purchase:", _purchaseId.toString(), ",session:", _sessionId.toString());

    let totalAmount = new BigNumber("0");

    let purchaseCountInSession = new BigNumber((await Index.gameInst.purchaseCountInSession(_sessionId).call()).purchases);
    console.log("purchaseCountInSession: ", purchaseCountInSession.toString());

    let lastPurchaseIdx = purchaseCountInSession.minus(new BigNumber("1"));
    if (new BigNumber(_purchaseId).comparedTo(lastPurchaseIdx) == 0) {
      console.log("--- Last purchase in Session - SKIP ---");
      return totalAmount;
    }

    let withdrawnOnPurchase = new BigNumber((await Index.gameInst.purchaseProfitInSessionWithdrawnOnPurchaseForUser(_purchaseId, _sessionId).call()).purchase);
    console.log("withdrawnOnPurchase: ", withdrawnOnPurchase.toString());

    let fromPurchase = new BigNumber(_purchaseId).plus(new BigNumber("1"));
    
    if (withdrawnOnPurchase.comparedTo(new BigNumber("0")) > 0) {
      //  alredy withdrawn on profit in past

      if (withdrawnOnPurchase.comparedTo(lastPurchaseIdx) == 0) {
        //  withdrawn on last purchase - return

        console.log("--- Nothing more to withdraw - SKIP ---");
        return totalAmount;
      }

      fromPurchase = withdrawnOnPurchase.plus(new BigNumber("1"));
    }
    console.log("fromPurchase: ", fromPurchase.toString());
    
    let purchaseCountWithProfit = purchaseCountInSession.minus(fromPurchase);
    let toPurchase = (purchaseCountWithProfit.comparedTo(Index.LOOP_LIMIT) == 1) ? fromPurchase.plus(Index.LOOP_LIMIT) : fromPurchase.plus(purchaseCountWithProfit).minus(new BigNumber("1"));
    console.log("toPurchase out: ", toPurchase.toString());

    let fetch = true;
    do {
      //  loop trough purchases
    let localFetch = true;
      do {
        //  loop until toPurchase < lastPurchaseIdx

        if (toPurchase.comparedTo(lastPurchaseIdx) == 0) {
          localFetch = false;
        }

        const profit = (await Index.gameInst.profitForPurchaseInSession(_purchaseId.toString(), _sessionId.toString(), fromPurchase.toString(), toPurchase.toString()).call()).profit;
        console.log("profit: ", profit.toString());
        totalAmount = totalAmount.plus(new BigNumber(profit));
  
        fromPurchase = toPurchase.plus(new BigNumber("1"));
        if (toPurchase.comparedTo(lastPurchaseIdx) < 0) {
          toPurchase = (fromPurchase.plus(Index.LOOP_LIMIT).comparedTo(lastPurchaseIdx) <= 0) ? fromPurchase.plus(Index.LOOP_LIMIT) : lastPurchaseIdx;
          console.log("toPurchase in: ", toPurchase.toString());
        }
      } while (localFetch);

      fetch = lastPurchaseIdx.comparedTo(toPurchase) == 1;
    } while (fetch);

    return totalAmount;
  },

  setLanguage: function(_langId) {
    console.log("     setLanguage: " + _langId);

    Index.languageSource = lang_en;

    switch (_langId) {
      case 1:
        console.log("Index.languageSource: 普通话");
        // Index.languageSource = lang_ch;
        break;
      case 2:
        console.log("Index.languageSource: 粵語");
        // Index.languageSource = lang_jp;
        break;
      case 3:
        console.log("Index.languageSource: Deutsch");
        // Index.languageSource = lang_de;
        break;
      case 4:
        console.log("Index.languageSource: Español");
        // Index.languageSource = lang_es;
        break;
    
      default:
        console.log("Index.languageSource: English");
        break;
    }

    Index.updateLanguages(Index.languageSource);
  },

  /** UI */

  showKnowMoreClicked: function () {
    console.log("     showKnowMore");
    
    document.getElementById("more_options_btn").classList.add('opacity_0');
    document.getElementById("more_options_btn").style.display = "none";

    document.getElementById("know_more").style.display = "block";
    document.getElementById("know_more").classList.remove('opacity_0');
  },

  buyShares: async function() {
    console.log("     buyShares");

    let sharesNumber = document.getElementById("purchaseAmount").value;
    console.log("sharesNumber: ", sharesNumber);
    if (sharesNumber < 1) {
      alert("Please enter valid shares number. Minimum 1 share to buy.");
      return;
    } else if (!Number.isInteger(parseFloat(sharesNumber))) {
      alert("Whole number only.");
      return;
    }

    Index.showSpinner(true, Index.languageSource.spinner_text);

    //  calculate TRX amount
    let txValue = await Index.purchaseValue(sharesNumber);
    console.log("txValue: ", txValue.toString());

    //  TODO: correct website address
    // let websiteAddr = Index.WEBSITE_ADDR; // OWNER
    // if (sharesNumber % 2) {
    //   //  TEST
    //   websiteAddr = "TMEp8iyoudx2owrHxFJQMbDn6ND16jJxZW" //  website1
    // }

    try {
      let purchaseTx = await Index.gameInst.purchase(Index.WEBSITE_ADDR).send({
        feeLimit:100000000,
        callValue: txValue,
        shouldPollResponse: true
      });

      document.getElementById("purchaseAmount").value = "";
      Index.showSpinner(false);
      Index.updateData();
    } catch (error) {
      console.error(error);
      document.getElementById("purchaseAmount").value = "";
      Index.showSpinner(false);
      alert("Error: " + error.message);
    }
  },

  withdrawJackpotClicked: async function() {
    console.log("     withdrawJackpot");
    
    //  withdraw previous jpts
    let jackpotForAddr = await Index.gameInst.jackpotForAddr(Index.currentAccount).call();
    console.log("jackpotForAddr: ", jackpotForAddr.toString());
    if ((new BigNumber(jackpotForAddr)).comparedTo(new BigNumber("0")) > 0) {
      Index.withdrawJackpot();
      return;
    }
    alert('Sorry, no jackpot for you.');
  },

  withdrawjackpotForSharesInSessionClicked: async function() {
    console.log("     withdrawjackpotForSharesInSession - 20% from each jp");

    Index.showSpinner(true, Index.languageSource.spinner_text);

    let participatedSessionsForUser = (await Index.gameInst.participatedSessionsForUser().call()).sessions;
    let length = participatedSessionsForUser.length;
    let ongoingSessionIdx = await Index.gameInst.ongoingSessionIdx().call();
    if (new BigNumber(participatedSessionsForUser[length-1]).comparedTo(new BigNumber(ongoingSessionIdx)) == 0) {
      participatedSessionsForUser.pop();
    }
    let sessions = [];
    for (let i = 0; i < participatedSessionsForUser.length; i++) {
      let sessionId = participatedSessionsForUser[i];
      if (!(await Index.gameInst.isJackpotForSharesInSessionWithdrawnForUser(sessionId).call()).withdrawn) {
        sessions.push(sessionId.toString());
      }
    }
    
    length = participatedSessionsForUser.length;

    let promptResult = prompt(("Session ids with pending jackpot: " + sessions + ". Which one to withdraw?"));
    let sessionIdx;
    if (promptResult == null || promptResult == "") {
      Index.showSpinner(false);
      return;
    } else {
      sessionIdx = parseInt(promptResult);
      if (!Number.isInteger(sessionIdx)) {
        Index.showSpinner(false);
        alert("Wrong session id selected.");
        return;
      }
    }

    try {
      let withdrawJackpotforSharesTx = await Index.gameInst.withdrawjackpotForSharesInSession(sessionIdx).send({
        feeLimit:100000000,
        shouldPollResponse: true
      });

      // console.log("withdrawJackpotforSharesTx: ", withdrawJackpotforSharesTx);
      Index.showSpinner(false);
      Index.updateData();
    } catch (error) {
        console.error(error);
        Index.showSpinner(false);
        alert("Error: " + error.message);
    }
  },

  withdrawjackpotForSharesInSessionPromptClicked: async function(_sessionId) {
    console.log("     withdrawjackpotForSharesInSessionPromptClicked: ", _sessionId);
  },

  /**
   * Withdraw implemented by single purchase
   */
  withdrawSharesProfitClicked: async function() {
    console.log("     withdrawSharesProfit");

    let sessionsToCheckForProfitForShares = await Index.sessionsToCheckForProfitForShares();
    console.log("sessionsToCheckForProfitForShares - sessionsToCheckForProfitForShares: ", sessionsToCheckForProfitForShares.toString());
    
    let sessionsLength = sessionsToCheckForProfitForShares.length;

    if (sessionsLength == 0) {
      alert("No sessions participated.");
      return;
    }

    Index.showSpinner(true, Index.languageSource.spinner_text);

    for (let i = 0; i < sessionsLength; i++) {
      const sessionId = sessionsToCheckForProfitForShares[i];
      console.log("sessionId: ", sessionId.toString());

      let purchaseCountInSession = new BigNumber((await Index.gameInst.purchaseCountInSession(sessionId).call()).purchases);
      console.log("purchaseCountInSession: ", purchaseCountInSession.toString());
      
      let lastPurchaseIdx = purchaseCountInSession.minus(new BigNumber("1"));
      
      let userPurchasesInSession = (await Index.gameInst.purchasesInSessionForUser(sessionId).call()).purchases;
      console.log("userPurchasesInSession: ", userPurchasesInSession.toString());
      let userPurchasesInSessionLength = userPurchasesInSession.length;

      for (let j = 0; j < userPurchasesInSessionLength; j ++) {
        let purchaseId = new BigNumber(userPurchasesInSession[j]);
        console.log("purchaseId: ", purchaseId.toString());

        if (purchaseId.comparedTo(lastPurchaseIdx) == 0) {
          console.log("--- Last purchase in Session - SKIP ---");
          continue;
        }

        let withdrawnOnPurchase = new BigNumber((await Index.gameInst.purchaseProfitInSessionWithdrawnOnPurchaseForUser(purchaseId.toString(), sessionId.toString()).call()).purchase);
        console.log("withdrawnOnPurchase: ", withdrawnOnPurchase.toString());

        if (withdrawnOnPurchase.comparedTo(lastPurchaseIdx) == 0) {
          console.log("--- Total withdrawn - SKIP ---");
        } else if (withdrawnOnPurchase.comparedTo(lastPurchaseIdx) > 0) {
          throw("withdrawSharesProfitClicked - withdrawnOnPurchase:", withdrawnOnPurchase);
        } else {
          await Index.withdrawSharesProfitForPurchaseInSession(purchaseId, sessionId);
          return;
        }
      }
    }   
    alert("No profit for purchased shares");
    Index.showSpinner(false);
  },

  /** HELPERS */

  sessionsToCheckForProfitForShares: async function() {
    let participatedSessionsForUserResponse = await Index.gameInst.participatedSessionsForUser().call();
    let participatedSessionsForUser = participatedSessionsForUserResponse.sessions;

    let length = participatedSessionsForUser.length;
    let ongoingSessionIdx = await Index.gameInst.ongoingSessionIdx().call();
    
    // //  remove ongoing session
    // if (new BigNumber(participatedSessionsForUser[length-1]).comparedTo(new BigNumber(ongoingSessionIdx)) == 0) {
    //   participatedSessionsForUser.pop();
    // }
    return participatedSessionsForUser.reverse();
  },

  withdrawSharesProfitForPurchaseInSession: async function(_purchaseId, _sessionId) {
    console.log("withdrawSharesProfitForPurchase:", _purchaseId.toString(), " InSession:", _sessionId.toString());

    if (confirm("Profit for purchased shares withdrawal. Multiple withdrawals may be required to withdraw total profit.")) {
      try {
        let withdrawProfitForSharesTx = await Index.gameInst.withdrawProfitForPurchaseInSession(_purchaseId.toString(), _sessionId.toString(), Index.LOOP_LIMIT.toString()).send({
          feeLimit:100000000,
          shouldPollResponse: true
        });
  
        // console.log("withdrawSharesProfitForPurchaseInSession: ", withdrawProfitForSharesTx);
        Index.updateData();
      } catch (error) {
          console.error(error);
          Index.showSpinner(false);
          alert("Error: " + error.message);
      }
    } else {
      Index.showSpinner(false);
    }
  },

  withdrawJackpot: async function() {
    Index.showSpinner(true, Index.languageSource.spinner_text);
    try {
      let withdrawJackpotTx = await Index.gameInst.withdrawJackpot().send({
        feeLimit:100000000,
        shouldPollResponse: true
      });

      // console.log("withdrawJackpotTx: ", withdrawJackpotTx);
      Index.showSpinner(false);
      Index.updateData();
    } catch (error) {
        console.error(error);
        Index.showSpinner(false);
        alert("Error: " + error.message);
    }
  },

  blocksUntilStageFinish: async function() {
    let ongoingStage = new BigNumber(await Index.gameInst.ongoingStage().call());
    // console.log("ongoingStage: ", ongoingStage.toString());
    
    let blocksForStage = new BigNumber(await Index.gameInst.blocksForStage(ongoingStage.toString()).call());
    // console.log("blocksForStage: ", blocksForStage.toString());
    
    let latestPurchaseBlock = new BigNumber(await Index.gameInst.latestPurchaseBlock().call());
    // console.log("latestPurchaseBlock: ", latestPurchaseBlock.toString());
    
    let winningBlock = latestPurchaseBlock.plus(blocksForStage);
    // console.log("winningBlock: ", winningBlock.toString());

    let currentBlock = (await tronWeb.trx.getCurrentBlock()).block_header.raw_data.number;
    // console.log("currentBlock: ", currentBlock.toString());

    let blocksLeft = winningBlock.minus(currentBlock);
    // console.log("blocksLeft: ", blocksLeft.toString());

    return blocksLeft;
  },

  isStageExpired: async function() {
    let ongoingStage = new BigNumber(await Index.gameInst.ongoingStage().call());
    // console.log("ongoingStage: ", ongoingStage.toString());
    
    let blocksForStage = new BigNumber(await Index.gameInst.blocksForStage(ongoingStage.toString()).call());
    // console.log("blocksForStage: ", blocksForStage.toString());
    
    let latestPurchaseBlock = new BigNumber(await Index.gameInst.latestPurchaseBlock().call());
    // console.log("latestPurchaseBlock: ", latestPurchaseBlock.toString());
    
    let winningBlock = latestPurchaseBlock.plus(blocksForStage);
    // console.log("winningBlock: ", winningBlock.toString());

    let currentBlock = (await tronWeb.trx.getCurrentBlock()).block_header.raw_data.number;
    // console.log("currentBlock: ", currentBlock.toString());

    let blocksLeft = winningBlock.minus(currentBlock);
    // console.log("blocksLeft: ", blocksLeft.toString());

    // console.log("EXPIRED: ", (blocksLeft.comparedTo(new BigNumber("0")) <= 0));
    return (blocksLeft.comparedTo(new BigNumber("0")) <= 0);
  },

  showError: function (_errorType) {
    let errorText = "";
    console.log("_errorType: ", _errorType);

    switch (_errorType) {
      case this.ErrorType.noTronLink:
        errorText = "TronLink is not connected. Please, install and log in into TronLink.";
      break;

      case this.ErrorType.wrongNode:
        errorText = "Please, select Main Chain - Mainnet inTronLink.";
      break;

      case this.ErrorType.noInst:
        errorText = "ERROR: contract instance failed.";
      break;
    }

    document.getElementById("error_view_text").textContent = errorText;
    document.getElementById("error_view").style.display = "block";
  },

  hideError: function () {
    document.getElementById("error_view_text").textContent = "";
    document.getElementById("error_view").style.display = "none";
  },

  showSpinner: function(_show, _text) {
    document.getElementById("spinner_text").textContent = _text ? _text : "Transaction is being mining…";
    document.getElementById("spinner_view").style.display = _show ? "block" : "none";
  },

  showNotifViewJP: function(_show) {
    console.log("showNotifViewJP: ", _show);
    document.getElementById("notif_view_jp").style.display = _show ? "block" : "none";
  },

  purchaseValue: async function(_sharesNumber) {
    let useDefaults = false;
    let ongoingStage = await Index.gameInst.ongoingStage().call();

    if ((await Index.isStageExpired())) {
      useDefaults = true;
      ongoingStage = 0;
    }

    let sharesToPurchase = _sharesNumber;
    let resultValueBN = new BigNumber(0);
    do {
      console.log("ongoingStage: ", ongoingStage);
      let sharesForStageToPurchase = (useDefaults) ? await Index.gameInst.sharesForStageToPurchaseOriginal(ongoingStage).call() : await Index.gameInst.sharesForStageToPurchase(ongoingStage).call();
      console.log("sharesForStageToPurchase: ", sharesForStageToPurchase);

      if (sharesForStageToPurchase > sharesToPurchase) {
        resultValueBN = resultValueBN.plus(await Index.sharesPrice(sharesToPurchase, ongoingStage));
        sharesToPurchase = 0;
      } else {
        resultValueBN = resultValueBN.plus(await Index.sharesPrice(sharesForStageToPurchase, ongoingStage));
        sharesToPurchase -= sharesForStageToPurchase;
        ongoingStage += 1;
      }
      console.log("resultValueBN:            ", resultValueBN.toString());
      console.log("\n");
    } while (sharesToPurchase > 0);

    return resultValueBN;
  },

  sharesPrice: async function(_sharesNumber, _stage) {
    let sharePriceForStage = await Index.gameInst.sharePriceForStage(_stage).call();
    console.log("sharePriceForStage: ", sharePriceForStage.toString());
    return new BigNumber(_sharesNumber.toString()).multipliedBy(sharePriceForStage);
  },

  updateLanguages: (_languageSource) => {
    document.getElementById("menu_1").innerText = _languageSource.menu_1;
    document.getElementById("menu_2").innerText = _languageSource.menu_2;
    document.getElementById("menu_3").innerText = _languageSource.menu_3;
    document.getElementById("menu_4").innerText = _languageSource.menu_4;
    document.getElementById("m_menu_1").innerText = _languageSource.m_menu_1;
    document.getElementById("m_menu_2").innerText = _languageSource.m_menu_2;
    document.getElementById("m_menu_3").innerText = _languageSource.m_menu_3;
    document.getElementById("m_menu_4").innerText = _languageSource.m_menu_4;
    document.getElementById("main_title").innerText = _languageSource.main_title;
    document.getElementById("intro_sentence").innerText = _languageSource.intro_sentence;
    document.getElementById("currentjkstatus").innerText = _languageSource.currentjkstatus;
    document.getElementById("will_win_in").innerHTML = _languageSource.will_win_in;
    document.getElementById("current_stage_txt").innerText = _languageSource.current_stage_txt;
    document.getElementById("current_share_price_txt").innerText = _languageSource.current_share_price_txt;
    document.getElementById("error_view_text").innerText = _languageSource.error_view_text;
    document.getElementById("spinner_text").innerText = _languageSource.spinner_text;
    document.getElementById("buy_share_btn").innerText = _languageSource.buy_share_btn;
    document.getElementById("my_wallet_intro").innerText = _languageSource.my_wallet_intro;
    document.getElementById("my_current_earning").innerText = _languageSource.my_current_earning;
    document.getElementById("withdraw_n_1").innerText = _languageSource.withdraw_n_1;
    document.getElementById("more_options_btn").innerText = _languageSource.more_options_btn;
    document.getElementById("withdraw_explain").innerText = _languageSource.withdraw_explain;
    document.getElementById("withdraw_explain_btn").innerText = _languageSource.withdraw_explain_btn;
    document.getElementById("jp_for_shares").innerText = _languageSource.jp_for_shares;
    document.getElementById("jp_for_shares_btn").innerText = _languageSource.jp_for_shares_btn;
    document.getElementById("jp").innerText = _languageSource.jp;
    document.getElementById("jp_btn").innerText = _languageSource.jp_btn;
    document.getElementById("title_2").innerText = _languageSource.title_2;
    document.getElementById("p_1").innerText = _languageSource.p_1;
    document.getElementById("title_3").innerText = _languageSource.title_3;
    document.getElementById("p_2").innerText = _languageSource.p_2;
    document.getElementById("form_submit_1").innerText = _languageSource.form_submit_1;
    document.getElementById("title_4").innerText = _languageSource.title_4;
    document.getElementById("p_3").innerText = _languageSource.p_3;
    document.getElementById("form_submit_2").innerText = _languageSource.form_submit_2;
    document.getElementById("title_5").innerText = _languageSource.title_5;
    document.getElementById("p_4").innerText = _languageSource.p_4;
    document.getElementById("form_submit_3").innerText = _languageSource.form_submit_3;
    document.getElementById("white").innerText = _languageSource.white;
    document.getElementById("how_to_play_1").innerText = _languageSource.how_to_play_1;
    document.getElementById("how_to_play_2").innerText = _languageSource.how_to_play_2;
    document.getElementById("how_to_play_3").innerText = _languageSource.how_to_play_3;
    document.getElementById("how_to_play_4").innerText = _languageSource.how_to_play_4;
    document.getElementById("how_to_play_5").innerText = _languageSource.how_to_play_5;
    document.getElementById("contact_1").innerText = _languageSource.contact_1;
    document.getElementById("contact_2").innerText = _languageSource.contact_2;
    document.getElementById("contact_3").innerText = _languageSource.contact_3;
    document.getElementById("contact_4").innerText = _languageSource.contact_4;
    document.getElementById("contact_5").innerText = _languageSource.contact_5;
  }
}

window.onload = function() {
  setTimeout(function() {
    if (!window.tronWeb) {
      // console.error("NO window.tronWeb - onload");
      Index.showError(Index.ErrorType.wrongNode);
    } else {
      // console.log("YES window.tronWeb - onload");

      Index.hideError();
      Index.setup();

      if (tronWeb.fullNode.host == 'https://api.trongrid.io' &&
          tronWeb.solidityNode.host == 'https://api.trongrid.io' &&
          tronWeb.eventServer.host == 'https://api.trongrid.io') {
            Index.hideError();
            Index.setup();
        } else if (tronWeb.fullNode.host == 'https://api.shasta.trongrid.io' &&
        tronWeb.solidityNode.host == 'https://api.shasta.trongrid.io' &&
        tronWeb.eventServer.host == 'https://api.shasta.trongrid.io') {
          //  TEST TODO shasta
          Index.hideError();
          Index.setup();
      } else {
          Index.showError(Index.ErrorType.wrongNode);
        }
      }
  }, 500);
};

window.addEventListener('message', function (e) {
  if (e.data.message && e.data.message.action == "setAccount") {
    console.log("message - setAccount");
    // console.log("setAccount event e", e)

    if (Index.currentAccount == e.data.message.data.address) {
      return;
    }

    if (tronWeb.fullNode.host == 'https://api.trongrid.io' &&
        tronWeb.solidityNode.host == 'https://api.trongrid.io' &&
        tronWeb.eventServer.host == 'https://api.trongrid.io') {
        
        Index.currentAccount = (e.data.message.data.address) ? e.data.message.data.address : "";
        if (Index.currentAccount.length == 0) {
          Index.showError(Index.ErrorType.noTronLink);
          return;
        }

        Index.hideError();
    } else if (tronWeb.fullNode.host == 'https://api.shasta.trongrid.io' &&
    tronWeb.solidityNode.host == 'https://api.shasta.trongrid.io' &&
    tronWeb.eventServer.host == 'https://api.shasta.trongrid.io') {
      //  TEST TODO shasta    
    Index.currentAccount = (e.data.message.data.address) ? e.data.message.data.address : "";
    if (Index.currentAccount.length == 0) {
      Index.showError(Index.ErrorType.noTronLink);
      return;
    }

    Index.hideError();
  } else {
      Index.showError(Index.ErrorType.wrongNode);
      return;
    }
    setTimeout(Index.setup, 500);
  }

  if (e.data.message && e.data.message.action == "setNode") {
    console.log("message - setNode");
      // console.log("setNode event e", e)
      // console.log("setNode event", e.data.message)
      if (e.data.message.data.node.chain == '_') {
          // console.log("tronLink currently selects the main chain")

          if (e.data.message.data.node.fullNode == 'https://api.trongrid.io' &&
              e.data.message.data.node.solidityNode == 'https://api.trongrid.io' &&
              e.data.message.data.node.eventServer == 'https://api.trongrid.io') {
                Index.hideError();
          } else if (e.data.message.data.node.fullNode == 'https://api.shasta.trongrid.io' &&
              e.data.message.data.node.solidityNode == 'https://api.shasta.trongrid.io' &&
              e.data.message.data.node.eventServer == 'https://api.shasta.trongrid.io') {
                //  TEST TODO shasta    
                Index.hideError();
          } else {
            Index.showError(Index.ErrorType.wrongNode);
            return;
          }
      } else{
          // console.log("tronLink currently selects the side chain")
          Index.showError(Index.ErrorType.wrongNode);
          return;
      }
      setTimeout(Index.setup, 500);
  }
})

window.Index = Index;