// import TronWeb from 'tronweb';

// const HttpProvider = TronWeb.providers.HttpProvider;
// const fullNode = new HttpProvider('https://api.trongrid.io');
// const solidityNode = new HttpProvider('https://api.trongrid.io');
// const eventServer = 'https://api.trongrid.io/';

// const tronWeb = new TronWeb(
//   fullNode,
//   solidityNode,
//   eventServer,
//  );
// window.tronWeb = tronWeb;


const Index = {
  ErrorType: {
    noTronLink: 0,
    wrongNode: 1
  },

  currentAccount: "",

  setup: function() {
    if (window.tronWeb.defaultAddress.base58) {
      this.currentAccount = window.tronWeb.defaultAddress.base58;
    }
    console.log("this.currentAccount: ", this.currentAccount);

    if (!this.currentAccount || this.currentAccount.length == 0) {
      Index.showError(Index.ErrorType.noTronLink);
    } else if (window.tronWeb.fullNode != 'https://api.trongrid.io' ||
              window.tronWeb.solidityNode != 'https://api.trongrid.io' ||
              window.tronWeb.eventServer != 'https://api.trongrid.io') {
                Index.showError(Index.ErrorType.wrongNode);
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
    console.log("_errorType: ", _errorType);
    let errorText = "";

    switch (_errorType) {
      case this.ErrorType.noTronLink:
        console.log("_errorType: TL", this.ErrorType.noTronLink);
        errorText = "TronLink is not connected. Please, install and log in into TronLink";
      break;

      case this.ErrorType.wrongNode:
        console.log("_errorType: WN", this.ErrorType.wrongNode);
        errorText = "Please, select Main Chain - Mainnet inTronLink";
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

window.onload = function() {
  if (!window.tronWeb) {
    console.error("NO window.tronWeb - onload");
  } else {
    console.log("YES window.tronWeb - onload");
  }

  setTimeout(Index.setup, 500);
};

window.addEventListener('message', function (e) {
  // if (e.data.message && e.data.message.action == "tabReply") {
  //     console.log("tabReply event", e.data.message)
  //     if (e.data.message.data.data.node.chain == '_'){
  //         console.log("tronLink currently selects the main chain")
  //     }else{
  //         console.log("tronLink currently selects the side chain")
  //     }
  // }

  if (e.data.message && e.data.message.action == "setAccount") {
      // console.log("setAccount event e", e)
      // console.log("setAccount event", e.data.message)
      // console.log("current address:", e.data.message.data.address)

      Index.currentAccount = (e.data.message.data.address) ? window.tronWeb.defaultAddress.base58 : "";
      if (Index.currentAccount.length == 0) {
        Index.showError(Index.ErrorType.noTronLink);
      }
  }
  if (e.data.message && e.data.message.action == "setNode") {
      // console.log("setNode event e", e)
      // console.log("setNode event", e.data.message)
      if (e.data.message.data.node.chain == '_'){
          // console.log("tronLink currently selects the main chain")

          if (e.data.message.data.node.fullNode == 'https://api.trongrid.io' &&
              e.data.message.data.node.solidityNode == 'https://api.trongrid.io' &&
              e.data.message.data.node.eventServer == 'https://api.trongrid.io') {
                Index.hideError();
          } else {
            Index.showError(Index.ErrorType.wrongNode);
          }
      } else{
          // console.log("tronLink currently selects the side chain")
          Index.showError(Index.ErrorType.wrongNode);
      }

  }
})

window.Index = Index;