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
  gettronweb: function() {
    if(window.tronWeb){
      console.log("YES window.tronWeb: ", window.tronWeb);

      if(window.tronWeb.defaultAddress.base58) {
        document.write("Yes, catch it: ",window.tronWeb.defaultAddress.base58)
      } else {
        console.log("NO window.tronWeb.defaultAddress.base58");
      }
    } else {
      console.log("NO window.tronWeb");
    }
  }
}

window.onload = function() {
  if (!window.tronWeb) {
    console.error("NO window.tronWeb - onload");
  } else {
    console.log("YES window.tronWeb - onload");
  }

  this.setup();
};

window.Index = Index;