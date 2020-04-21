//  TODO:
//  - node check + showError
//  "test addr"

import BigNumber from "bignumber.js";

const Index = {
  Config: {
    "tokenAddress": "TWTdVDwj7NcqPDNi4X9d9Gm29jDZJDSfg1",
    "tokenAddressHex": "41e0c29a2703d967d685eda81d92f63b2867a2ab32",
  
    "gameAddress": "TSQLJmCcQUFWyPEuX25c9qAt1uJaorabd4",
    "gameAddressHex": "41b442827b2c8959cf08524825b66d1cb00eab27b6"
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
    Index.gameInst = await tronWeb.contract().at(Index.Config.gameAddressHex);
    // console.log("gameInst: ", Index.gameInst);
    Index.tokenInst = await tronWeb.contract().at(Index.Config.tokenAddressHex);
    // console.log("tokenInst: ", Index.tokenInst);

    Index.updateJackpot();
    Index.updateWinner();
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
}

// window.onload = fu[nction() {
//   if (!window.tronWeb) {
//     console.error("NO window.tronWeb - onload");
//   } else {
//     console.log("YES window.tronWeb - onload");
//   }
// };]

window.addEventListener('message', function (e) {
  if (e.data.message && e.data.message.action == "tabReply") {
    console.log("message - tabReply");
      // console.log("tabReply event e", e)
      // console.log("tabReply event", e.data.message)
      if (e.data.message.data.data.node.chain == '_'){
        if (e.data.message.data.data.node.fullNode == 'https://api.trongrid.io' &&
            e.data.message.data.data.node.solidityNode == 'https://api.trongrid.io' &&
            e.data.message.data.data.node.eventServer == 'https://api.trongrid.io') {
              Index.hideError();
              Index.currentAccount = (e.data.message.data.data.address) ? e.data.message.data.data.address : "";
            } else {
              // Index.showError(Index.ErrorType.wrongNode);
            }
      }else{
        // Index.showError(Index.ErrorType.wrongNode);
      }
      setTimeout(Index.setup, 500);
  }

  if (e.data.message && e.data.message.action == "setAccount") {
    console.log("message - setAccount");
      Index.currentAccount = (e.data.message.data.address) ? e.data.message.data.address : "";
      if (Index.currentAccount.length == 0) {
        // Index.showError(Index.ErrorType.noTronLink);
      }
      setTimeout(Index.setup, 500);
  }
  if (e.data.message && e.data.message.action == "setNode") {
    console.log("message - setNode");
      // console.log("setNode event e", e)
      // console.log("setNode event", e.data.message)
      if (e.data.message.data.node.chain == '_'){
          // console.log("tronLink currently selects the main chain")

          if (e.data.message.data.node.fullNode == 'https://api.trongrid.io' &&
              e.data.message.data.node.solidityNode == 'https://api.trongrid.io' &&
              e.data.message.data.node.eventServer == 'https://api.trongrid.io') {
                Index.hideError();
          } else {
            // Index.showError(Index.ErrorType.wrongNode);
          }
      } else{
          // console.log("tronLink currently selects the side chain")
          // Index.showError(Index.ErrorType.wrongNode);
      }
      setTimeout(Index.setup, 500);
  }
})

window.Index = Index;