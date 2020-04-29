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
const {
  expect
} = require('chai');

contract("withdraw", (accounts) => {
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
  const EXCEED_BLOCKS =                         111;

  const SHARE_PURCHASE_PERCENT_JACKPOT = 40;
  const SHARE_PURCHASE_PERCENT_PURCHASED_SHARES = 50;
  const SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE = 5;  //  both has 5%

  const JACKPOT_PERCENT_WINNER = 80;

  let token;
  let madoffContract;

  beforeEach("setup", async () => {
    await time.advanceBlock();

    token = await BernardsCutToken.new(OWNER);
    madoffContract = await MadoffContract.new(OWNER, token.address);
  });

  describe("withdrawWebsiteFee", () => {
    it("should revert with error: No fee if nothing to withdraw", async() => {
      await expectRevert(madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      }), "No fee");
    });

    it("should delete websiteFee after withdrawal", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(1, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "wrong websiteFee");

      await madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      });

      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "wrong websiteFee, should be 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 50;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(1, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "wrong websiteFee on 1");

      await madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      });

      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "wrong websiteFee, should be 0 on 1");
    });

    it("should transfer corret amount", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      const CORRECT_FEE = SHARE_PRICE_FOR_STAGE[0] * 10 * SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE / 100;
      await time.increase(2);
      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(WEBSITE_1));

      let tx = await madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(WEBSITE_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(new BN(CORRECT_FEE.toString())).cmp(BALANCE_AFTER), "wrong fee transferred");
    });

    it("should emit WebsiteFeeWithdrawn", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      const CORRECT_FEE = SHARE_PRICE_FOR_STAGE[0] * 10 * SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE / 100;
      await time.increase(2);

      const {logs} = await madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      });
      await expectEvent.inLogs(logs, 'WebsiteFeeWithdrawn', {
        to: WEBSITE_1,
        amount: new BN(CORRECT_FEE)
      });
    });
  });

  describe("withdrawJackpot", () => {
    it("should revert with error: No jackpot if nothing to withdraw", async() => {
      await expectRevert(madoffContract.withdrawJackpot({
        from: PURCHASER_0
      }), "No jackpot");
    });

    it("should delete jackpotForAddr after withdrawal", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(1, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(new BN("0")), "wrong jackpotForAddr");
      
      await madoffContract.withdrawJackpot({
        from: PURCHASER_0
      });

      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(new BN("0")), "wrong jackpotForAddr, should be 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(1, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(new BN("0")), "wrong jackpotForAddr on 1");
      
      await madoffContract.withdrawJackpot({
        from: PURCHASER_0
      });

      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(new BN("0")), "wrong jackpotForAddr, should be 0 on 1");
    });

    it("should transfer correct amount", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);
      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_0));

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      const CORRECT_JPT = await madoffContract.jackpotForAddr.call(PURCHASER_0);
      
      let tx = await madoffContract.withdrawJackpot({
        from: PURCHASER_0
      });

      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_0));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(new BN(CORRECT_JPT.toString())).cmp(BALANCE_AFTER), "wrong jackpot transferred");
    });

    it("should emit JackpotWithdrawn", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      const CORRECT_JPT = await madoffContract.jackpotForAddr.call(PURCHASER_0);
      
      const {logs} = await madoffContract.withdrawJackpot({
        from: PURCHASER_0
      });

      await expectEvent.inLogs(logs, 'JackpotWithdrawn', {
        to: PURCHASER_0,
        amount: new BN(CORRECT_JPT)
      });
    });
  });

  describe("withdrawjackpotForSharesInSession", () => {
    it("should fail if Already withdrawn for Session", async() => {
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

      await madoffContract.withdrawjackpotForSharesInSession(0, {
        from: PURCHASER_0
      });

      await expectRevert(madoffContract.withdrawjackpotForSharesInSession(0, {
        from: PURCHASER_0
      }), "Already withdrawn");
    });
    
    it("should set jackpotForSharesWithdrawn == true in ProfitWithdrawalInfo", async() => {
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

      assert.isFalse(await madoffContract.isJackpotForSharesInSessionWithdrawnForUser.call(0, {
        from: PURCHASER_0
      }), "should be false before");
      await madoffContract.withdrawjackpotForSharesInSession(0, {
        from: PURCHASER_0
      });
      assert.isTrue(await madoffContract.isJackpotForSharesInSessionWithdrawnForUser.call(0, {
        from: PURCHASER_0
      }), "should be true after");
    });
    
    it("should transfer correct profit after single purchase", async() => {
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

      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_0));
      const PROFIT_CORRECT = await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0});

      let tx = await madoffContract.withdrawjackpotForSharesInSession(0, {
        from: PURCHASER_0
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_0));
      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT).cmp(BALANCE_AFTER), "wrong balance after withdraw");
    });
    
    it("should transfer correct profit after multiple purchases", async() => {
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

      VALUE = SHARE_PRICE_FOR_STAGE[1] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      //  exceed S0
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[0] * 44;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  check
      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_0));
      const PROFIT_CORRECT = await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0});

      let tx = await madoffContract.withdrawjackpotForSharesInSession(0, {
        from: PURCHASER_0
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_0));
      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT).cmp(BALANCE_AFTER), "wrong balance after withdraw");
    });
    
    it("should emit JackpotForSharesProfitWithdrawn", async() => {
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

      const PROFIT_CORRECT = await madoffContract.jackpotForSharesInSessionForUser.call(0, {from: PURCHASER_0});

      const {logs} = await madoffContract.withdrawjackpotForSharesInSession(0, {
        from: PURCHASER_0
      });

      await expectEvent.inLogs(logs, 'JackpotForSharesProfitWithdrawn', {
        _address: PURCHASER_0,
        _amount: PROFIT_CORRECT,
        _session: new BN("0")
      });
    });
  });

  describe("withdrawProfitForPurchaseInSession", () => {
    it("should fail if _loopLimit == 0", async() => {
      //  purchase
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
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await expectRevert(madoffContract.withdrawProfitForPurchaseInSession(1, 0, 0, {from: PURCHASER_1}), "Wrong _loopLimit");
    });

    it("should fail if _purchase exceeds purchase count", async() => {
      //  purchase
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
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await expectRevert(madoffContract.withdrawProfitForPurchaseInSession(11, 0, 10, {from: PURCHASER_1}), "_purchase exceeds");
    });

    it("should fail in Not purchaser", async() => {
      //  purchase
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
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await expectRevert(madoffContract.withdrawProfitForPurchaseInSession(1, 0, 10, {from: PURCHASER_2}), "Not purchaser");
    });

    it("should fail if From idx exceeds Session purchases count", async() => {
      //  purchase
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
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 10, {
        from: PURCHASER_1
      });

      await expectRevert(madoffContract.withdrawProfitForPurchaseInSession(1, 0, 10, {
        from: PURCHASER_1
      }), "No more profit");
    });

    it("should fail if profit was withdrawn on last purchase, No more profit", async() => {
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 13;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      //  8 purchases

      //  FROM_2_TO_5
      const PROFIT_CORRECT_FROM_2_TO_5 = await madoffContract.profitForPurchaseInSession.call(1, 0, 2, 5);  //  87 662 601
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 14 * 0.5 / (12 + 13) = 2 800 000
      //  10000000 * 15 * 0.5 / (12 + 13 + 14) = 1 923 076
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15) = 1 111 111
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15 + 12) = 909 090
      //  (2 800 000 + 1 923 076 + 1 111 111 + 909 090) * 13 = 87 662 601
      assert.equal(0, PROFIT_CORRECT_FROM_2_TO_5.cmp(new BN("87662601")), "wrong PROFIT_CORRECT_FROM_2_TO_5");

      let BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_1));
      
      let tx = await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 4, { 
        from: PURCHASER_1
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      let BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT_FROM_2_TO_5).cmp(BALANCE_AFTER), "wrong balanceAfter _FROM_2_TO_5");


      //  FROM_6_TO_7
      const PROFIT_CORRECT_FROM_6_TO_7 = await madoffContract.profitForPurchaseInSession.call(1, 0, 6, 7);  //  29 931 967
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12) = 1 282 051
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12 + 20) = 1 020 408
      //  (1 282 051 + 1 020 408) * 13 = 29 931 967
      assert.equal(0, PROFIT_CORRECT_FROM_6_TO_7.cmp(new BN("29931967")), "wrong PROFIT_CORRECT_FROM_6_TO_7");

      BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_1));
      
      tx = await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 4, { 
        from: PURCHASER_1
      });
      gasUsed = new BN(tx.receipt.gasUsed);
      txInfo = await web3.eth.getTransaction(tx.tx);
      gasPrice = new BN(txInfo.gasPrice);
      gasSpent = gasUsed.mul(gasPrice);

      BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT_FROM_6_TO_7).cmp(BALANCE_AFTER), "wrong balanceAfter _FROM_6_TO_7");

      //  should fail
      await expectRevert(madoffContract.withdrawProfitForPurchaseInSession(1, 0, 4, { 
        from: PURCHASER_1
      }), "No more profit");
    });

    it("should update purchaseIdxWithdrawnOn if _loopLimit > purchase amount", async() => {
      //  purchase
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
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });
      //  8 purchases

      let purchaseIdxWithdrawnOnBefore = await madoffContract.purchaseProfitInSessionWithdrawnOnPurchaseForUser(1, 0, { from: PURCHASER_1 });
      assert.equal(0, purchaseIdxWithdrawnOnBefore.cmp(new BN("0")), "wrong purchaseIdxWithdrawnOnBefore")
      
      await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 12, { from: PURCHASER_1 });
      
      let purchaseIdxWithdrawnOnAfter = await madoffContract.purchaseProfitInSessionWithdrawnOnPurchaseForUser(1, 0, { from: PURCHASER_1 });
      // console.log(purchaseIdxWithdrawnOnAfter.toString());
      assert.equal(0, purchaseIdxWithdrawnOnAfter.cmp(new BN("7")), "wrong purchaseIdxWithdrawnOnAfter");
    });

    it("should update purchaseIdxWithdrawnOn if _loopLimit < purchase amount", async() => {
      //  purchase
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
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });
      //  8 purchases

      let purchaseIdxWithdrawnOnBefore = await madoffContract.purchaseProfitInSessionWithdrawnOnPurchaseForUser(1, 0, { from: PURCHASER_1 });
      assert.equal(0, purchaseIdxWithdrawnOnBefore.cmp(new BN("0")), "wrong purchaseIdxWithdrawnOnBefore")
      
      await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 2, { from: PURCHASER_1 });
      
      let purchaseIdxWithdrawnOnAfter = await madoffContract.purchaseProfitInSessionWithdrawnOnPurchaseForUser(1, 0, { from: PURCHASER_1 });
      // console.log(purchaseIdxWithdrawnOnAfter.toString());
      assert.equal(0, purchaseIdxWithdrawnOnAfter.cmp(new BN("3")), "wrong purchaseIdxWithdrawnOnAfter");
    });

    it("should transfer correct amount if Purchase 1 & _loopLimit > purchase amount", async() => {
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 13;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      //  8 purchases

      //  0
      const PROFIT_CORRECT = await madoffContract.profitForPurchaseInSession.call(1, 0, 2, 7);  //  117 594 568
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 14 * 0.5 / (12 + 13) = 2 800 000
      //  10000000 * 15 * 0.5 / (12 + 13 + 14) = 1 923 076
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15) = 1 111 111
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15 + 12) = 909 090
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12) = 1 282 051
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12 + 20) = 1 020 408
      //  (2 800 000 + 1 923 076 + 1 111 111 + 909 090 + 1 282 051 + 1 020 408) * 13 = 117 594 568
      assert.equal(0, PROFIT_CORRECT.cmp(new BN("117594568")), "wrong PROFIT_CORRECT");

      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_1));
      
      let tx = await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 12, { 
        from: PURCHASER_1
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT).cmp(BALANCE_AFTER), "wrong balanceAfter");
    });

    it("should transfer correct amount if Purchase 4 & _loopLimit > purchase amount", async() => {
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 13;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      //  8 purchases

      //  0
      const PROFIT_CORRECT = await madoffContract.profitForPurchaseInSession.call(4, 0, 5, 7);  //  38 538 588
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15 + 12) = 909 090
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12) = 1 282 051
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12 + 20) = 1 020 408
      //  (909 090 + 1 282 051 + 1 020 408) * 12 = 38 538 588
      assert.equal(0, PROFIT_CORRECT.cmp(new BN("38538588")), "wrong PROFIT_CORRECT");

      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_1));
      
      let tx = await madoffContract.withdrawProfitForPurchaseInSession(4, 0, 12, { 
        from: PURCHASER_1
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT).cmp(BALANCE_AFTER), "wrong balanceAfter");
    });

    it("should transfer correct amount if Purchase 4 & _loopLimit > purchase amount after 2 Sessions", async() => {
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 13;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      //  8 purchases

      //  0
      const PROFIT_CORRECT = await madoffContract.profitForPurchaseInSession.call(4, 0, 5, 7);  //  38 538 588
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15 + 12) = 909 090
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12) = 1 282 051
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12 + 20) = 1 020 408
      //  (909 090 + 1 282 051 + 1 020 408) * 12 = 38 538 588
      assert.equal(0, PROFIT_CORRECT.cmp(new BN("38538588")), "wrong PROFIT_CORRECT");


      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_2,
        value: VALUE
      });


      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  withdraw
      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_1));
      
      let tx = await madoffContract.withdrawProfitForPurchaseInSession(4, 0, 12, { 
        from: PURCHASER_1
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT).cmp(BALANCE_AFTER), "wrong balanceAfter");
    });

    it("should transfer correct amount in two withdrawals for Purchase 1: 1) P2-P5; 2) P6-P7", async() => {
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 13;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      //  8 purchases

      //  FROM_2_TO_5
      const PROFIT_CORRECT_FROM_2_TO_5 = await madoffContract.profitForPurchaseInSession.call(1, 0, 2, 5);  //  87 662 601
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 14 * 0.5 / (12 + 13) = 2 800 000
      //  10000000 * 15 * 0.5 / (12 + 13 + 14) = 1 923 076
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15) = 1 111 111
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15 + 12) = 909 090
      //  (2 800 000 + 1 923 076 + 1 111 111 + 909 090) * 13 = 87 662 601
      assert.equal(0, PROFIT_CORRECT_FROM_2_TO_5.cmp(new BN("87662601")), "wrong PROFIT_CORRECT_FROM_2_TO_5");

      let BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_1));
      
      let tx = await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 4, { 
        from: PURCHASER_1
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      let BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT_FROM_2_TO_5).cmp(BALANCE_AFTER), "wrong balanceAfter _FROM_2_TO_5");


      //  FROM_6_TO_7
      const PROFIT_CORRECT_FROM_6_TO_7 = await madoffContract.profitForPurchaseInSession.call(1, 0, 6, 7);  //  29 931 967
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12) = 1 282 051
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12 + 20) = 1 020 408
      //  (1 282 051 + 1 020 408) * 13 = 29 931 967
      assert.equal(0, PROFIT_CORRECT_FROM_6_TO_7.cmp(new BN("29931967")), "wrong PROFIT_CORRECT_FROM_6_TO_7");

      BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_1));
      
      tx = await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 4, { 
        from: PURCHASER_1
      });
      gasUsed = new BN(tx.receipt.gasUsed);
      txInfo = await web3.eth.getTransaction(tx.tx);
      gasPrice = new BN(txInfo.gasPrice);
      gasSpent = gasUsed.mul(gasPrice);

      BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(PROFIT_CORRECT_FROM_6_TO_7).cmp(BALANCE_AFTER), "wrong balanceAfter _FROM_6_TO_7");
    });

    it("should emit SharesProfitWithdrawn", async() => {
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 13;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      //  8 purchases

      //  0
      const PROFIT_CORRECT = await madoffContract.profitForPurchaseInSession.call(1, 0, 2, 7);  //  117 594 568
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 14 * 0.5 / (12 + 13) = 2 800 000
      //  10000000 * 15 * 0.5 / (12 + 13 + 14) = 1 923 076
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15) = 1 111 111
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15 + 12) = 909 090
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12) = 1 282 051
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12 + 20) = 1 020 408
      //  (2 800 000 + 1 923 076 + 1 111 111 + 909 090 + 1 282 051 + 1 020 408) * 13 = 117 594 568
      assert.equal(0, PROFIT_CORRECT.cmp(new BN("117594568")), "wrong PROFIT_CORRECT");
      
      const {logs} = await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 12, { 
        from: PURCHASER_1
      });
      
      await expectEvent.inLogs(logs, 'SharesProfitWithdrawn', {
        _address: PURCHASER_1,
        _amount: PROFIT_CORRECT,
        _session: new BN("0")
      });
    });

    it("should emit SharesProfitWithdrawn after 2 Sessions", async() => {
      //  purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 13;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 12;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_2,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      //  8 purchases
      

      //  0
      const PROFIT_CORRECT = await madoffContract.profitForPurchaseInSession.call(1, 0, 2, 7);  //  117 594 568
      // console.log(PROFIT_CORRECT.toString());
      //  share prices
      //  10000000 * 14 * 0.5 / (12 + 13) = 2 800 000
      //  10000000 * 15 * 0.5 / (12 + 13 + 14) = 1 923 076
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15) = 1 111 111
      //  10000000 * 12 * 0.5 / (12 + 13 + 14 + 15 + 12) = 909 090
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12) = 1 282 051
      //  10000000 * 20 * 0.5 / (12 + 13 + 14 + 15 + 12 + 12 + 20) = 1 020 408
      //  (2 800 000 + 1 923 076 + 1 111 111 + 909 090 + 1 282 051 + 1 020 408) * 13 = 117 594 568
      assert.equal(0, PROFIT_CORRECT.cmp(new BN("117594568")), "wrong PROFIT_CORRECT");


      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_2,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_2,
        value: VALUE
      });


      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      //  withdraw
      const {logs} = await madoffContract.withdrawProfitForPurchaseInSession(1, 0, 12, { 
        from: PURCHASER_1
      });
      
      await expectEvent.inLogs(logs, 'SharesProfitWithdrawn', {
        _address: PURCHASER_1,
        _amount: PROFIT_CORRECT,
        _session: new BN("0")
      });
    });
  });
});