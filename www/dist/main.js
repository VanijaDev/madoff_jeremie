/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("// import TronWeb from 'tronweb';\n\n// const HttpProvider = TronWeb.providers.HttpProvider;\n// const fullNode = new HttpProvider('https://api.trongrid.io');\n// const solidityNode = new HttpProvider('https://api.trongrid.io');\n// const eventServer = 'https://api.trongrid.io/';\n\n// const tronWeb = new TronWeb(\n//   fullNode,\n//   solidityNode,\n//   eventServer,\n//  );\n// window.tronWeb = tronWeb;\n\n\nconst Index = {\n  ErrorType: {\n    noTronLink: 0,\n    wrongNode: 1\n  },\n\n  currentAccount: \"\",\n\n  setup: function() {\n    if (window.tronWeb.defaultAddress.base58) {\n      this.currentAccount = window.tronWeb.defaultAddress.base58;\n    }\n    console.log(\"this.currentAccount: \", this.currentAccount);\n\n    if (this.currentAccount.length == 0) {\n      this.showError(this.ErrorType.noTronLink);\n    }\n  },\n\n  setLanguage: function(_langId) {\n    console.log(\"setLanguage: \" + _langId);\n  },\n\n  /** UI */\n\n  showKnowMore: function () {\n    console.log(\"showKnowMore\");\n    \n    document.getElementById(\"more_options_btn\").classList.add('opacity_0');\n    document.getElementById(\"more_options_btn\").style.display = \"none\";\n\n    document.getElementById(\"know_more\").style.display = \"block\";\n    document.getElementById(\"know_more\").classList.remove('opacity_0');\n  },\n\n  /** HELPERS */\n  showError: function (_errorType) {\n    console.log(\"_errorType: \", _errorType);\n    let errorText = \"\";\n\n    switch (_errorType) {\n      case this.ErrorType.noTronLink:\n        errorText = \"TronLink is not connected. Please, install and log in into TronLink\";\n      break;\n\n      case this.ErrorType.wrongNode:\n        errorText = \"Please, select Main Chain - Mainnet inTronLink\";\n      break;\n    }\n\n    document.getElementById(\"know_more\").textContent = errorText;\n    document.getElementById(\"error_view\").style.display = \"block\";\n  },\n\n  hideError: function () {\n    document.getElementById(\"error_view_text\").textContent = \"\";\n    document.getElementById(\"error_view\").style.display = \"none\";\n  },\n}\n\nwindow.onload = function() {\n  if (!window.tronWeb) {\n    console.error(\"NO window.tronWeb - onload\");\n  } else {\n    console.log(\"YES window.tronWeb - onload\");\n  }\n\n  setTimeout(Index.setup, 500);\n};\n\nwindow.addEventListener('message', function (e) {\n  // if (e.data.message && e.data.message.action == \"tabReply\") {\n  //     console.log(\"tabReply event\", e.data.message)\n  //     if (e.data.message.data.data.node.chain == '_'){\n  //         console.log(\"tronLink currently selects the main chain\")\n  //     }else{\n  //         console.log(\"tronLink currently selects the side chain\")\n  //     }\n  // }\n\n  if (e.data.message && e.data.message.action == \"setAccount\") {\n      // console.log(\"setAccount event e\", e)\n      // console.log(\"setAccount event\", e.data.message)\n      // console.log(\"current address:\", e.data.message.data.address)\n\n      Index.currentAccount = (e.data.message.data.address) ? window.tronWeb.defaultAddress.base58 : \"\";\n      if (Index.currentAccount.length == 0) {\n        Index.showError(Index.ErrorType.noTronLink);\n      }\n  }\n  if (e.data.message && e.data.message.action == \"setNode\") {\n      // console.log(\"setNode event e\", e)\n      // console.log(\"setNode event\", e.data.message)\n      if (e.data.message.data.node.chain == '_'){\n          // console.log(\"tronLink currently selects the main chain\")\n\n          if (e.data.message.data.node.fullNode == 'https://api.trongrid.io' &&\n              e.data.message.data.node.solidityNode == 'https://api.trongrid.io' &&\n              e.data.message.data.node.eventServer == 'https://api.trongrid.io') {\n                Index.hideError();\n          } else {\n            Index.showError(Index.ErrorType.wrongNode);\n          }\n      } else{\n          // console.log(\"tronLink currently selects the side chain\")\n          Index.showError(Index.ErrorType.wrongNode);\n      }\n\n  }\n})\n\nwindow.Index = Index;\n\n//# sourceURL=webpack:///./src/index.js?");

/***/ })

/******/ });