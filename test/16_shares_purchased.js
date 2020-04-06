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

  describe("sharesPurchased", () => {
    it("should update purchaseIdxsForPurchaser in multiple sessions", async() => {
      //  PURCHASER_0 - S0, P0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("0")), "wrong Session, should be 0");
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(ongoingSessionIdx, {
        from: PURCHASER_0
      }), [new BN("0")], "should be 0 for PURCHASER_0 on PURCHASER_0 - S0, P0");


      //  PURCHASER_1 - S1, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("1")), "wrong Session, should be 1");
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(ongoingSessionIdx, {
        from: PURCHASER_1
      }), [new BN("0")], "should be 0 for PURCHASER_1 on PURCHASER_0 - S1, P0");

      //  PURCHASER_1 - S1, P1
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("1")), "wrong Session, should be 1");
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(ongoingSessionIdx, {
        from: PURCHASER_1
      }), [new BN("0"), new BN("1")], "should be 0, 1 for PURCHASER_1 on PURCHASER_1 - S1, P1");

      
      //  PURCHASER_0 - S2, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  0
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(ongoingSessionIdx, {
        from: PURCHASER_0
      }), [new BN("0")], "should be 0 for PURCHASER_1 on PURCHASER_0 - S2, P0");
      
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(new BN("0"), {
        from: PURCHASER_0
      }), [new BN("0")], "should be 0 for PURCHASER_0 on PURCHASER_0 - S2, P0 _ 1");

      //  1
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(ongoingSessionIdx, {
        from: PURCHASER_1
      }), [new BN("1")], "should be 1 for PURCHASER_1 on 2");

      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(new BN("1"), {
        from: PURCHASER_1
      }), [new BN("0"), new BN("1")], "should be 0, 1 for PURCHASER_1 on PURCHASER_1 - S1, P1 _ 1");

      //  2
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(ongoingSessionIdx, {
        from: PURCHASER_1
      }), [new BN("1"), new BN("2")], "should be 1, 2 for PURCHASER_1 on 2");
      
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(new BN("1"), {
        from: PURCHASER_1
      }), [new BN("0"), new BN("1")], "should be 0, 1 for PURCHASER_1 on PURCHASER_1 - S1, P1 _ 2");
      
      //  3
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(ongoingSessionIdx, {
        from: PURCHASER_0
      }), [new BN("0"), new BN("3")], "should be 0, 3 for PURCHASER_0 on 2");
      
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(new BN("0"), {
        from: PURCHASER_0
      }), [new BN("0")], "should be 0 for PURCHASER_0 on PURCHASER_0 - S2, P0 _ 2");

      //  PURCHASER_0 - S3, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("3")), "wrong Session, should be 3");
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(ongoingSessionIdx, {
        from: PURCHASER_0
      }), [new BN("0")], "should be 0 for PURCHASER_0 on PURCHASER_0 - S3, P0");
      
      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(new BN("0"), {
        from: PURCHASER_0
      }), [new BN("0")], "should be 0 for PURCHASER_0 on PURCHASER_0 - S2, P0 _ 1");

      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(new BN("1"), {
        from: PURCHASER_0
      }), [], "should be none for PURCHASER_0 on PURCHASER_0 - S2, P0 _ 1");

      assert.deepEqual(await madoffContract.purchasesInSessionForUser.call(new BN("2"), {
        from: PURCHASER_0
      }), [new BN("0"), new BN("3")], "should be 0, 3 for PURCHASER_0 on 2");
    });
    
    it("should add new PurchaseInfo to session.purchasesInfo in multiple sessions", async() => {
      //  function purchaseInfoInSession(uint256 _purchase, uint256 _session) public view returns (address purchaser, uint256 shareNumber, uint256 previousSharePrice) {

      //  PURCHASER_0 - S0, P0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("0")), "wrong Session, should be 0");
      
      let purchaseInfo = await madoffContract.purchaseInfoInSession(0, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S0, P0");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("10")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S0, P0");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S0, P0");


      //  PURCHASER_1 - S1, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("1")), "wrong Session, should be 1");
      
      purchaseInfo = await madoffContract.purchaseInfoInSession(0, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S1, P0");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("5")), "wrong shareNumber for PURCHASER_1 in PURCHASER_1 - S1, P0");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S1, P0");

      //  PURCHASER_1 - S1, P1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      
      purchaseInfo = await madoffContract.purchaseInfoInSession(1, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S1, P1");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("15")), "wrong shareNumber for PURCHASER_1 in PURCHASER_1 - S1, P1");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("15000000")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S1, P1");  //  10000000 * 15 * 0.5 / 5 = 15000000

      
      //  PURCHASER_0 - S2, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  0
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      purchaseInfo = await madoffContract.purchaseInfoInSession(0, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S2, P0");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("15")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S2, P0");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S2, P0");

      purchaseInfo = await madoffContract.purchaseInfoInSession(0, 0);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("10")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");


      //  PURCHASER_1 - S2, P1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 7;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");

      purchaseInfo = await madoffContract.purchaseInfoInSession(1, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S2, P1");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("7")), "wrong shareNumber for PURCHASER_1 in PPURCHASER_1 - S2, P1");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("2333333")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S2, P1");  //  10000000 * 7 * 0.5 / 15 = 2333333

      purchaseInfo = await madoffContract.purchaseInfoInSession(0, 1);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S1, P0");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("5")), "wrong shareNumber for PURCHASER_1 in PURCHASER_1 - S1, P0");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S1, P0");

      purchaseInfo = await madoffContract.purchaseInfoInSession(1, 1);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S1, P1");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("15")), "wrong shareNumber for PURCHASER_1 in PURCHASER_1 - S1, P1");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("15000000")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S1, P1");  //  10000000 * 15 * 0.5 / 5 = 15000000


      //  PURCHASER_1 - S2, P2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      purchaseInfo = await madoffContract.purchaseInfoInSession(2, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S2, P2");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("11")), "wrong shareNumber for PURCHASER_1 in PURCHASER_1 - S2, P2");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("2500000")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S2, P2");  //  10000000 * 11 * 0.5 / 22 = 2500000

      purchaseInfo = await madoffContract.purchaseInfoInSession(1, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S2, P1");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("7")), "wrong shareNumber for PURCHASER_1 in PPURCHASER_1 - S2, P1");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("2333333")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S2, P1");  //  10000000 * 7 * 0.5 / 15 = 2333333

      purchaseInfo = await madoffContract.purchaseInfoInSession(0, 1);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S1, P0");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("5")), "wrong shareNumber for PURCHASER_1 in PURCHASER_1 - S1, P0");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S1, P0");

      purchaseInfo = await madoffContract.purchaseInfoInSession(1, 1);
      assert.equal(purchaseInfo.purchaser, PURCHASER_1, "wrong purchaser for PURCHASER_1 in PURCHASER_1 - S1, P1");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("15")), "wrong shareNumber for PURCHASER_1 in PURCHASER_1 - S1, P1");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("15000000")), "wrong previousSharePrice for PURCHASER_1 in PURCHASER_1 - S1, P1");  //  10000000 * 15 * 0.5 / 5 = 15000000

      
      //  PURCHASER_0 - S2, P3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 8;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      purchaseInfo = await madoffContract.purchaseInfoInSession(3, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S2, P3");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("8")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S2, P3");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("1212121")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S2, P3");  //  10000000 * 8 * 0.5 / 33 = 1212121

      purchaseInfo = await madoffContract.purchaseInfoInSession(0, 2);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S2, P0");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("15")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S2, P0");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S2, P0");

      purchaseInfo = await madoffContract.purchaseInfoInSession(0, 0);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("10")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");


      //  PURCHASER_0 - S3, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("3")), "wrong Session, should be 3");
      
      purchaseInfo = await madoffContract.purchaseInfoInSession(0, ongoingSessionIdx);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S3, P0");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("22")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S3, P0");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S3, P0");

      purchaseInfo = await madoffContract.purchaseInfoInSession(3, 2);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S2, P3");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("8")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S2, P3");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("1212121")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S2, P3");  //  10000000 * 8 * 0.5 / 33 = 1212121

      purchaseInfo = await madoffContract.purchaseInfoInSession(0, 2);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S2, P0");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("15")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S2, P0");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S2, P0");

      purchaseInfo = await madoffContract.purchaseInfoInSession(0, 0);
      assert.equal(purchaseInfo.purchaser, PURCHASER_0, "wrong purchaser for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");
      assert.equal(0, purchaseInfo.shareNumber.cmp(new BN("10")), "wrong shareNumber for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");
      assert.equal(0, purchaseInfo.previousSharePrice.cmp(new BN("0")), "wrong previousSharePrice for PURCHASER_0 in PURCHASER_0 - S2, P0 (0)");
    });
    
    it("should increse sharesPurchasedByPurchaser in  multiple sessions", async() => {
      //  PURCHASER_0 - S0, P0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("0")), "wrong Session, should be 0");
      
      let shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(ongoingSessionIdx, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("10")), "wrong shares for PURCHASER_0 in PURCHASER_0 - S0, P0");

      //  PURCHASER_1 - S1, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("1")), "wrong Session, should be 1");
      
      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(ongoingSessionIdx, {
        from: PURCHASER_1
      });
      assert.equal(0, shares.cmp(new BN("5")), "wrong shares for PURCHASER_0 in PURCHASER_1 - S1, P0");


      //  PURCHASER_1 - S1, P1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      
      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(ongoingSessionIdx, {
        from: PURCHASER_1
      });
      assert.equal(0, shares.cmp(new BN("20")), "wrong shares for PURCHASER_1 in PURCHASER_1 - S1, P1");

      
      //  PURCHASER_0 - S2, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  0
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(ongoingSessionIdx, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("15")), "wrong shares for PURCHASER_0 in PURCHASER_0 - S2, P0");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(0, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("10")), "wrong shares for PURCHASER_0 in PURCHASER_0 - S2, P0");


      //  PURCHASER_1 - S2, P1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 7;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(ongoingSessionIdx, {
        from: PURCHASER_1
      });
      assert.equal(0, shares.cmp(new BN("7")), "wrong shares for PURCHASER_1 in PURCHASER_1 - S2, P1");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(1, {
        from: PURCHASER_1
      });
      assert.equal(0, shares.cmp(new BN("20")), "wrong shares for PURCHASER_1 in PURCHASER_1 - S1, P1");


      //  PURCHASER_1 - S2, P2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(ongoingSessionIdx, {
        from: PURCHASER_1
      });
      assert.equal(0, shares.cmp(new BN("18")), "wrong shares for PURCHASER_1 in PURCHASER_1 - S2, P2");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(1, {
        from: PURCHASER_1
      });
      assert.equal(0, shares.cmp(new BN("20")), "wrong shares for PURCHASER_1 in PURCHASER_1 - S1, P1");
      
      
      //  PURCHASER_0 - S2, P3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 8;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(ongoingSessionIdx, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("23")), "wrong shares for PURCHASER_1 in PURCHASER_1 - S2, P3");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(0, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("10")), "wrong shares for PURCHASER_0 in PURCHASER_0 - S0, P0");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(1, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("0")), "wrong shares for PURCHASER_0 in PURCHASER_0 - S1, P0");
      

      //  PURCHASER_0 - S3, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("3")), "wrong Session, should be 3");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(ongoingSessionIdx, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("22")), "wrong shares for PURCHASER_0 in PURCHASER_0 - S3, P0");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(2, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("23")), "wrong shares for PURCHASER_1 in PURCHASER_1 - S2, P3");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(0, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("10")), "wrong shares for PURCHASER_0 in PURCHASER_0 - S0, P0");

      shares = await madoffContract.sharesPurchasedInSessionByPurchaser.call(1, {
        from: PURCHASER_0
      });
      assert.equal(0, shares.cmp(new BN("0")), "wrong shares for PURCHASER_0 in PURCHASER_0 - S1, P0");
    });
    
    it("should increase sharesPurchased in multiple sessions", async() => {
      //  PURCHASER_0 - S0, P0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("0")), "wrong Session, should be 0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(ongoingSessionIdx)).cmp(new BN("10")), "wrong sharesPurchased in PURCHASER_0 - S0, P0");


      //  PURCHASER_1 - S1, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("1")), "wrong Session, should be 1");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(ongoingSessionIdx)).cmp(new BN("5")), "wrong sharesPurchased in PURCHASER_1 - S1, P0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(0)).cmp(new BN("10")), "wrong sharesPurchased in PURCHASER_0 - S0, P0");


      //  PURCHASER_1 - S1, P1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(ongoingSessionIdx)).cmp(new BN("20")), "wrong sharesPurchased in PURCHASER_1 - S1, P1");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(0)).cmp(new BN("10")), "wrong sharesPurchased in PURCHASER_0 - S0, P0");

      
      //  PURCHASER_0 - S2, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  0
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(ongoingSessionIdx)).cmp(new BN("15")), "wrong sharesPurchased in PURCHASER_0 - S2, P0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(0)).cmp(new BN("10")), "wrong sharesPurchased in PURCHASER_0 - S0, P0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(1)).cmp(new BN("20")), "wrong sharesPurchased in PURCHASER_1 - S1, P1");


      //  PURCHASER_1 - S2, P1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 7;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(ongoingSessionIdx)).cmp(new BN("22")), "wrong sharesPurchased in PURCHASER_1 - S2, P1");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(0)).cmp(new BN("10")), "wrong sharesPurchased in PURCHASER_0 - S0, P0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(1)).cmp(new BN("20")), "wrong sharesPurchased in PURCHASER_1 - S1, P1");


      //  PURCHASER_1 - S2, P2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(ongoingSessionIdx)).cmp(new BN("33")), "wrong sharesPurchased in PURCHASER_1 - S2, P2");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(0)).cmp(new BN("10")), "wrong sharesPurchased in PURCHASER_0 - S0, P0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(1)).cmp(new BN("20")), "wrong sharesPurchased in PURCHASER_1 - S1, P1");
      
      
      //  PURCHASER_0 - S2, P3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 8;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(ongoingSessionIdx)).cmp(new BN("41")), "wrong sharesPurchased in PURCHASER_0 - S2, P3");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(0)).cmp(new BN("10")), "wrong sharesPurchased in PURCHASER_0 - S0, P0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(1)).cmp(new BN("20")), "wrong sharesPurchased in PURCHASER_1 - S1, P1");
      

      //  PURCHASER_0 - S3, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("3")), "wrong Session, should be 3");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(ongoingSessionIdx)).cmp(new BN("22")), "wrong sharesPurchased in PURCHASER_0 - S3, P0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(0)).cmp(new BN("10")), "wrong sharesPurchased in PURCHASER_0 - S0, P0");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(1)).cmp(new BN("20")), "wrong sharesPurchased in PURCHASER_1 - S1, P1");
      assert.equal(0, (await madoffContract.sharesPurchasedInSession.call(2)).cmp(new BN("41")), "wrong sharesPurchased in PURCHASER_0 - S2, P3");
    });
    
    it("should addSessionForPurchaser on multiple purchases within session", async() => {
      //  PURCHASER_0 - S0, P0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("0")), "wrong Session, should be 0");
      
      assert.deepEqual(await madoffContract.participatedSessionsForUser.call({
        from: PURCHASER_0
      }), [new BN("0")], "wrong participatedSessionsForUser in PURCHASER_0 - S0, P0");


      //  PURCHASER_1 - S1, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("1")), "wrong Session, should be 1");
      
      assert.deepEqual(await madoffContract.participatedSessionsForUser.call({
        from: PURCHASER_1
      }), [new BN("1")], "wrong participatedSessionsForUser in PURCHASER_1 - S1, P0");


      //  PURCHASER_1 - S1, P1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      assert.deepEqual(await madoffContract.participatedSessionsForUser.call({
        from: PURCHASER_1
      }), [new BN("1")], "wrong participatedSessionsForUser in PURCHASER_1 - S1, P0");

      
      //  PURCHASER_0 - S2, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  0
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      assert.deepEqual(await madoffContract.participatedSessionsForUser.call({
        from: PURCHASER_0
      }), [new BN("0"), new BN("2")], "wrong participatedSessionsForUser in PURCHASER_0 - S2, P0");

      //  PURCHASER_1 - S2, P1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 7;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      assert.deepEqual(await madoffContract.participatedSessionsForUser.call({
        from: PURCHASER_1
      }), [new BN("1"), new BN("2")], "wrong participatedSessionsForUser in PURCHASER_1 - S2, P1");


      //  PURCHASER_1 - S2, P2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      assert.deepEqual(await madoffContract.participatedSessionsForUser.call({
        from: PURCHASER_1
      }), [new BN("1"), new BN("2")], "wrong participatedSessionsForUser in PURCHASER_1 - S2, P2");
      
      
      //  PURCHASER_0 - S2, P3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 8;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("2")), "wrong Session, should be 2");
      
      assert.deepEqual(await madoffContract.participatedSessionsForUser.call({
        from: PURCHASER_0
      }), [new BN("0"), new BN("2")], "wrong participatedSessionsForUser in PURCHASER_0 - S2, P2");
      

      //  PURCHASER_0 - S3, P0
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 22;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      ongoingSessionIdx = await madoffContract.ongoingSessionIdx.call();
      assert.equal(0, ongoingSessionIdx.cmp(new BN("3")), "wrong Session, should be 3");
      
      assert.deepEqual(await madoffContract.participatedSessionsForUser.call({
        from: PURCHASER_0
      }), [new BN("0"), new BN("2"), new BN("3")], "wrong participatedSessionsForUser in PURCHASER_0 - S3, P0");
    });
  });

  describe("countdownWasReset", () => {
    it("should set correct jackpotSharePrice for ongoing sessions", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  0.1
      let jpt_0 = await madoffContract.ongoingJackpot.call(); //  10000000 * 10 * 0.4 = 40000000
      assert.equal(0, jpt_0.cmp(new BN("40000000")), "wrong jpt_0");

      let CORRECT_jackpotSharePrice_0 = jpt_0.mul(new BN("20")).div(new BN("100")).div(new BN("10"));
      assert.equal(0, CORRECT_jackpotSharePrice_0.cmp(new BN("800000")), "wrong CORRECT_jackpotSharePrice_0");  //  40000000 * 20 / 100 / 10 = 800000

      let ongoingSessionIdxPrev_0 = await madoffContract.ongoingSessionIdx.call();
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  0.2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, ongoingSessionIdxPrev_0.cmp(new BN("0")), "wrong ongoingSessionIdxPrev_0 in 0");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_0)).cmp(CORRECT_jackpotSharePrice_0), "wrong CORRECT_jackpotSharePrice_0 after reset");
      

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  1.1
      let jpt_1 = await madoffContract.ongoingJackpot.call(); //  10000000 * 35 * 0.4 = 140000000
      assert.equal(0, jpt_1.cmp(new BN("140000000")), "wrong jpt_1");

      let CORRECT_jackpotSharePrice_1 = jpt_1.mul(new BN("20")).div(new BN("100")).div(new BN("35"));
      assert.equal(0, CORRECT_jackpotSharePrice_1.cmp(new BN("800000")), "wrong CORRECT_jackpotSharePrice_1");  //  140000000 * 20 / 100 / 35 = 800000

      let ongoingSessionIdxPrev_1 = await madoffContract.ongoingSessionIdx.call();
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1.2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, ongoingSessionIdxPrev_1.cmp(new BN("1")), "wrong ongoingSessionIdxPrev in 1");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_1)).cmp(CORRECT_jackpotSharePrice_1), "wrong CORRECT_jackpotSharePrice_1 after reset");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_0)).cmp(CORRECT_jackpotSharePrice_0), "wrong CORRECT_jackpotSharePrice_0 after reset");


      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  2.1
      let jpt_2 = await madoffContract.ongoingJackpot.call(); //  (10000000 * 2500 + 20000000 * 5000) * 0.4 = 50000000000
      assert.equal(0, jpt_2.cmp(new BN("50000000000")), "wrong jpt_2");

      let CORRECT_jackpotSharePrice_2 = jpt_2.mul(new BN("20")).div(new BN("100")).div(new BN("7500"));
      assert.equal(0, CORRECT_jackpotSharePrice_2.cmp(new BN("1333333")), "wrong CORRECT_jackpotSharePrice_2");  //  50000000000 * 20 / 100 / 7500 = 1333333

      let ongoingSessionIdxPrev_2 = await madoffContract.ongoingSessionIdx.call();
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  2.2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, ongoingSessionIdxPrev_2.cmp(new BN("2")), "wrong ongoingSessionIdxPrev in 2");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_2)).cmp(CORRECT_jackpotSharePrice_2), "wrong CORRECT_jackpotSharePrice_2 after reset");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_1)).cmp(CORRECT_jackpotSharePrice_1), "wrong CORRECT_jackpotSharePrice_1 after reset");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_0)).cmp(CORRECT_jackpotSharePrice_0), "wrong CORRECT_jackpotSharePrice_0 after reset");


      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  3.1
      let jpt_3 = await madoffContract.ongoingJackpot.call(); //  (10000000 * 2500 + 20000000 * 5000 + 40000000 * 3125 + 80000000 * 2) * 0.4 = 100064000000
      assert.equal(0, jpt_3.cmp(new BN("100064000000")), "wrong jpt_3");

      let CORRECT_jackpotSharePrice_3 = jpt_3.mul(new BN("20")).div(new BN("100")).div(new BN("10627"));
      assert.equal(0, CORRECT_jackpotSharePrice_3.cmp(new BN("1883203")), "wrong CORRECT_jackpotSharePrice_3");  //  100064000000 * 20 / 100 / 10627 = 1883203

      let ongoingSessionIdxPrev_3 = await madoffContract.ongoingSessionIdx.call();
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  3.2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, ongoingSessionIdxPrev_3.cmp(new BN("3")), "wrong ongoingSessionIdxPrev in 3");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_3)).cmp(CORRECT_jackpotSharePrice_3), "wrong CORRECT_jackpotSharePrice_3 after reset");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_2)).cmp(CORRECT_jackpotSharePrice_2), "wrong CORRECT_jackpotSharePrice_2 after reset");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_1)).cmp(CORRECT_jackpotSharePrice_1), "wrong CORRECT_jackpotSharePrice_1 after reset");
      assert.equal(0, (await madoffContract.jackpotSharePriceInSession.call(ongoingSessionIdxPrev_0)).cmp(CORRECT_jackpotSharePrice_0), "wrong CORRECT_jackpotSharePrice_0 after reset");
    });

    it("should increase ongoingSessionIdx", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.ongoingSessionIdx.call()).cmp(new BN("0")), "wrong ongoingSessionIdx in 0");

      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.ongoingSessionIdx.call()).cmp(new BN("1")), "wrong ongoingSessionIdx in 1");
      
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.ongoingSessionIdx.call()).cmp(new BN("2")), "wrong ongoingSessionIdx in 2");

      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }


      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.ongoingSessionIdx.call()).cmp(new BN("3")), "wrong ongoingSessionIdx in 3");
    });
  });
});