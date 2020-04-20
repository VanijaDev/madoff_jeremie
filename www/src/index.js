import TronWeb from 'tronweb';

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
  setup: function() {
    console.log("addr: ", window.tronWeb.defaultAddress.base58);
    
  },

  setLanguage: function(_langId) {
    console.log("setLanguage: " + _langId);
  }
}

window.onload = function() {
  if (!window.tronWeb) {
    console.error("NO window.tronWeb - onload");
  } else {
    console.log("YES window.tronWeb - onload");
  }

  Index.setup();
};

window.Index = Index;