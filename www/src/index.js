//  TODO:
//  - node check + showError
//  "test addr"
//  window.onload

import BigNumber from "bignumber.js";

const Index = {
  Config: {
    "tokenAddress": "TGMzDuhbqzSrATmRXaXL2HnrqrkSLtADxK",
    "gameAddress": "TXJUKGty4DueYuwr8XhdcQyrHRdYZAi7kL"
  },

  ErrorType: {
    noTronLink: 0,
    wrongNode: 1,
    noInst: 2,
  },

  currentAccount: "",
  gameInst: null,
  tokenInst: null,


  setup: async function() {
    console.log("\n     SETUP\n");

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

    Index.updateJackpot();
    Index.updateWinner();
    Index.updateCountdown();
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
    console.log("blocksLeft: ", blocksLeft.toString());
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

  updateCurrentEarnings: async function() {
    console.log("     updateCurrentEarnings");

    //  JP
    let jp = await Index.jackpotAmountForCurrentAccount();
    console.log("jackpotAmountForCurrentAccount: ", jp.toString());
    document.getElementById("jp").textContent = "If you are the winner withdraw the jackpot here: " + tronWeb.fromSun(jp);

    //  JP for shares
    let jpForShares = await Index.jackpotForSharesForCurrentAccount();
    console.log("jackpotForSharesForCurrentAccount: ", jpForShares.toString());
    document.getElementById("jp_for_shares").textContent = "Withdraw your part of the 20% from the jackpot here: " + tronWeb.fromSun(jpForShares);
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

    //  ongoing jp if stage finished, but no next purchaseAmount
    let blocksLeft = new BigNumber(await Index.blocksUntilStageFinish());
    console.log("blocksLeft: ", blocksLeft.toString());
    if (blocksLeft.comparedTo(new BigNumber("0")) <= 0) {
      let ongoingWinner = tronWeb.address.fromHex(await Index.gameInst.ongoingWinner().call());
      console.log("ongoingWinner 2: ", ongoingWinner);
      let ongoingJackpot = new BigNumber(await Index.gameInst.ongoingJackpot().call());
      ongoingJackpot = ongoingJackpot.multipliedBy(new BigNumber("8")).dividedBy(new BigNumber("10"));
      console.log("ongoingJackpot: ", ongoingJackpot.toString());
      
      if ((ongoingWinner.localeCompare(Index.currentAccount) == 0) && (ongoingJackpot.comparedTo(BigNumber("0")) == 1)) {
        totalAmount = totalAmount.plus(ongoingJackpot);
        console.log("totalAmount ongoing: ", totalAmount.toString());
      }
    }

    return totalAmount;
  },

  jackpotForSharesForCurrentAccount: async function() {
    console.log("jackpotForSharesForCurrentAccount");
    
    let totalAmount = new BigNumber("0");

    let participatedSessionsForUser = (await Index.gameInst.participatedSessionsForUser().call()).sessions;
    console.log("participatedSessionsForUser: ", participatedSessionsForUser);

    let length = participatedSessionsForUser.length;
    for (let i = 0; i < length; i++) {
      const sessionId = participatedSessionsForUser[i];
      let profit = (await Index.gameInst.jackpotForSharesInSessionForUser(sessionId).call()).profit;
      console.log("to withdraw: ", profit.toString());
      totalAmount = totalAmount.plus(new BigNumber(profit));
    }

    return totalAmount;
  },

  // profitForPurchasedShares: async function() {
  //   console.log("profitForPurchasedShares");

  //   let totalAmount = new BigNumber("0");

    // let participatedSessionsForUser = await Index.gameInst.participatedSessionsForUser().call();
    // console.log("participatedSessionsForUser: ", participatedSessionsForUser);

    // if (participatedSessionsForUser.sessions.length == 0) {
    //   return new BigNumber("0");
    // }

  //   participatedSessionsForUser.sessions.forEach(async sessionId => {
  //     let purchasesInSessionForUser = await Index.gameInst.purchasesInSessionForUser(sessionId).call();
  //     console.log("purchasesInSessionForUser: ", purchasesInSessionForUser);

  //     purchasesInSessionForUser.forEach(async purchaseId => {
  //       if (1) {
  //         let profitForPurchaseInSession = await Index.gameInst.profitForPurchaseInSession(purchaseId, sessionId, ).call();
  //         console.log("profitForPurchaseInSession: ", profitForPurchaseInSession);
  //       }
  //     });
  //   });

  //   return totalAmount;
  // },


  setLanguage: function(_langId) {
    console.log("     setLanguage: " + _langId);
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
    Index.showSpinner(true);

    let sharesNumber = document.getElementById("purchaseAmount").value;
    console.log("sharesNumber: ", sharesNumber);
    if (sharesNumber < 1) {
      alert("Please enter valid shares number. Minimum 1 share to buy.");
      return;
    } else if (!Number.isInteger(parseFloat(sharesNumber))) {
      alert("Whole number only.");
      return;
    }

    //  calculate TRX amount
    let txValue = await Index.purchaseValue(sharesNumber);
    console.log("txValue: ", txValue.toString());

    //  TODO: correct website address
    let TEST_websiteAddr = "TQphDXxumffC81VTaChhNuFuK1efRAYQJ4"; // OWNER
    if (sharesNumber % 2) {
      TEST_websiteAddr = "TZ75wbxf6x1mMaNRenbMMfREmxsBdGdZZS" //  website1
    }

    try {
      let purchaseTx = await Index.gameInst.purchase(TEST_websiteAddr).send({
        feeLimit:100000000,
        callValue: txValue,
        shouldPollResponse: true
      });

      Index.updateData();
      Index.showSpinner(false);
    } catch (error) {
      console.error(error);
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

    //  withdraw ongoing jp
    let blocksLeft = new BigNumber(await Index.blocksUntilStageFinish());
    console.log("blocksLeft: ", blocksLeft.toString());
    if (blocksLeft.comparedTo(new BigNumber("0")) <= 0) {
      let ongoingWinner = tronWeb.address.fromHex(await Index.gameInst.ongoingWinner().call());
      console.log("ongoingWinner 3: ", ongoingWinner);
      let ongoingJackpot = await Index.gameInst.ongoingJackpot().call();
      console.log("ongoingJackpot: ", ongoingJackpot.toString());
      if ((ongoingWinner.localeCompare(Index.currentAccount) == 0) && (new BigNumber(ongoingJackpot).comparedTo(BigNumber("0")) == 1)) {
        Index.withdrawJackpot();
        return;
      }
    }
    alert('Sorry, no jackpot for you.');
  },

  withdrawSharesProfitClicked: function() {
    console.log("     withdrawSharesProfit");

  },

  withdrawBernardPartProfitClicked: async function() {
    console.log("     withdrawBernardPartProfit - 20% from each jp");

    let participatedSessionsForUser = (await Index.gameInst.participatedSessionsForUser().call()).sessions;
    let sessions = [];
    participatedSessionsForUser.forEach(sessionId => {
      sessions.push(sessionId.toString());
    });

    prompt(("You participated inSessions: " + sessions + ". Which to withdraw?"));
  },

  /** HELPERS */
  withdrawJackpot: async function() {
    Index.showSpinner(true);
    try {
      let withdrawJackpotTx = await Index.gameInst.withdrawJackpot().send({
        feeLimit:100000000,
        shouldPollResponse: true
      });

      // console.log("withdrawJackpotTx: ", withdrawJackpotTx);
      Index.updateData();
      Index.showSpinner(false);
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

  showSpinner: function(_show) {
    document.getElementById("spinner_view").style.display = _show ? "block" : "none";
  },

  showNotifViewJP: function(_show) {
    console.log("showNotifViewJP: ", _show);
    document.getElementById("notif_view_jp").style.display = _show ? "block" : "none";
  },

  purchaseValue: async function(_sharesNumber) {
    let useDefaults = false;
    let ongoingStage = await Index.gameInst.ongoingStage().call();

    let blocksLeft = new BigNumber(await Index.blocksUntilStageFinish());
    if (blocksLeft.comparedTo(new BigNumber("0")) <= 0) {
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
      return;


      if (tronWeb.fullNode.host == 'https://api.trongrid.io' &&
          tronWeb.solidityNode.host == 'https://api.trongrid.io' &&
          tronWeb.eventServer.host == 'https://api.trongrid.io') {
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
          // Index.showError(Index.ErrorType.noTronLink);
          // return;
        }

        Index.hideError();
    } else {
      // Index.showError(Index.ErrorType.wrongNode);
      // return;
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
          } else {
            // Index.showError(Index.ErrorType.wrongNode);
            // return;
          }
      } else{
          // console.log("tronLink currently selects the side chain")
          // Index.showError(Index.ErrorType.wrongNode);
          // return;
      }
      setTimeout(Index.setup, 500);
  }
})

window.Index = Index;