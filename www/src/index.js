//  TODO:
//  - node check + showError
//  "test addr"
//  window.onload

import BigNumber from "bignumber.js";

const Index = {
  Config: {
    "tokenAddress": "TJGsSiXyj1JQbAF1ze1D2PqnPu9sLR38HZ",  
    "gameAddress": "TL5V8hdXd4iADitkz6wcgVtXMkSJCy5DGf"
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
    console.log("\nSETUP\n");

    //  test addr
    Index.currentAccount =  window.tronWeb.defaultAddress.base58;
    // console.log("currentAccount: ", Index.currentAccount);

    // console.log("Block: ", await tronWeb.trx.getCurrentBlock());

    //  Instances
    try {
      Index.gameInst = await tronWeb.contract().at(tronWeb.address.toHex(Index.Config.gameAddress));
      console.log("gameInst: ", Index.gameInst);
      Index.tokenInst = await tronWeb.contract().at(tronWeb.address.toHex(Index.Config.tokenAddress));
      // console.log("tokenInst: ", Index.tokenInst);
    } catch (error) {
      console.error("No contract instanses.");
      Index.showError(Index.ErrorType.wrongNode);
      return;
    }

    Index.setupEventListeners();
    Index.updateJackpot();
    Index.updateWinner();
    Index.updateCountdown();

  },

  setupEventListeners: function() {
    // Index.gameInst.Purchase().watch((err, eventResult) => {
    //   if (err) {
    //     return console.error('Error with Purchase event:', err);
    //   }
    //   if (eventResult) { 
    //     console.log('eventResult Purchase :',eventResult);
    //   }
    // });


  },

  updateJackpot: async function() {
    let jp = await Index.gameInst.ongoingJackpot().call();
    document.getElementById("currentJackpot").textContent = jp.toString();
  },

  updateWinner: async function() {
    let winner = await Index.gameInst.ongoingWinner().call();
    console.log("winner: ", winner);
    if (winner != "410000000000000000000000000000000000000000") {
      console.log("winner hex : ", tronWeb.address.fromHex(""));
      document.getElementById("currentWinner").textContent = tronWeb.address.fromHex(winner);
    }
  },

  updateCountdown: async function() {
    let latestPurchaseBlock = await Index.gameInst.latestPurchaseBlock().call();
    console.log("latestPurchaseBlock: ", latestPurchaseBlock);
    console.log("latestPurchaseBlock: ", latestPurchaseBlock.toString());

    // jQuery('#clock').countdown('2021/10/19');
  },

  setLanguage: function(_langId) {
    console.log("setLanguage: " + _langId);
  },

  /** UI */

  showKnowMore: function () {
    console.log("showKnowMore");
    
    document.getElementById("more_options_btn").classList.add('opacity_0');
    document.getElementById("more_options_btn").style.display = "none";

    document.getElementById("know_more").style.display = "block";
    document.getElementById("know_more").classList.remove('opacity_0');
  },

  buyShares: async function() {
    console.log("buyShares");

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

      console.log("purchaseTx: ", purchaseTx);

    } catch (error) {
        console.log(error);
    }
  },

  /** HELPERS */
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

  purchaseValue: async function(_sharesNumber) {
    let ongoingStage = await Index.gameInst.ongoingStage().call();
    console.log("ongoingStage: ", ongoingStage);

    let sharesToPurchase = _sharesNumber;
    let resultValueBN = new BigNumber(0);
    do {
      let sharesForStageToPurchase = await Index.gameInst.sharesForStageToPurchase(ongoingStage).call();
      console.log("sharesForStageToPurchase: ", sharesForStageToPurchase);

      if (sharesForStageToPurchase > sharesToPurchase) {
        resultValueBN = resultValueBN.plus(await Index.sharesPrice(sharesToPurchase, ongoingStage));
        sharesToPurchase = 0;
      } else {
        resultValueBN = resultValueBN.plus(await Index.sharesPrice(sharesForStageToPurchase, ongoingStage));
        sharesToPurchase -= sharesForStageToPurchase;
        ongoingStage += 1;
      }
      console.log("resultValueBN: ", resultValueBN.toString());
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