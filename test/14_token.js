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

contract("token", (accounts) => {
  const DEPLOYER = accounts[0];
  const OWNER = accounts[1];
  const WEBSITE_0 = "0x0000000000000000000000000000000000000000";
  const WEBSITE_1 = accounts[2];
  const WEBSITE_2 = accounts[3];
  const PURCHASER_0 = accounts[4];
  const PURCHASER_1 = accounts[5];

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
    await token.updateBernardEscrow(madoffContract.address);
  });

  describe("constructor", () => {
    it("should mint 7000 to owner", async() => {
      assert.equal(0, (await token.balanceOf(OWNER)).cmp(new BN("7000")), "balance should be 7000");
    });

    it("should mint 3000 to sender", async() => {
      assert.equal(0, (await token.balanceOf(DEPLOYER)).cmp(new BN("3000")), "balance should be 3000");
    });
  });

  describe("updateBernardEscrow", () => {
    it("should fail if already set", async() => {
      let tokenTmp = await BernardsCutToken.new(OWNER);
      await tokenTmp.updateBernardEscrow(madoffContract.address);
      await expectRevert(tokenTmp.updateBernardEscrow(madoffContract.address), "Already set");
      await expectRevert(tokenTmp.updateBernardEscrow(WEBSITE_1), "Already set");
    });

    it("should set correct address", async() => {
      assert.equal(await token.escrow(), madoffContract.address, "wrong escrow address");
    });
  });

  describe("transfer", () => {
    it("should fail if not from token", async() => {
      await expectRevert(madoffContract.withdrawProfitFromToken(PURCHASER_1, 11, {
        from: PURCHASER_1
      }), "Not BCT");
    });

    it("should prior withdraw pending token profit for sender", async() => {
      //  0 - purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      // console.log("ongoingBernardFee:   ", ongoingBernardFee.toString());

      //  1 - calculate Bernard fraction profit
      await madoffContract.calculateTokenFractionProfit();
      let senderBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitBefore: ", senderBernardProfitBefore.toString());
      const OWNER_PART_CORRECT = new BN(ongoingBernardFee.toString()).mul(new BN("70")).div(new BN("100"));
      // console.log("OWNER_PART_CORRECT:  ", OWNER_PART_CORRECT.toString());
      assert.equal(0, OWNER_PART_CORRECT.cmp(new BN(senderBernardProfitBefore.toString())), "wrong OWNER_PART");

      //  2 - should withdraw pending profit before token transfer
      let OWNER_balance_before = new BN(await web3.eth.getBalance(OWNER));
      
      let tx = await token.transfer(PURCHASER_0, 10, 100, {
        from: OWNER
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      //  3 - check senderBernardProfitAfter
      let senderBernardProfitAfter = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitAfter:  ", senderBernardProfitAfter.toString());
      assert.equal(0, senderBernardProfitAfter.cmp(new BN("0")), "should be 0");

      //  4 - check balance after
      let OWNER_balance_after = new BN(await web3.eth.getBalance(OWNER));
      assert.equal(0, OWNER_balance_before.sub(gasSpent).add(senderBernardProfitBefore).cmp(OWNER_balance_after), "wrong balance after");

      //  5 - profitWithdrawnOnCalculationIdx
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("1")), "wrong profitWithdrawnOnCalculationIdx");
    });

    it("should prior withdraw pending token profit for receiver", async() => {
      //  0 - purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      // console.log("ongoingBernardFee:   ", ongoingBernardFee.toString());

      //  1 - calculate Bernard fraction profit
      await madoffContract.calculateTokenFractionProfit();
      let receiverBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("receiverBernardProfitBefore: ", receiverBernardProfitBefore.toString());
      const OWNER_PART_CORRECT = new BN(ongoingBernardFee.toString()).mul(new BN("70")).div(new BN("100"));
      // console.log("OWNER_PART_CORRECT:  ", OWNER_PART_CORRECT.toString());
      assert.equal(0, OWNER_PART_CORRECT.cmp(new BN(receiverBernardProfitBefore.toString())), "wrong OWNER_PART");

      //  2 - should withdraw pending profit before token transfer

      let OWNER_balance_before = new BN(await web3.eth.getBalance(OWNER));
      await token.transfer(OWNER, 10, 100, {
        from: DEPLOYER
      });

      //  3 - check senderBernardProfitAfter
      let receiverBernardProfitAfter = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitAfter:  ", senderBernardProfitAfter.toString());
      assert.equal(0, receiverBernardProfitAfter.cmp(new BN("0")), "should be 0");

      //  4 - check balance after
      let OWNER_balance_after = new BN(await web3.eth.getBalance(OWNER));
      assert.equal(0, OWNER_balance_before.add(receiverBernardProfitBefore).cmp(OWNER_balance_after), "wrong balance after");

      //  5 - profitWithdrawnOnCalculationIdx
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("1")), "wrong profitWithdrawnOnCalculationIdx");
    });

    it("should prior withdraw pending token profit for sender & receiver", async() => {
      //  0 - purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      // console.log("ongoingBernardFee:   ", ongoingBernardFee.toString());

      //  1 - calculate Bernard fraction profit
      await madoffContract.calculateTokenFractionProfit();
      let senderBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: DEPLOYER
      });
      let receiverBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitBefore:   ", senderBernardProfitBefore.toString());
      // console.log("receiverBernardProfitBefore: ", receiverBernardProfitBefore.toString());
      assert.equal(1, senderBernardProfitBefore.cmp(new BN("0")), "should be > 0 for sender");
      assert.equal(1, receiverBernardProfitBefore.cmp(new BN("0")), "should be > 0 for receiver");
      
      let OWNER_balance_before = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_before = new BN(await web3.eth.getBalance(DEPLOYER));

      //  2 - should withdraw pending profit before token transfer
      let tx = await token.transfer(OWNER, 10, 100, {
        from: DEPLOYER
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);
      
      let senderBernardProfitAfter = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: DEPLOYER
      });
      let receiverBernardProfitAfter = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });

      //  3 - check senderBernardProfitAfter & receiverBernardProfitAfter
      // console.log("senderBernardProfitAfter:    ", senderBernardProfitAfter.toString());
      // console.log("receiverBernardProfitAfter:  ", receiverBernardProfitAfter.toString());

      assert.equal(0, senderBernardProfitAfter.cmp(new BN("0")), "should be 0 for sender");
      assert.equal(0, receiverBernardProfitAfter.cmp(new BN("0")), "should be 0 for receiver");

      //  4 - check balance after
      let OWNER_balance_after = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_after = new BN(await web3.eth.getBalance(DEPLOYER));

      assert.equal(0, OWNER_balance_before.add(receiverBernardProfitBefore).cmp(OWNER_balance_after), "wrong OWNER_balance_after balance after");
      assert.equal(0, DEPLOYER_balance_before.sub(gasSpent).add(senderBernardProfitBefore).cmp(DEPLOYER_balance_after), "wrong DEPLOYER_balance_after balance after");

      //  5 - profitWithdrawnOnCalculationIdx
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("1")), "wrong profitWithdrawnOnCalculationIdx for OWNER");
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(DEPLOYER)).cmp(new BN("1")), "wrong profitWithdrawnOnCalculationIdx for DEPLOYER");
    });

    it("should just transfer token from sender to receiver if no pending profits", async() => {
      //  0 - purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      //  1 -  check balances
      let OWNER_balanceBefore = await token.balanceOf(OWNER);
      assert.equal(0, OWNER_balanceBefore.cmp(new BN("7000")), "should be 7000");

      let DEPLOYER_balanceBefore = await token.balanceOf(DEPLOYER);
      assert.equal(0, DEPLOYER_balanceBefore.cmp(new BN("3000")), "should be 3000");

      //  2
      let senderBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: DEPLOYER
      });
      let receiverBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitBefore:   ", senderBernardProfitBefore.toString());
      // console.log("receiverBernardProfitBefore: ", receiverBernardProfitBefore.toString());
      assert.equal(0, senderBernardProfitBefore.cmp(new BN("0")), "should be == 0 for sender");
      assert.equal(0, receiverBernardProfitBefore.cmp(new BN("0")), "should be == 0 for receiver");
      
      //  2 - transfer
      await token.transfer(DEPLOYER, 10, 100, {
        from: OWNER
      });
      
      //  3 -  check balances
      let OWNER_balanceAfter = await token.balanceOf(OWNER);
      assert.equal(0, OWNER_balanceAfter.cmp(new BN("6990")), "shold be 6990");

      let DEPLOYER_balanceAfter = await token.balanceOf(DEPLOYER);
      assert.equal(0, DEPLOYER_balanceAfter.cmp(new BN("3010")), "shold be 3010");

      //  4 - profitWithdrawnOnCalculationIdx
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("0")), "wrong profitWithdrawnOnCalculationIdx for OWNER");
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(DEPLOYER)).cmp(new BN("0")), "wrong profitWithdrawnOnCalculationIdx for DEPLOYER");
    
    });

    it("should check balance after multiple transfers", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      let OWNER_profit_before_0 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      let DEPLOYER_profit_before_0 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      assert.equal(1, OWNER_profit_before_0.cmp(new BN("0")), "should be 0 for OWNER before 0");
      assert.equal(1, DEPLOYER_profit_before_0.cmp(new BN("0")), "should be 0 for DEPLOYER before 0");

      let OWNER_balance_before = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_before = new BN(await web3.eth.getBalance(DEPLOYER));

      let tx = await token.transfer(DEPLOYER, 10, 100, {
        from: OWNER
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      //  3 - check senderBernardProfitAfter & receiverBernardProfitAfter
      let OWNER_profit_after_0 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      let DEPLOYER_profit_after_0 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      // console.log("OWNER_profit_after_0:    ", OWNER_profit_after_0.toString());
      // console.log("DEPLOYER_profit_after_0:  ", DEPLOYER_profit_after_0.toString());

      assert.equal(0, OWNER_profit_after_0.cmp(new BN("0")), "should be 0 for OWNER after 0");
      assert.equal(0, DEPLOYER_profit_after_0.cmp(new BN("0")), "should be 0 for DEPLOYER after 0");

      //  4 - check balance after
      let OWNER_balance_after = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_after = new BN(await web3.eth.getBalance(DEPLOYER));

      assert.equal(0, OWNER_balance_before.sub(gasSpent).add(OWNER_profit_before_0).cmp(OWNER_balance_after), "wrong OWNER_balance_after balance after on 0");
      assert.equal(0, DEPLOYER_balance_before.add(DEPLOYER_profit_before_0).cmp(DEPLOYER_balance_after), "wrong DEPLOYER_balance_after balance after on 0");

      //  5 - profitWithdrawnOnCalculationIdx
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("1")), "wrong profitWithdrawnOnCalculationIdx for OWNER on 0");
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(DEPLOYER)).cmp(new BN("1")), "wrong profitWithdrawnOnCalculationIdx for DEPLOYER on 0");


      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      
      let OWNER_profit_before_1 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      let DEPLOYER_profit_before_1 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      assert.equal(1, OWNER_profit_before_1.cmp(new BN("0")), "should be 0 for OWNER before 1");
      assert.equal(1, DEPLOYER_profit_before_1.cmp(new BN("0")), "should be 0 for DEPLOYER before 1");

      let OWNER_balance_before_1 = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_before_1 = new BN(await web3.eth.getBalance(DEPLOYER));

      tx = await token.transfer(DEPLOYER, 10, 100, {
        from: OWNER
      });
      gasUsed = new BN(tx.receipt.gasUsed);
      txInfo = await web3.eth.getTransaction(tx.tx);
      gasPrice = new BN(txInfo.gasPrice);
      gasSpent = gasUsed.mul(gasPrice);

      //  3 - check senderBernardProfitAfter & receiverBernardProfitAfter
      let OWNER_profit_after_1 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      let DEPLOYER_profit_after_1 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      // console.log("OWNER_profit_after_1:    ", OWNER_profit_after_1.toString());
      // console.log("DEPLOYER_profit_after_1:  ", DEPLOYER_profit_after_1.toString());

      assert.equal(0, OWNER_profit_after_1.cmp(new BN("0")), "should be 0 for OWNER after 1");
      assert.equal(0, DEPLOYER_profit_after_1.cmp(new BN("0")), "should be 0 for DEPLOYER after 1");

      //  4 - check balance after
      let OWNER_balance_after_1 = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_after_1 = new BN(await web3.eth.getBalance(DEPLOYER));

      assert.equal(0, OWNER_balance_before_1.sub(gasSpent).add(OWNER_profit_before_1).cmp(OWNER_balance_after_1), "wrong OWNER_balance_after_1 balance after on 1");
      assert.equal(0, DEPLOYER_balance_before_1.add(DEPLOYER_profit_before_1).cmp(DEPLOYER_balance_after_1), "wrong DEPLOYER_balance_after_1 balance after on 1");

      //  5 - profitWithdrawnOnCalculationIdx
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("2")), "wrong profitWithdrawnOnCalculationIdx for OWNER on 1");
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(DEPLOYER)).cmp(new BN("2")), "wrong profitWithdrawnOnCalculationIdx for DEPLOYER on 1");


      //  2
      //  62500 * 160000000 * 0.05 = 500000000000
      VALUE = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  62500 * 200000000 * 0.05 = 625000000000
      //  Total: 500000000000 + 625000000000 = 1125000000000
      VALUE = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: DEPLOYER
      });

      let OWNER_profit_before_2 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      let DEPLOYER_profit_before_2 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      assert.equal(1, OWNER_profit_before_2.cmp(new BN("0")), "should be 0 for OWNER before 2");
      assert.equal(1, DEPLOYER_profit_before_2.cmp(new BN("0")), "should be 0 for DEPLOYER before 2");

      let OWNER_balance_before_2 = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_before_2 = new BN(await web3.eth.getBalance(DEPLOYER));

      tx = await token.transfer(DEPLOYER, 10, 100, {
        from: OWNER
      });
      gasUsed = new BN(tx.receipt.gasUsed);
      txInfo = await web3.eth.getTransaction(tx.tx);
      gasPrice = new BN(txInfo.gasPrice);
      gasSpent = gasUsed.mul(gasPrice);

      //  3 - check senderBernardProfitAfter & receiverBernardProfitAfter
      let OWNER_profit_after_2 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      let DEPLOYER_profit_after_2 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      console.log("OWNER_profit_after_2:    ", OWNER_profit_after_2.toString());
      console.log("DEPLOYER_profit_after_2:  ", DEPLOYER_profit_after_2.toString());

      assert.equal(0, OWNER_profit_after_2.cmp(new BN("0")), "should be 0 for OWNER after 2");
      assert.equal(0, DEPLOYER_profit_after_2.cmp(new BN("0")), "should be 0 for DEPLOYER after 2");

      //  4 - check balance after
      let OWNER_balance_after_2 = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_after_2 = new BN(await web3.eth.getBalance(DEPLOYER));

      assert.equal(0, OWNER_balance_before_2.sub(gasSpent).add(OWNER_profit_before_2).cmp(OWNER_balance_after_2), "wrong OWNER_balance_after_2 balance after on 2");
      assert.equal(0, DEPLOYER_balance_before_2.add(DEPLOYER_profit_before_2).cmp(DEPLOYER_balance_after_2), "wrong DEPLOYER_balance_after_2 balance after on 2");

      //  5 - profitWithdrawnOnCalculationIdx
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("3")), "wrong profitWithdrawnOnCalculationIdx for OWNER on 2");
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(DEPLOYER)).cmp(new BN("3")), "wrong profitWithdrawnOnCalculationIdx for DEPLOYER on 2");


      //  3
      //  400000 * 250000000 * 0.05 = 5000000000000
      VALUE = SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  390625 * 320000000 * 0.05 = 6250000000000
      //  Total: 5000000000000 + 6250000000000 = 11250000000000
      VALUE = SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      
      let OWNER_profit_before_3 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      let DEPLOYER_profit_before_3 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      assert.equal(1, OWNER_profit_before_3.cmp(new BN("0")), "should be 0 for OWNER before 3");
      assert.equal(1, DEPLOYER_profit_before_3.cmp(new BN("0")), "should be 0 for DEPLOYER before 3");

      let OWNER_balance_before_3 = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_before_3 = new BN(await web3.eth.getBalance(DEPLOYER));

      tx = await token.transfer(OWNER, 10, 100, {
        from: DEPLOYER
      });
      gasUsed = new BN(tx.receipt.gasUsed);
      txInfo = await web3.eth.getTransaction(tx.tx);
      gasPrice = new BN(txInfo.gasPrice);
      gasSpent = gasUsed.mul(gasPrice);

      //  3 - check senderBernardProfitAfter & receiverBernardProfitAfter
      let OWNER_profit_after_3 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      let DEPLOYER_profit_after_3 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      console.log("OWNER_profit_after_3:    ", OWNER_profit_after_3.toString());
      console.log("DEPLOYER_profit_after_3:  ", DEPLOYER_profit_after_3.toString());

      assert.equal(0, OWNER_profit_after_3.cmp(new BN("0")), "should be 0 for OWNER after 3");
      assert.equal(0, DEPLOYER_profit_after_3.cmp(new BN("0")), "should be 0 for DEPLOYER after 3");

      //  4 - check balance after
      let OWNER_balance_after_3 = new BN(await web3.eth.getBalance(OWNER));
      let DEPLOYER_balance_after_3 = new BN(await web3.eth.getBalance(DEPLOYER));

      assert.equal(0, OWNER_balance_before_3.add(OWNER_profit_before_3).cmp(OWNER_balance_after_3), "wrong OWNER_balance_after_3 balance after on 3");
      assert.equal(0, DEPLOYER_balance_before_3.sub(gasSpent).add(DEPLOYER_profit_before_3).cmp(DEPLOYER_balance_after_3), "wrong DEPLOYER_balance_after_3 balance after on 3");

      //  5 - profitWithdrawnOnCalculationIdx
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("4")), "wrong profitWithdrawnOnCalculationIdx for OWNER on 3");
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(DEPLOYER)).cmp(new BN("4")), "wrong profitWithdrawnOnCalculationIdx for DEPLOYER on 3");
    });
  });

});