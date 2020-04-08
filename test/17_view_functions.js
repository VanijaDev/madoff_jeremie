const BernardsCutToken = artifacts.require("./BernardsCutToken");
const MadoffContract = artifacts.require("./MadoffContract");

const {
  BN,
  time,
  ether,
  balance,
  constants,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

const { expect } = require('chai');
const assert = require('assert');

contract("sharesPurchased", (accounts) => {
  const OWNER = accounts[0];
  const DEPLOYER = accounts[1];
  const WEBSITE_0 = "0x0000000000000000000000000000000000000000";
  const WEBSITE_1 = accounts[2];
  const WEBSITE_2 = accounts[3];
  const PURCHASER_0 = accounts[4];
  const PURCHASER_1 = accounts[5];
  const PURCHASER_2 = accounts[6];

  const BLOCKS_FOR_STAGE =                      [99,        90,       80,       70,       60,         50,         45,         40,         35,         30,         25,         20,         10,         5];
  const SHARES_FOR_STAGE_TO_PURCHASE =          [2500,      5000,     3125,     12500,    10000,      62500,      62500,      400000,     390625,     2000000,    562500,     10000000,   12500000,   25000000];
  const SHARES_FOR_STAGE_TO_PURCHASE_ORIGINAL = [2500,      5000,     3125,     12500,    10000,      62500,      62500,      400000,     390625,     2000000,    562500,     10000000,   12500000,   25000000];
  const SHARE_PRICE_FOR_STAGE =                 [10000000,  20000000, 40000000, 80000000, 125000000,  160000000,  200000000,  250000000,  320000000,  500000000,  800000000,  1000000000, 1000000000, 1000000000];


  let token;
  let madoffContract;

  beforeEach("setup", async () => {
    await time.advanceBlock();

    token = await BernardsCutToken.new(OWNER);
    madoffContract = await MadoffContract.new(OWNER, token.address);
  });

  describe("view functions", () => {
    it("should update purchaseCountInSession", async() => {
      //  0
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("0")), "purchaseCountInSession should be 0 for S0 in 0");

      //  1
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("1")), "purchaseCountInSession should be 1 for S0 in 1");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 2");
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 4;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 3");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("1")), "purchaseCountInSession should be 1 for S1 in 3");

      //  4
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 41;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 4");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S1 in 4");

      //  5
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 4;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 4;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 4;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 5");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("5")), "purchaseCountInSession should be 5 for S1 in 5");
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  6
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 6");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("5")), "purchaseCountInSession should be 5 for S1 in 6");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(2)).cmp(new BN("1")), "purchaseCountInSession should be 1 for S2 in 6");

      //  7
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] + SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 7");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("5")), "purchaseCountInSession should be 5 for S1 in 7");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(2)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S2 in 7");
    });
  });

  describe("jackpotForSharesInSessionForUser", () => {
    it("should fail if No jackpot yet (Session is still in progress)", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0), "No jackpot yet");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(2), "No jackpot yet");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(10), "No jackpot yet");
    });
    
    it("should fail if No shares for user", async() => {
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(1, (await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0})).cmp(new BN("0")), "should be > 0");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_1}), "No shares");
    });
    
    it("should return correct profit after multiple purchases in multiple Sessions in single Stage", async() => {
      //  0
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 18;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      //  jpt = 10000000 * 12 * 0.4 = 48 000 000
      //  prevSharesPart = 48 000 000 * 0.2 = 9 600 000
      //  sharePrice = 9 600 000 / 12 = 800 000
      //  CORRECT = 800 000 * 12 = 9 600 000
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0})).cmp(new BN("9600000")), "wrong value");


      //  1
      //  exceed S1
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 7;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 17;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 70;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 21;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      //  PURCHASER_0
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0})).cmp(new BN("9600000")), "wrong value for PURCHASER_0 for S0");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_0}), "No shares");

      //  jpt = 10000000 * 20 * 0.4 = 80 000 000
      //  prevSharesPart = 80 000 000 * 0.2 = 16 000 000
      //  sharePrice = 16 000 000 / 20 = 800 000

      //  CORRECT PURCHASER_1 = 800 000 * 2 = 1 600 000
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_1})).cmp(new BN("1600000")), "wrong value for PURCHASER_1 for S1");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_1}), "No shares");

      //  CORRECT PURCHASER_2 = 800 000 * 18 = 14 400 000
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_2})).cmp(new BN("14400000")), "wrong value for PURCHASER_2 for S1");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_2}), "No shares");


      //  2
      //  exceed S2
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }
      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 7;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  jpt = 10000000 * (7 + 17 + 70 + 21) * 0.4 = 460 000 000
      //  prevSharesPart = 460 000 000 * 0.2 = 92 000 000
      //  sharePrice = 92 000 000 / (7 + 17 + 70 + 21) = 800 000
      
      //  CORRECT PURCHASER_0 = 800 000 * 7 = 5 600 000
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(2, {from: PURCHASER_0})).cmp(new BN("5600000")), "wrong value for PURCHASER_0 for S2");
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0})).cmp(new BN("9600000")), "wrong value for PURCHASER_0 for S0");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_0}), "No shares");

      //  CORRECT PURCHASER_1 = 800 000 * 17 = 13 600 000
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(2, {from: PURCHASER_1})).cmp(new BN("13600000")), "wrong value for PURCHASER_1 for S2");
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_1})).cmp(new BN("1600000")), "wrong value for PURCHASER_1 for S1");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_1}), "No shares");

      //  CORRECT PURCHASER_2 = 800 000 * 91 = 72 800 000
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(2, {from: PURCHASER_2})).cmp(new BN("72800000")), "wrong value for PURCHASER_2 for S2");
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_2})).cmp(new BN("14400000")), "wrong value for PURCHASER_2 for S1");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_2}), "No shares");
    });

    it("should return correct profit after multiple purchases in multiple Sessions in multiple Stages", async() => {
      //  0
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[1] * 2000;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      //  jpt = 10000000 * 12 * 0.4 = 48 000 000
      //  prevSharesPart = 48 000 000 * 0.2 = 9 600 000
      //  sharePrice = 9 600 000 / 12 = 800 000
      //  CORRECT = 800 000 * 12 = 9 600 000
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0})).cmp(new BN("9600000")), "wrong value");

      //  1
      //  exceed S1
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2400;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 100 + SHARE_PRICE_FOR_STAGE[1] * 3000;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[1] * 2000;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });
      
      VALUE = SHARE_PRICE_FOR_STAGE[2] * 3100;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  PURCHASER_0
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0})).cmp(new BN("9600000")), "wrong value for PURCHASER_0 for S0");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_0}), "No shares");

      //  jpt = ((10000000 * 2500) + (20000000 * 2000)) * 0.4 = 26 000 000 000
      //  prevSharesPart = 26 000 000 000 * 0.2 = 5 200 000 000
      //  sharePrice = 5 200 000 000 / 4500 = 1 155 555

      //  CORRECT PURCHASER_1 = 1 155 555 * 2500 = 2 888 887 500
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_1})).cmp(new BN("2888887500")), "wrong value for PURCHASER_1 for S1");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_1}), "No shares");

      // //  CORRECT PURCHASER_2 = 1 155 555 * 2000 = 2 311 110 000
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_2})).cmp(new BN("2311110000")), "wrong value for PURCHASER_2 for S1");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_2}), "No shares");

      //  2
      //  exceed S2
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }
      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 7;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  jpt = ((10000000 * 2500) + (20000000 * 5000) + (40000000 * 3100)) * 0.4 = 99 600 000 000
      //  prevSharesPart = 99 600 000 000 * 0.2 = 19 920 000 000
      //  sharePrice = 19 920 000 000 / (2500 + 5000 + 3100) = 1 879 245
      
      //  CORRECT PURCHASER_0 = 1 879 245 * 5500 = 10 335 847 500
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(2, {from: PURCHASER_0})).cmp(new BN("10335847500")), "wrong value for PURCHASER_0 for S2");
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0})).cmp(new BN("9600000")), "wrong value for PURCHASER_0 for S0");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_0}), "No shares");

      //  CORRECT PURCHASER_1 = 0
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(2, {from: PURCHASER_1}), "No shares");
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_1})).cmp(new BN("2888887500")), "wrong value for PURCHASER_1 for S1");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_1}), "No shares");

      //  CORRECT PURCHASER_2 = 1 879 245 * 5100 = 9 584 149 500
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(2, {from: PURCHASER_2})).cmp(new BN("9584149500")), "wrong value for PURCHASER_2 for S2");
      assert.equal(0, (await madoffContract.jackpotForSharesInSessionForUser.call(1, {from: PURCHASER_2})).cmp(new BN("2311110000")), "wrong value for PURCHASER_2 for S1");
      await expectRevert(madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_2}), "No shares");
    });
  });

  describe("profitForPurchaseInSession", () => {
    it("should fail if not _fromPurchase > _purchase", async() => {
      //  purchases
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  test
      //  should pass
      await madoffContract.profitForPurchaseInSession.call(0, 0, 1, 2, {
        from: PURCHASER_0
      });
      await expectRevert(madoffContract.profitForPurchaseInSession.call(3, 0, 1, 2, {
        from: PURCHASER_0
      }), "Wrong _fromPurchase");
    });
    
    it("should fail if not _toPurchase >= _fromPurchase", async() => {
      //  purchases
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  test
      //  should pass
      await madoffContract.profitForPurchaseInSession.call(0, 0, 1, 2, {
        from: PURCHASER_0
      });
      await expectRevert(madoffContract.profitForPurchaseInSession.call(0, 0, 11, 2, {
        from: PURCHASER_0
      }), "Wrong _toPurchase");
    });

    it("should fail if _toPurchase exceeds", async() => {
      //  purchases
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  test
      //  should pass
      await madoffContract.profitForPurchaseInSession.call(0, 0, 1, 2, {
        from: PURCHASER_0
      });
      await expectRevert(madoffContract.profitForPurchaseInSession.call(0, 0, 1, 12, {
        from: PURCHASER_0
      }), "_toPurchase exceeds");
    });
    
    it("should return correct profit if _purchase == 0, purchases number == 2, _fromPurchase == 1, _toPurchase 1", async() => {
      //  purchases
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  test
      let purchaseSum = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString());
      let prevSharesPart = purchaseSum.mul(new BN("50")).div(new BN("100"));
      let sharePrice = prevSharesPart.div(new BN("12"));
      const PROFIT_CORRECT_AFTER_P1 = sharePrice.mul(new BN("12"));
      // console.log("PROFIT_CORRECT_AFTER_P1: ", PROFIT_CORRECT_AFTER_P1.toString());
      
      let profit = await madoffContract.profitForPurchaseInSession.call(0, 0, 1, 1, {
        from: PURCHASER_0
      });
      // console.log("profit:                  ", profit.toString());

      assert.equal(0, profit.cmp(PROFIT_CORRECT_AFTER_P1), "wrong profit");
    });
    
    it("should return correct profit if _purchase == 2, _fromPurchase == 3, _toPurchase == last available", async() => {
      //  purchases
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  4
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  5
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  6
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  7
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  8
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  purchaseSum
      let purchaseSum_3 = new BN((SHARE_PRICE_FOR_STAGE[0] * 12).toString()); //  10000000 * 12 = 120000000
      assert.equal(0, purchaseSum_3.cmp(new BN("120000000")), "wrong purchaseSum_3");
      
      let purchaseSum_4 = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString()); //  10000000 * 20 = 200000000
      assert.equal(0, purchaseSum_4.cmp(new BN("200000000")), "wrong purchaseSum_4");
      
      let purchaseSum_5 = new BN((SHARE_PRICE_FOR_STAGE[0] * 12).toString()); //  10000000 * 12 = 120000000
      assert.equal(0, purchaseSum_5.cmp(new BN("120000000")), "wrong purchaseSum_5");
      
      let purchaseSum_6 = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString()); //  10000000 * 20 = 200000000
      assert.equal(0, purchaseSum_6.cmp(new BN("200000000")), "wrong purchaseSum_6");
      
      let purchaseSum_7 = new BN((SHARE_PRICE_FOR_STAGE[0] * 2).toString()); //  10000000 * 2 = 20000000
      assert.equal(0, purchaseSum_7.cmp(new BN("20000000")), "wrong purchaseSum_7");
      
      let purchaseSum_8 = new BN((SHARE_PRICE_FOR_STAGE[0] * 10).toString()); //  10000000 * 10 = 100000000
      assert.equal(0, purchaseSum_8.cmp(new BN("100000000")), "wrong purchaseSum_8");
      
      //  prevSharesPart
      let prevSharesPart_3 = purchaseSum_3.mul(new BN("50")).div(new BN("100"));  //  120000000 * 0.5 = 60000000
      assert.equal(0, prevSharesPart_3.cmp(new BN("60000000")), "wrong prevSharesPart_3");

      let prevSharesPart_4 = purchaseSum_4.mul(new BN("50")).div(new BN("100"));  //  200000000 * 0.5 = 100000000
      assert.equal(0, prevSharesPart_4.cmp(new BN("100000000")), "wrong prevSharesPart_4");

      let prevSharesPart_5 = purchaseSum_5.mul(new BN("50")).div(new BN("100"));  //  120000000 * 0.5 = 60000000
      assert.equal(0, prevSharesPart_5.cmp(new BN("60000000")), "wrong prevSharesPart_5");

      let prevSharesPart_6 = purchaseSum_6.mul(new BN("50")).div(new BN("100"));  //  200000000 * 0.5 = 100000000
      assert.equal(0, prevSharesPart_6.cmp(new BN("100000000")), "wrong prevSharesPart_6");

      let prevSharesPart_7 = purchaseSum_7.mul(new BN("50")).div(new BN("100"));  //  20000000 * 0.5 = 10000000
      assert.equal(0, prevSharesPart_7.cmp(new BN("10000000")), "wrong prevSharesPart_7");

      let prevSharesPart_8 = purchaseSum_8.mul(new BN("50")).div(new BN("100"));  //  100000000 * 0.5 = 50000000
      assert.equal(0, prevSharesPart_8.cmp(new BN("50000000")), "wrong prevSharesPart_8");
      
      //  sharePrice
      let sharePrice_3 = prevSharesPart_3.div(new BN("54"));  //  60000000 / (12 + 20 + 22) = 1111111
      assert.equal(0, sharePrice_3.cmp(new BN("1111111")), "wrong sharePrice_3");
      // console.log(((await madoffContract.purchaseInfoInSession.call(3, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(3, 0))[2]).cmp(sharePrice_3), "wrong sharePrice_3 1");
      
      let sharePrice_4 = prevSharesPart_4.div(new BN("66"));  //  100000000 / (12 + 20 + 22 + 12) = 1515151
      assert.equal(0, sharePrice_4.cmp(new BN("1515151")), "wrong sharePrice_4");
      // console.log(((await madoffContract.purchaseInfoInSession.call(4, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(4, 0))[2]).cmp(sharePrice_4), "wrong sharePrice_4 1");
      
      let sharePrice_5 = prevSharesPart_5.div(new BN("86"));  //  60000000 / (12 + 20 + 22 + 12 + 20) = 697674
      assert.equal(0, sharePrice_5.cmp(new BN("697674")), "wrong sharePrice_5");
      // console.log(((await madoffContract.purchaseInfoInSession.call(5, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(5, 0))[2]).cmp(sharePrice_5), "wrong sharePrice_5 1");
      
      let sharePrice_6 = prevSharesPart_6.div(new BN("98"));  //  100000000 / (12 + 20 + 22 + 12 + 20 + 12) = 1020408
      assert.equal(0, sharePrice_6.cmp(new BN("1020408")), "wrong sharePrice_6");
      // console.log(((await madoffContract.purchaseInfoInSession.call(6, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(6, 0))[2]).cmp(sharePrice_6), "wrong sharePrice_6 1");
      
      let sharePrice_7 = prevSharesPart_7.div(new BN("118"));  //  10000000 / (12 + 20 + 22 + 12 + 20 + 12 + 20) = 84745
      assert.equal(0, sharePrice_7.cmp(new BN("84745")), "wrong sharePrice_7");
      // console.log(((await madoffContract.purchaseInfoInSession.call(7, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(7, 0))[2]).cmp(sharePrice_7), "wrong sharePrice_7 1");
      
      let sharePrice_8 = prevSharesPart_8.div(new BN("120"));  //  50000000 / (12 + 20 + 22 + 12 + 20 + 12 + 20 + 2) = 416666
      assert.equal(0, sharePrice_8.cmp(new BN("416666")), "wrong sharePrice_8");
      // console.log(((await madoffContract.purchaseInfoInSession.call(8, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(8, 0))[2]).cmp(sharePrice_8), "wrong sharePrice_8 1");
      
      
      const PROFIT_CORRECT = sharePrice_3.add(sharePrice_4).add(sharePrice_5).add(sharePrice_6).add(sharePrice_7).add(sharePrice_8).mul(new BN("22"));
      // console.log("PROFIT_CORRECT:          ", PROFIT_CORRECT.toString());
      
      let profit = await madoffContract.profitForPurchaseInSession.call(2, 0, 3, 8, {
        from: PURCHASER_0
      });
      // console.log("profit:                  ", profit.toString());

      assert.equal(0, profit.cmp(PROFIT_CORRECT), "wrong profit");
    });

    it("should return correct profit if _purchase == 2, _fromPurchase == 5, _toPurchase == last available", async() => {
      //  purchases
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  4
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  5
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  6
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  7
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  8
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  purchaseSum
      let purchaseSum_5 = new BN((SHARE_PRICE_FOR_STAGE[0] * 12).toString()); //  10000000 * 12 = 120000000
      assert.equal(0, purchaseSum_5.cmp(new BN("120000000")), "wrong purchaseSum_5");
      
      let purchaseSum_6 = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString()); //  10000000 * 20 = 200000000
      assert.equal(0, purchaseSum_6.cmp(new BN("200000000")), "wrong purchaseSum_6");
      
      let purchaseSum_7 = new BN((SHARE_PRICE_FOR_STAGE[0] * 2).toString()); //  10000000 * 2 = 20000000
      assert.equal(0, purchaseSum_7.cmp(new BN("20000000")), "wrong purchaseSum_7");
      
      let purchaseSum_8 = new BN((SHARE_PRICE_FOR_STAGE[0] * 10).toString()); //  10000000 * 10 = 100000000
      assert.equal(0, purchaseSum_8.cmp(new BN("100000000")), "wrong purchaseSum_8");
      
      //  prevSharesPart
      let prevSharesPart_5 = purchaseSum_5.mul(new BN("50")).div(new BN("100"));  //  120000000 * 0.5 = 60000000
      assert.equal(0, prevSharesPart_5.cmp(new BN("60000000")), "wrong prevSharesPart_5");

      let prevSharesPart_6 = purchaseSum_6.mul(new BN("50")).div(new BN("100"));  //  200000000 * 0.5 = 100000000
      assert.equal(0, prevSharesPart_6.cmp(new BN("100000000")), "wrong prevSharesPart_6");

      let prevSharesPart_7 = purchaseSum_7.mul(new BN("50")).div(new BN("100"));  //  20000000 * 0.5 = 10000000
      assert.equal(0, prevSharesPart_7.cmp(new BN("10000000")), "wrong prevSharesPart_7");

      let prevSharesPart_8 = purchaseSum_8.mul(new BN("50")).div(new BN("100"));  //  100000000 * 0.5 = 50000000
      assert.equal(0, prevSharesPart_8.cmp(new BN("50000000")), "wrong prevSharesPart_8");
      
      //  sharePrice
      let sharePrice_5 = prevSharesPart_5.div(new BN("86"));  //  60000000 / (12 + 20 + 22 + 12 + 20) = 697674
      assert.equal(0, sharePrice_5.cmp(new BN("697674")), "wrong sharePrice_5");
      // console.log(((await madoffContract.purchaseInfoInSession.call(5, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(5, 0))[2]).cmp(sharePrice_5), "wrong sharePrice_5 1");
      
      let sharePrice_6 = prevSharesPart_6.div(new BN("98"));  //  100000000 / (12 + 20 + 22 + 12 + 20 + 12) = 1020408
      assert.equal(0, sharePrice_6.cmp(new BN("1020408")), "wrong sharePrice_6");
      // console.log(((await madoffContract.purchaseInfoInSession.call(6, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(6, 0))[2]).cmp(sharePrice_6), "wrong sharePrice_6 1");
      
      let sharePrice_7 = prevSharesPart_7.div(new BN("118"));  //  10000000 / (12 + 20 + 22 + 12 + 20 + 12 + 20) = 84745
      assert.equal(0, sharePrice_7.cmp(new BN("84745")), "wrong sharePrice_7");
      // console.log(((await madoffContract.purchaseInfoInSession.call(7, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(7, 0))[2]).cmp(sharePrice_7), "wrong sharePrice_7 1");
      
      let sharePrice_8 = prevSharesPart_8.div(new BN("120"));  //  50000000 / (12 + 20 + 22 + 12 + 20 + 12 + 20 + 2) = 416666
      assert.equal(0, sharePrice_8.cmp(new BN("416666")), "wrong sharePrice_8");
      // console.log(((await madoffContract.purchaseInfoInSession.call(8, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(8, 0))[2]).cmp(sharePrice_8), "wrong sharePrice_8 1");
      
      
      const PROFIT_CORRECT = sharePrice_5.add(sharePrice_6).add(sharePrice_7).add(sharePrice_8).mul(new BN("22"));
      // console.log("PROFIT_CORRECT:          ", PROFIT_CORRECT.toString());
      
      let profit = await madoffContract.profitForPurchaseInSession.call(2, 0, 5, 8, {
        from: PURCHASER_0
      });
      // console.log("profit:                  ", profit.toString());

      assert.equal(0, profit.cmp(PROFIT_CORRECT), "wrong profit");
    });

    it("should return correct profit if _purchase == 2, _fromPurchase == 3, _toPurchase == 7", async() => {
      //  purchases
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  4
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  5
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  6
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  7
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  8
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  purchaseSum
      let purchaseSum_3 = new BN((SHARE_PRICE_FOR_STAGE[0] * 12).toString()); //  10000000 * 12 = 120000000
      assert.equal(0, purchaseSum_3.cmp(new BN("120000000")), "wrong purchaseSum_3");
      
      let purchaseSum_4 = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString()); //  10000000 * 20 = 200000000
      assert.equal(0, purchaseSum_4.cmp(new BN("200000000")), "wrong purchaseSum_4");
      
      let purchaseSum_5 = new BN((SHARE_PRICE_FOR_STAGE[0] * 12).toString()); //  10000000 * 12 = 120000000
      assert.equal(0, purchaseSum_5.cmp(new BN("120000000")), "wrong purchaseSum_5");
      
      let purchaseSum_6 = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString()); //  10000000 * 20 = 200000000
      assert.equal(0, purchaseSum_6.cmp(new BN("200000000")), "wrong purchaseSum_6");
      
      let purchaseSum_7 = new BN((SHARE_PRICE_FOR_STAGE[0] * 2).toString()); //  10000000 * 2 = 20000000
      assert.equal(0, purchaseSum_7.cmp(new BN("20000000")), "wrong purchaseSum_7");
      
      
      //  prevSharesPart
      let prevSharesPart_3 = purchaseSum_3.mul(new BN("50")).div(new BN("100"));  //  120000000 * 0.5 = 60000000
      assert.equal(0, prevSharesPart_3.cmp(new BN("60000000")), "wrong prevSharesPart_3");

      let prevSharesPart_4 = purchaseSum_4.mul(new BN("50")).div(new BN("100"));  //  200000000 * 0.5 = 100000000
      assert.equal(0, prevSharesPart_4.cmp(new BN("100000000")), "wrong prevSharesPart_4");

      let prevSharesPart_5 = purchaseSum_5.mul(new BN("50")).div(new BN("100"));  //  120000000 * 0.5 = 60000000
      assert.equal(0, prevSharesPart_5.cmp(new BN("60000000")), "wrong prevSharesPart_5");

      let prevSharesPart_6 = purchaseSum_6.mul(new BN("50")).div(new BN("100"));  //  200000000 * 0.5 = 100000000
      assert.equal(0, prevSharesPart_6.cmp(new BN("100000000")), "wrong prevSharesPart_6");

      let prevSharesPart_7 = purchaseSum_7.mul(new BN("50")).div(new BN("100"));  //  20000000 * 0.5 = 10000000
      assert.equal(0, prevSharesPart_7.cmp(new BN("10000000")), "wrong prevSharesPart_7");

      
      //  sharePrice
      let sharePrice_3 = prevSharesPart_3.div(new BN("54"));  //  60000000 / (12 + 20 + 22) = 1111111
      assert.equal(0, sharePrice_3.cmp(new BN("1111111")), "wrong sharePrice_3");
      // console.log(((await madoffContract.purchaseInfoInSession.call(3, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(3, 0))[2]).cmp(sharePrice_3), "wrong sharePrice_3 1");
      
      let sharePrice_4 = prevSharesPart_4.div(new BN("66"));  //  100000000 / (12 + 20 + 22 + 12) = 1515151
      assert.equal(0, sharePrice_4.cmp(new BN("1515151")), "wrong sharePrice_4");
      // console.log(((await madoffContract.purchaseInfoInSession.call(4, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(4, 0))[2]).cmp(sharePrice_4), "wrong sharePrice_4 1");
      
      let sharePrice_5 = prevSharesPart_5.div(new BN("86"));  //  60000000 / (12 + 20 + 22 + 12 + 20) = 697674
      assert.equal(0, sharePrice_5.cmp(new BN("697674")), "wrong sharePrice_5");
      // console.log(((await madoffContract.purchaseInfoInSession.call(5, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(5, 0))[2]).cmp(sharePrice_5), "wrong sharePrice_5 1");
      
      let sharePrice_6 = prevSharesPart_6.div(new BN("98"));  //  100000000 / (12 + 20 + 22 + 12 + 20 + 12) = 1020408
      assert.equal(0, sharePrice_6.cmp(new BN("1020408")), "wrong sharePrice_6");
      // console.log(((await madoffContract.purchaseInfoInSession.call(6, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(6, 0))[2]).cmp(sharePrice_6), "wrong sharePrice_6 1");
      
      let sharePrice_7 = prevSharesPart_7.div(new BN("118"));  //  10000000 / (12 + 20 + 22 + 12 + 20 + 12 + 20) = 84745
      assert.equal(0, sharePrice_7.cmp(new BN("84745")), "wrong sharePrice_7");
      // console.log(((await madoffContract.purchaseInfoInSession.call(7, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(7, 0))[2]).cmp(sharePrice_7), "wrong sharePrice_7 1");
      
      
      const PROFIT_CORRECT = sharePrice_3.add(sharePrice_4).add(sharePrice_5).add(sharePrice_6).add(sharePrice_7).mul(new BN("22"));
      // console.log("PROFIT_CORRECT:          ", PROFIT_CORRECT.toString());
      
      let profit = await madoffContract.profitForPurchaseInSession.call(2, 0, 3, 7, {
        from: PURCHASER_0
      });
      // console.log("profit:                  ", profit.toString());

      assert.equal(0, profit.cmp(PROFIT_CORRECT), "wrong profit");
    });

    it("should return correct profit if _purchase == 2, _fromPurchase == 5, _toPurchase == 6", async() => {
      //  purchases
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  4
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  5
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  6
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  7
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  8
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  purchaseSum
      let purchaseSum_5 = new BN((SHARE_PRICE_FOR_STAGE[0] * 12).toString()); //  10000000 * 12 = 120000000
      assert.equal(0, purchaseSum_5.cmp(new BN("120000000")), "wrong purchaseSum_5");
      
      let purchaseSum_6 = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString()); //  10000000 * 20 = 200000000
      assert.equal(0, purchaseSum_6.cmp(new BN("200000000")), "wrong purchaseSum_6");
      
      
      //  prevSharesPart
      let prevSharesPart_5 = purchaseSum_5.mul(new BN("50")).div(new BN("100"));  //  120000000 * 0.5 = 60000000
      assert.equal(0, prevSharesPart_5.cmp(new BN("60000000")), "wrong prevSharesPart_5");

      let prevSharesPart_6 = purchaseSum_6.mul(new BN("50")).div(new BN("100"));  //  200000000 * 0.5 = 100000000
      assert.equal(0, prevSharesPart_6.cmp(new BN("100000000")), "wrong prevSharesPart_6");


      //  sharePrice
      let sharePrice_5 = prevSharesPart_5.div(new BN("86"));  //  60000000 / (12 + 20 + 22 + 12 + 20) = 697674
      assert.equal(0, sharePrice_5.cmp(new BN("697674")), "wrong sharePrice_5");
      // console.log(((await madoffContract.purchaseInfoInSession.call(5, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(5, 0))[2]).cmp(sharePrice_5), "wrong sharePrice_5 1");
      
      let sharePrice_6 = prevSharesPart_6.div(new BN("98"));  //  100000000 / (12 + 20 + 22 + 12 + 20 + 12) = 1020408
      assert.equal(0, sharePrice_6.cmp(new BN("1020408")), "wrong sharePrice_6");
      // console.log(((await madoffContract.purchaseInfoInSession.call(6, 0))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(6, 0))[2]).cmp(sharePrice_6), "wrong sharePrice_6 1");
      
      
      const PROFIT_CORRECT = sharePrice_5.add(sharePrice_6).mul(new BN("22"));
      // console.log("PROFIT_CORRECT:          ", PROFIT_CORRECT.toString());
      
      let profit = await madoffContract.profitForPurchaseInSession.call(2, 0, 5, 6, {
        from: PURCHASER_0
      });
      // console.log("profit:                  ", profit.toString());

      assert.equal(0, profit.cmp(PROFIT_CORRECT), "wrong profit");
    });

    it("should return correct profit if _purchase == 2, _fromPurchase == 3, _toPurchase == last available in Session 1", async() => {
      //  purchases
      //  S0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });
      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }
      
      //  S1
      //  0
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  4
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  5
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  6
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  7
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  8
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  purchase to start new Session
      VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      //  purchaseSum
      let purchaseSum_3 = new BN((SHARE_PRICE_FOR_STAGE[0] * 12).toString()); //  10000000 * 12 = 120000000
      assert.equal(0, purchaseSum_3.cmp(new BN("120000000")), "wrong purchaseSum_3");
      
      let purchaseSum_4 = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString()); //  10000000 * 20 = 200000000
      assert.equal(0, purchaseSum_4.cmp(new BN("200000000")), "wrong purchaseSum_4");
      
      let purchaseSum_5 = new BN((SHARE_PRICE_FOR_STAGE[0] * 12).toString()); //  10000000 * 12 = 120000000
      assert.equal(0, purchaseSum_5.cmp(new BN("120000000")), "wrong purchaseSum_5");
      
      let purchaseSum_6 = new BN((SHARE_PRICE_FOR_STAGE[0] * 20).toString()); //  10000000 * 20 = 200000000
      assert.equal(0, purchaseSum_6.cmp(new BN("200000000")), "wrong purchaseSum_6");
      
      let purchaseSum_7 = new BN((SHARE_PRICE_FOR_STAGE[0] * 2).toString()); //  10000000 * 2 = 20000000
      assert.equal(0, purchaseSum_7.cmp(new BN("20000000")), "wrong purchaseSum_7");
      
      let purchaseSum_8 = new BN((SHARE_PRICE_FOR_STAGE[0] * 10).toString()); //  10000000 * 10 = 100000000
      assert.equal(0, purchaseSum_8.cmp(new BN("100000000")), "wrong purchaseSum_8");
      
      //  prevSharesPart
      let prevSharesPart_3 = purchaseSum_3.mul(new BN("50")).div(new BN("100"));  //  120000000 * 0.5 = 60000000
      assert.equal(0, prevSharesPart_3.cmp(new BN("60000000")), "wrong prevSharesPart_3");

      let prevSharesPart_4 = purchaseSum_4.mul(new BN("50")).div(new BN("100"));  //  200000000 * 0.5 = 100000000
      assert.equal(0, prevSharesPart_4.cmp(new BN("100000000")), "wrong prevSharesPart_4");

      let prevSharesPart_5 = purchaseSum_5.mul(new BN("50")).div(new BN("100"));  //  120000000 * 0.5 = 60000000
      assert.equal(0, prevSharesPart_5.cmp(new BN("60000000")), "wrong prevSharesPart_5");

      let prevSharesPart_6 = purchaseSum_6.mul(new BN("50")).div(new BN("100"));  //  200000000 * 0.5 = 100000000
      assert.equal(0, prevSharesPart_6.cmp(new BN("100000000")), "wrong prevSharesPart_6");

      let prevSharesPart_7 = purchaseSum_7.mul(new BN("50")).div(new BN("100"));  //  20000000 * 0.5 = 10000000
      assert.equal(0, prevSharesPart_7.cmp(new BN("10000000")), "wrong prevSharesPart_7");

      let prevSharesPart_8 = purchaseSum_8.mul(new BN("50")).div(new BN("100"));  //  100000000 * 0.5 = 50000000
      assert.equal(0, prevSharesPart_8.cmp(new BN("50000000")), "wrong prevSharesPart_8");
      
      //  sharePrice
      let sharePrice_3 = prevSharesPart_3.div(new BN("54"));  //  60000000 / (12 + 20 + 22) = 1111111
      assert.equal(0, sharePrice_3.cmp(new BN("1111111")), "wrong sharePrice_3");
      // console.log(((await madoffContract.purchaseInfoInSession.call(3, 1))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(3, 1))[2]).cmp(sharePrice_3), "wrong sharePrice_3 1");
      
      let sharePrice_4 = prevSharesPart_4.div(new BN("66"));  //  100000000 / (12 + 20 + 22 + 12) = 1515151
      assert.equal(0, sharePrice_4.cmp(new BN("1515151")), "wrong sharePrice_4");
      // console.log(((await madoffContract.purchaseInfoInSession.call(4, 1))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(4, 1))[2]).cmp(sharePrice_4), "wrong sharePrice_4 1");
      
      let sharePrice_5 = prevSharesPart_5.div(new BN("86"));  //  60000000 / (12 + 20 + 22 + 12 + 20) = 697674
      assert.equal(0, sharePrice_5.cmp(new BN("697674")), "wrong sharePrice_5");
      // console.log(((await madoffContract.purchaseInfoInSession.call(5, 1))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(5, 1))[2]).cmp(sharePrice_5), "wrong sharePrice_5 1");
      
      let sharePrice_6 = prevSharesPart_6.div(new BN("98"));  //  100000000 / (12 + 20 + 22 + 12 + 20 + 12) = 1020408
      assert.equal(0, sharePrice_6.cmp(new BN("1020408")), "wrong sharePrice_6");
      // console.log(((await madoffContract.purchaseInfoInSession.call(6, 1))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(6, 1))[2]).cmp(sharePrice_6), "wrong sharePrice_6 1");
      
      let sharePrice_7 = prevSharesPart_7.div(new BN("118"));  //  10000000 / (12 + 20 + 22 + 12 + 20 + 12 + 20) = 84745
      assert.equal(0, sharePrice_7.cmp(new BN("84745")), "wrong sharePrice_7");
      // console.log(((await madoffContract.purchaseInfoInSession.call(7, 1))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(7, 1))[2]).cmp(sharePrice_7), "wrong sharePrice_7 1");
      
      let sharePrice_8 = prevSharesPart_8.div(new BN("120"));  //  50000000 / (12 + 20 + 22 + 12 + 20 + 12 + 20 + 2) = 416666
      assert.equal(0, sharePrice_8.cmp(new BN("416666")), "wrong sharePrice_8");
      // console.log(((await madoffContract.purchaseInfoInSession.call(8, 1))[2]).toString());
      assert.equal(0, ((await madoffContract.purchaseInfoInSession.call(8, 1))[2]).cmp(sharePrice_8), "wrong sharePrice_8 1");
      
      
      const PROFIT_CORRECT = sharePrice_3.add(sharePrice_4).add(sharePrice_5).add(sharePrice_6).add(sharePrice_7).add(sharePrice_8).mul(new BN("22"));
      // console.log("PROFIT_CORRECT:          ", PROFIT_CORRECT.toString());
      
      let profit = await madoffContract.profitForPurchaseInSession.call(2, 1, 3, 8, {
        from: PURCHASER_0
      });
      // console.log("profit:                  ", profit.toString());

      assert.equal(0, profit.cmp(PROFIT_CORRECT), "wrong profit");
    });
  });
});