import BigNumber from "bignumber.js";

const Index = {
  Config: {
    "tokenAddress": "TEPKHWEea8AH4YCKmbofWqihH38eoNz4Mo",
    "gameAddress": "TVLdijjw8aryn2sF7KqNS4KtUnKHAGnaGZ"
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
    // console.log("\n     SETUP\n");

    //  test addr
    Index.currentAccount =  window.tronWeb.defaultAddress.base58;
    if (!Index.currentAccount) {
      Index.shawFakeCountdown();
    }

    //  Instances
    try {
      Index.gameInst = await tronWeb.contract().at(tronWeb.address.toHex(Index.Config.gameAddress));
      Index.tokenInst = await tronWeb.contract().at(tronWeb.address.toHex(Index.Config.tokenAddress));
    } catch (error) {
      console.error("No contract instanses.");
      Index.showError(Index.ErrorType.wrongNode);
      return;
    }

    Index.updateData();
  },

  updateData: function() {
    // console.log("\n     UPDATE\n");
    Index.showSpinner(true, " ");

    Index.updateOwningSharesCount();
    Index.updateJackpot();
    Index.updateWinner();
    Index.updateCountdown();
    Index.updateCurrentStagePrice();
    Index.updateCurrentEarnings();
  },

  updateOwningSharesCount: async function() {
    let participatedSessionsForUserResponse = await Index.gameInst.participatedSessionsForUser().call();
    let participatedSessionsForUser = participatedSessionsForUserResponse.sessions;

    let sharesTotal = new BigNumber("0");
    for (let i = 0; i < participatedSessionsForUser.length; i ++) {
      let shares = new BigNumber((await Index.gameInst.sharesPurchasedInSessionByPurchaser(participatedSessionsForUser[i].toString()).call()).shares);
      sharesTotal = sharesTotal.plus(shares);
    }
    document.getElementById("share_amount").textContent = sharesTotal.toString();
  },

  updateJackpot: async function() {
    let jp = await Index.gameInst.ongoingJackpot().call();
    document.getElementById("currentJackpot").textContent = tronWeb.fromSun(jp);
  },

  updateWinner: async function() {
    let winner = await Index.gameInst.ongoingWinner().call();
    if (winner.localeCompare("410000000000000000000000000000000000000000") == 0) {
      document.getElementById("currentWinner").textContent = "0x0";
    } else {
      document.getElementById("currentWinner").textContent = tronWeb.address.fromHex(winner);
    }
  },

  shawFakeCountdown: function() {
    let nowDate = new Date();
    let winDate = new Date(nowDate.setSeconds(nowDate.getSeconds() + parseInt(600)));
    jQuery('#clock').countdown(winDate);
  },

  updateCountdown: async function() {
    let blocksLeft = new BigNumber(await Index.blocksUntilStageFinish());
    if (blocksLeft.comparedTo(new BigNumber("0")) == 1) {
      const BLOCK_MINING_TIME = new BigNumber("3");
      let secLeft = BLOCK_MINING_TIME.multipliedBy(blocksLeft);

      let nowDate = new Date();
      let winDate = new Date(nowDate.setSeconds(nowDate.getSeconds() + parseInt(secLeft)));

      jQuery('#clock').countdown(winDate);
    } else {
      jQuery('#clock').countdown('2000/01/01');
    }

    document.getElementById("clock_hours").innerText = this.languageSource.clock_hours;
    document.getElementById("clock_minutes").innerText = this.languageSource.clock_minutes;
    document.getElementById("clock_seconds").innerText = this.languageSource.clock_seconds;
  },

  updateCurrentStagePrice: async function() {
    let ongoingStage = new BigNumber("0");

    if (!(await Index.isStageExpired())) {
      ongoingStage = new BigNumber(await Index.gameInst.ongoingStage().call());
    }

    document.getElementById("current_stage").textContent = ongoingStage.toString();

    let sharePriceForStage = new BigNumber(await Index.gameInst.sharePriceForStage(ongoingStage.toString()).call());
    document.getElementById("current_share_price").textContent = tronWeb.fromSun(sharePriceForStage.toString());
  },

  updateCurrentEarnings: async function() {
    //  JP
    let jp = await Index.jackpotAmountForCurrentAccount();
    document.getElementById("jp").textContent = "If you are the winner withdraw the jackpot here: " + tronWeb.fromSun(jp) + " TRX";

    //  JP for shares
    let jpForShares = await Index.jackpotForSharesForCurrentAccount();
    document.getElementById("jp_for_shares").textContent = "Withdraw your part of the 20% from the jackpot here: " + tronWeb.fromSun(jpForShares) + " TRX";

    //  purchased shares
    let purchasedSharesProfit = await Index.profitForPurchasedShares();
    document.getElementById("current_earnings_amount").textContent = tronWeb.fromSun((new BigNumber(jp)).plus(new BigNumber(jpForShares)).plus(new BigNumber(purchasedSharesProfit)).toString());

    Index.showSpinner(false);
  },

  jackpotAmountForCurrentAccount: async function() {
    let totalAmount = new BigNumber("0");

    //  previous jpts
    let jackpotForAddr = new BigNumber(await Index.gameInst.jackpotForAddr(Index.currentAccount).call());
    if (jackpotForAddr.comparedTo(new BigNumber("0")) > 0) {
      totalAmount = totalAmount.plus(jackpotForAddr);
    }

    return totalAmount;
  },

  jackpotForSharesForCurrentAccount: async function() {
    let totalAmount = new BigNumber("0");

    let participatedSessionsForUserResponse = await Index.gameInst.participatedSessionsForUser().call();
    let participatedSessionsForUser = participatedSessionsForUserResponse.sessions;

    let length = participatedSessionsForUser.length;
    let ongoingSessionIdx = await Index.gameInst.ongoingSessionIdx().call();
    if (new BigNumber(participatedSessionsForUser[length-1]).comparedTo(new BigNumber(ongoingSessionIdx)) == 0) {
      participatedSessionsForUser.pop();
      length = participatedSessionsForUser.length;
    }

    for (let i = 0; i < length; i++) {
      const sessionId = participatedSessionsForUser[i];
      let profit;
      try {
        if (!(await Index.gameInst.isJackpotForSharesInSessionWithdrawnForUser(sessionId).call()).withdrawn) {
          profit = (await Index.gameInst.jackpotForSharesInSessionForUser(sessionId).call()).profit;
          totalAmount = totalAmount.plus(new BigNumber(profit));
        }
      } catch (error) {
        console.error("jackpotForSharesForCurrentAccount");
      }
    }

    return totalAmount;
  },

  profitForPurchasedShares: async function() {
    let totalAmount = new BigNumber("0");

    let participatedSessionsForUserResponse = await Index.gameInst.participatedSessionsForUser().call();
    let participatedSessionsForUser = participatedSessionsForUserResponse.sessions;

    let length = participatedSessionsForUser.length;
    let ongoingSessionIdx = await Index.gameInst.ongoingSessionIdx().call();
    
    // //  remove ongoing session
    // if (new BigNumber(participatedSessionsForUser[length-1]).comparedTo(new BigNumber(ongoingSessionIdx)) == 0) {
    //   participatedSessionsForUser.pop();
    //   length = participatedSessionsForUser.length;
    // }
    participatedSessionsForUser = participatedSessionsForUser.reverse();
    for (let i = 0; i < length; i++) {
      const sessionId = participatedSessionsForUser[i];
      let profit = await Index.profitInSession(sessionId);
      totalAmount = totalAmount.plus(new BigNumber(profit));
    }

    return totalAmount;
  },

  profitInSession: async function(_sessionId) {
    let totalAmount = new BigNumber("0");

    let purchasesInSession = (await Index.gameInst.purchasesInSessionForUser(_sessionId).call()).purchases;
    let length = purchasesInSession.length;

    for (let i = 0; i < length; i++) {
      const profit = await Index.profitForPurchaseInSession(purchasesInSession[i], _sessionId);
      totalAmount = totalAmount.plus(new BigNumber(profit));
    }

    return totalAmount;
  },

  profitForPurchaseInSession: async function(_purchaseId, _sessionId) {
    let totalAmount = new BigNumber("0");

    let purchaseCountInSession = new BigNumber((await Index.gameInst.purchaseCountInSession(_sessionId).call()).purchases);

    let lastPurchaseIdx = purchaseCountInSession.minus(new BigNumber("1"));
    if (new BigNumber(_purchaseId).comparedTo(lastPurchaseIdx) == 0) {
      return totalAmount;
    }

    let withdrawnOnPurchase = new BigNumber((await Index.gameInst.purchaseProfitInSessionWithdrawnOnPurchaseForUser(_purchaseId, _sessionId).call()).purchase);
    let fromPurchase = new BigNumber(_purchaseId).plus(new BigNumber("1"));
    
    if (withdrawnOnPurchase.comparedTo(new BigNumber("0")) > 0) {
      //  alredy withdrawn on profit in past

      if (withdrawnOnPurchase.comparedTo(lastPurchaseIdx) == 0) {
        //  withdrawn on last purchase - return
        return totalAmount;
      }

      fromPurchase = withdrawnOnPurchase.plus(new BigNumber("1"));
    }
    
    let purchaseCountWithProfit = purchaseCountInSession.minus(fromPurchase);
    let toPurchase = (purchaseCountWithProfit.comparedTo(Index.LOOP_LIMIT) == 1) ? fromPurchase.plus(Index.LOOP_LIMIT) : fromPurchase.plus(purchaseCountWithProfit).minus(new BigNumber("1"));

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
        totalAmount = totalAmount.plus(new BigNumber(profit));
  
        fromPurchase = toPurchase.plus(new BigNumber("1"));
        if (toPurchase.comparedTo(lastPurchaseIdx) < 0) {
          toPurchase = (fromPurchase.plus(Index.LOOP_LIMIT).comparedTo(lastPurchaseIdx) <= 0) ? fromPurchase.plus(Index.LOOP_LIMIT) : lastPurchaseIdx;
        }
      } while (localFetch);

      fetch = lastPurchaseIdx.comparedTo(toPurchase) == 1;
    } while (fetch);

    return totalAmount;
  },

  setLanguage: function(_langId) {
    Index.languageSource = lang_en;

    switch (_langId) {
      case 1:
        console.log("Index.languageSource: Korean");
        Index.languageSource = lang_korean;
        break;
      case 2:
        console.log("Index.languageSource: 简体  >> Simplified CN");
        Index.languageSource = lang_cn_simpl;
        break;
      case 3:
        console.log("Index.languageSource: 繁体  >> trad CN");
        Index.languageSource = lang_cn_trad;
        break;
    
      default:
        console.log("Index.languageSource: English");
        break;
    }

    Index.updateLanguages(Index.languageSource);
  },

  /** UI */

  showKnowMoreClicked: function () {
    document.getElementById("more_options_btn").classList.add('opacity_0');
    document.getElementById("more_options_btn").style.display = "none";

    document.getElementById("know_more").style.display = "block";
    document.getElementById("know_more").classList.remove('opacity_0');
  },

  buyShares: async function() {
    let sharesNumber = document.getElementById("purchaseAmount").value;
    if (sharesNumber < 1) {
      alert("Please enter valid shares number. Minimum 1 share to buy.");
      return;
    } else if (!Number.isInteger(parseFloat(sharesNumber))) {
      alert("Whole number only.");
      return;
    }

    Index.showSpinner(true, Index.languageSource.spinner_text);
    setTimeout(() => {
      Index.showSpinner(false);
    }, 5000);

    //  calculate TRX amount
    let txValue = await Index.purchaseValue(sharesNumber);

    try {
      let purchaseTx = await Index.gameInst.purchase(Index.WEBSITE_ADDR).send({
        feeLimit:100000000,
        callValue: txValue,
        shouldPollResponse: false
      });

      document.getElementById("purchaseAmount").value = "";
      // Index.updateData();
      setTimeout(() => {
        location.reload();
      }, 3000);
    } catch (error) {
      console.error(error);
      document.getElementById("purchaseAmount").value = "";
      alert("Error: " + error.message);
    }
  },

  withdrawJackpotClicked: async function() {
    //  withdraw previous jpts
    let jackpotForAddr = await Index.gameInst.jackpotForAddr(Index.currentAccount).call();
    if ((new BigNumber(jackpotForAddr)).comparedTo(new BigNumber("0")) > 0) {
      Index.withdrawJackpot();
      return;
    }
    alert('Sorry, no jackpot for you.');
  },

  withdrawjackpotForSharesInSessionClicked: async function() {
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

    setTimeout(() => {
      Index.showSpinner(false);
    }, 5000);
    try {
      let withdrawJackpotforSharesTx = await Index.gameInst.withdrawjackpotForSharesInSession(sessionIdx).send({
        feeLimit:100000000,
        shouldPollResponse: true
      });

      // console.log("withdrawJackpotforSharesTx: ", withdrawJackpotforSharesTx);
      Index.updateData();
    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    }
  },

  /**
   * Withdraw implemented by single purchase
   */
  withdrawSharesProfitClicked: async function() {
    let sessionsToCheckForProfitForShares = await Index.sessionsToCheckForProfitForShares();    
    let sessionsLength = sessionsToCheckForProfitForShares.length;

    if (sessionsLength == 0) {
      alert("No sessions participated.");
      return;
    }

    Index.showSpinner(true, Index.languageSource.spinner_text);

    for (let i = 0; i < sessionsLength; i++) {
      const sessionId = sessionsToCheckForProfitForShares[i];

      let purchaseCountInSession = new BigNumber((await Index.gameInst.purchaseCountInSession(sessionId).call()).purchases);
      
      let lastPurchaseIdx = purchaseCountInSession.minus(new BigNumber("1"));
      
      let userPurchasesInSession = (await Index.gameInst.purchasesInSessionForUser(sessionId).call()).purchases;
      let userPurchasesInSessionLength = userPurchasesInSession.length;

      for (let j = 0; j < userPurchasesInSessionLength; j ++) {
        let purchaseId = new BigNumber(userPurchasesInSession[j]);

        if (purchaseId.comparedTo(lastPurchaseIdx) == 0) {
          continue;
        }

        let withdrawnOnPurchase = new BigNumber((await Index.gameInst.purchaseProfitInSessionWithdrawnOnPurchaseForUser(purchaseId.toString(), sessionId.toString()).call()).purchase);

        if (withdrawnOnPurchase.comparedTo(lastPurchaseIdx) == 0) {
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
    if (confirm("Profit for purchased shares withdrawal. Multiple withdrawals may be required to withdraw total profit.")) {
      setTimeout(() => {
        Index.showSpinner(false);
      }, 5000);
      try {
        let withdrawProfitForSharesTx = await Index.gameInst.withdrawProfitForPurchaseInSession(_purchaseId.toString(), _sessionId.toString(), Index.LOOP_LIMIT.toString()).send({
          feeLimit:100000000,
          shouldPollResponse: true
        });
  
        // console.log("withdrawSharesProfitForPurchaseInSession: ", withdrawProfitForSharesTx);
        Index.updateData();
      } catch (error) {
          console.error(error);
          alert("Error: " + error.message);
      }
    } else {
      Index.showSpinner(false);
    }
  },

  withdrawJackpot: async function() {
    Index.showSpinner(true, Index.languageSource.spinner_text);
    setTimeout(() => {
      Index.showSpinner(false);
    }, 5000);

    try {
      let withdrawJackpotTx = await Index.gameInst.withdrawJackpot().send({
        feeLimit:100000000,
        shouldPollResponse: true
      });

      // console.log("withdrawJackpotTx: ", withdrawJackpotTx);
      Index.updateData();
    } catch (error) {
        console.error(error);
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

    switch (_errorType) {
      case this.ErrorType.noTronLink:
        errorText = Index.languageSource.error_wrongNode;
      break;

      case this.ErrorType.wrongNode:
        errorText = Index.languageSource.error_wrongNode;
      break;

      case this.ErrorType.noInst:
        errorText = Index.languageSource.error_noInst;
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
      let sharesForStageToPurchase = (useDefaults) ? await Index.gameInst.sharesForStageToPurchaseOriginal(ongoingStage).call() : await Index.gameInst.sharesForStageToPurchase(ongoingStage).call();

      if (sharesForStageToPurchase > sharesToPurchase) {
        resultValueBN = resultValueBN.plus(await Index.sharesPrice(sharesToPurchase, ongoingStage));
        sharesToPurchase = 0;
      } else {
        resultValueBN = resultValueBN.plus(await Index.sharesPrice(sharesForStageToPurchase, ongoingStage));
        sharesToPurchase -= sharesForStageToPurchase;
        ongoingStage += 1;
      }

    } while (sharesToPurchase > 0);

    return resultValueBN;
  },

  sharesPrice: async function(_sharesNumber, _stage) {
    let sharePriceForStage = await Index.gameInst.sharePriceForStage(_stage).call();
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
  Index.setLanguage(0);

  setTimeout(function() {
    if (!window.tronWeb) {
      // console.error("NO window.tronWeb - onload");
      Index.showError(Index.ErrorType.noTronLink);
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
    // console.log("message - setAccount");
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
    // console.log("message - setNode");
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