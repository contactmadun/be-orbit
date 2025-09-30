const { Transaction, CashierFundBalance, Fund, CashierSession, Store } = require('../models');
const Validator = require('fastest-validator');
const { Op } = require("sequelize");

const v = new Validator();

exports.addTransactionManual = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  try {
    const { storeId, cashier_session_id, fund_source_id, items, note, status, transaction_type } = req.body;

    // --- cek cashier session ---
    const session = await CashierSession.findOne({
      where: { id: cashier_session_id, status: "open" },
      transaction: t
    });
    if (!session) {
      await t.rollback();
      return res.status(400).json({ message: "Cashier session tidak valid atau sudah ditutup" });
    }

    // --- cari fund default ---
    const defaultFund = await Fund.findOne({
      where: { storeId, isDefault: 1 },
      transaction: t
    });
    if (!defaultFund) {
      await t.rollback();
      return res.status(400).json({ message: "Fund default tidak ditemukan" });
    }

    // --- Generate trxId ---
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const lastTransaction = await Transaction.findOne({
      where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } },
      order: [["createdAt", "DESC"]],
      transaction: t
    });

    let counter = 1;
    if (lastTransaction && lastTransaction.trxId) {
      const lastCounter = parseInt(lastTransaction.trxId.slice(-3), 10);
      if (!isNaN(lastCounter)) counter = lastCounter + 1;
    }
    const trxId = `TRX-${dd}${mm}${String(counter).padStart(3, "0")}`;

    // --- buat transaksi manual (hanya 1 item) ---
    const item = items[0];
    const trx = await Transaction.create({
      trxId,
      storeId,
      cashier_session_id,
      fund_source_id,
      product_id: item.product_id,
      qty: item.qty,
      cost_price: item.cost_price,
      price: item.price,
      total: item.total,
      profit: item.profit,
      status,
      transaction_type,
      note
    }, { transaction: t });

    const totalSum = parseFloat(item.total) || 0;
    const costSum = parseFloat(item.cost_price) || 0;

    // ==================================================
    // 1. SELALU tambahkan total ke fund default
    // ==================================================
    const fundDefaultBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: defaultFund.id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (fundDefaultBalance) {
      const current = parseFloat(fundDefaultBalance.currentBalance) || 0;
      await fundDefaultBalance.update(
        { currentBalance: current + totalSum },
        { transaction: t }
      );
    } else {
      await CashierFundBalance.create({
        cashierSessionId: cashier_session_id,
        fundSourceId: defaultFund.id,
        openingBalance: 0,
        currentBalance: totalSum,
        closingBalance: null,
        variance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { transaction: t });
    }

    // ==================================================
    // 2. Jika ada fund_source_id, kurangi cost_price
    // ==================================================
    if (fund_source_id) {
      const fundBalance = await CashierFundBalance.findOne({
        where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (fundBalance) {
        const current = parseFloat(fundBalance.currentBalance) || 0;
        await fundBalance.update(
          { currentBalance: current - costSum },
          { transaction: t }
        );
      } else {
        await CashierFundBalance.create({
          cashierSessionId: cashier_session_id,
          fundSourceId: fund_source_id,
          openingBalance: 0,
          currentBalance: -costSum, // karena dikurangi
          closingBalance: null,
          variance: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }, { transaction: t });
      }
    }

    // ==================================================
    await t.commit();
    res.status(201).json({ message: "Transaksi manual berhasil", transaction: trx });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: "Gagal transaksi manual", error: err.message });
  }
};

exports.addTransaction = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  try {
    const { 
      storeId, 
      cashier_session_id, 
      fund_source_id, 
      resourceFund, 
      items, 
      note, 
      status, 
      transaction_type 
    } = req.body;

    // cek cashier session
    const session = await CashierSession.findOne({ 
      where: { id: cashier_session_id, status: "open" }, 
      transaction: t 
    });
    if (!session) {
      await t.rollback();
      return res.status(400).json({ message: "Cashier session tidak valid atau sudah ditutup" });
    }

    // generate trxId
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const lastTransaction = await Transaction.findOne({
      where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } },
      order: [["createdAt", "DESC"]],
      transaction: t
    });

    let counter = 1;
    if (lastTransaction && lastTransaction.trxId) {
      const lastCounter = parseInt(lastTransaction.trxId.slice(-3), 10);
      if (!isNaN(lastCounter)) counter = lastCounter + 1;
    }

    const trxId = `TRX-${dd}${mm}${String(counter).padStart(3, "0")}`;

    const results = [];
    let totalSum = 0;       // total harga jual
    let sumCostPrice = 0;   // total modal

    // buat transaksi
    for (const item of items) {
      const trx = await Transaction.create({
        trxId,
        storeId,
        cashier_session_id,
        fund_source_id,
        product_id: item.product_id,
        customer_name: req.body.customer_name || null,
        customer_phone: req.body.customer_phone || null,
        qty: item.qty,
        cost_price: item.cost_price,
        price: item.price,
        total: item.total,
        profit: item.profit,
        status,
        transaction_type,
        note
      }, { transaction: t });

      results.push(trx);

      totalSum += parseFloat(item.total) || 0;
      sumCostPrice += (parseFloat(item.cost_price) || 0) * (parseInt(item.qty) || 0);
    }

    // update atau buat balance untuk fund_source_id
    const fundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (fundBalance) {
      const current = parseFloat(fundBalance.currentBalance) || 0;
      const newBalance = current + totalSum;
      await fundBalance.update({ currentBalance: newBalance }, { transaction: t });
    } else {
      await CashierFundBalance.create({
        cashierSessionId: cashier_session_id,
        fundSourceId: fund_source_id,
        openingBalance: 0,
        currentBalance: totalSum,
        closingBalance: null,
        variance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { transaction: t });
    }

    // jika resourceFund ada → kurangi saldo resourceFund dengan sumCostPrice
    if (resourceFund) {
      const resourceBalance = await CashierFundBalance.findOne({
        where: { cashierSessionId: cashier_session_id, fundSourceId: resourceFund },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (resourceBalance) {
        const current = parseFloat(resourceBalance.currentBalance) || 0;
        const newBalance = current - sumCostPrice;
        await resourceBalance.update({ currentBalance: newBalance }, { transaction: t });
      } else {
        await CashierFundBalance.create({
          cashierSessionId: cashier_session_id,
          fundSourceId: resourceFund,
          openingBalance: 0,
          currentBalance: -sumCostPrice,
          closingBalance: null,
          variance: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }, { transaction: t });
      }
    }

    await t.commit();
    res.status(201).json({ 
      message: "Transaksi berhasil", 
      transactions: results, 
      totalSum, 
      sumCostPrice 
    });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: "Gagal menyimpan transaksi", error: err.message });
  }
};


exports.getProfit = async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({ message: "storeId wajib dikirim" });
    }

    // cek apakah ada cashier session aktif
    // const session = await CashierSession.findOne({
    //   where: { storeId: storeId, status: "open" }
    // });

    // if (!session) {
    //   return res.status(400).json({ message: "Tidak ada cashier session yang aktif" });
    // }

    // range waktu hari ini
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // hitung total profit transaksi hari ini
    const totalProfit = await Transaction.sum("profit", {
      where: {
        storeId: storeId,
        // cashier_session_id: session.id,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
        status: "success" // opsional, kalau kamu ada filter status transaksi
      }
    });

    return res.json({
      storeId,
      // cashierSessionId: session.id,
      date: startOfDay.toISOString().split("T")[0],
      totalProfit: totalProfit || 0
    });

  } catch (error) {
    console.error("Error getProfit:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addTrxWd = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  try {
    const { storeId, cashier_session_id, fund_source_id, amount, adminFee, adminInside, note } = req.body;

    // 1. Cek apakah ada session aktif
    const session = await CashierSession.findOne({
      where: { id: cashier_session_id, storeId, status: "open" },
      transaction: t
    });
    if (!session) {
      throw new Error("Tidak ada cashier session aktif");
    }

    // 2. Ambil default fund
    const defaultFund = await Fund.findOne({
      where: { storeId, isDefault: 1 },
      transaction: t
    });
    if (!defaultFund) {
      throw new Error("Default fund tidak ditemukan");
    }

    // 3. Ambil fund tujuan
    const targetFund = await Fund.findOne({
      where: { id: fund_source_id, storeId },
      transaction: t
    });
    if (!targetFund) {
      throw new Error("Fund tujuan tidak ditemukan");
    }

    // 4. Ambil saldo session
    const defaultFundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: defaultFund.id },
      transaction: t
    });

    const targetFundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id },
      transaction: t
    });

    if (!defaultFundBalance) throw new Error("Saldo default fund tidak ditemukan di session aktif");
    if (!targetFundBalance) throw new Error("Saldo fund tujuan tidak ditemukan di session aktif");

    // Pastikan currentBalance numerik
    const defBal = Number(defaultFundBalance.currentBalance) || 0;
    const tgtBal = Number(targetFundBalance.currentBalance) || 0;
    const amt = Number(amount) || 0;
    const fee = Number(adminFee) || 0;

    // 5. Update balance
    if (!adminInside) {
      // Admin di luar
      defaultFundBalance.currentBalance = defBal - (amt - fee);
      targetFundBalance.currentBalance = tgtBal + amt;
    } else {
      // Admin di dalam
      defaultFundBalance.currentBalance = defBal - amt;
      targetFundBalance.currentBalance = tgtBal + (amt + fee);
    }

    await defaultFundBalance.save({ transaction: t });
    await targetFundBalance.save({ transaction: t });

    // --- Generate trxId ---
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const lastTransaction = await Transaction.findOne({
      where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } },
      order: [["createdAt", "DESC"]],
      transaction: t
    });

    let counter = 1;
    if (lastTransaction && lastTransaction.trxId) {
      const lastCounter = parseInt(lastTransaction.trxId.slice(-3), 10);
      if (!isNaN(lastCounter)) counter = lastCounter + 1;
    }
    const trxId = `TRX-${dd}${mm}${String(counter).padStart(3, "0")}`;

    // 6. Simpan transaksi
    const trx = await Transaction.create({
      trxId,
      storeId,
      cashier_session_id,
      fund_source_id,
      transaction_type: "withdrawal",
      status: "success",
      note,
      total: amt,
      cost_price: amt,
      price: 0,
      profit: fee,
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: "Tarik tunai berhasil", transaction: trx });
  } catch (error) {
    await t.rollback();
    console.error("Error addTrxWd:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addTrxTransfer = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  try {
    const { storeId, cashier_session_id, fund_source_id, amount, adminFee, adminBank, note } = req.body;

    // 1. Cek apakah ada session aktif
    const session = await CashierSession.findOne({
      where: { id: cashier_session_id, storeId, status: "open" },
      transaction: t
    });
    if (!session) {
      throw new Error("Tidak ada cashier session aktif");
    }

    // 2. Ambil default fund
    const defaultFund = await Fund.findOne({
      where: { storeId, isDefault: 1 },
      transaction: t
    });
    if (!defaultFund) {
      throw new Error("Default fund tidak ditemukan");
    }

    // 3. Ambil fund tujuan
    const targetFund = await Fund.findOne({
      where: { id: fund_source_id, storeId },
      transaction: t
    });
    if (!targetFund) {
      throw new Error("Fund tujuan tidak ditemukan");
    }

    // 4. Ambil saldo session
    const defaultFundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: defaultFund.id },
      transaction: t
    });

    const targetFundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id },
      transaction: t
    });

    if (!defaultFundBalance) throw new Error("Saldo default fund tidak ditemukan di session aktif");
    if (!targetFundBalance) throw new Error("Saldo fund tujuan tidak ditemukan di session aktif");

    // Pastikan currentBalance numerik
    const defBal = Number(defaultFundBalance.currentBalance) || 0;
    const tgtBal = Number(targetFundBalance.currentBalance) || 0;
    const amt = Number(amount) || 0;
    const fee = Number(adminFee) || 0;
    const admBank = Number(adminBank) || 0;

    // 5. Update balance
    defaultFundBalance.currentBalance = defBal + amt + fee;
    targetFundBalance.currentBalance = tgtBal - (amt + admBank);

    await defaultFundBalance.save({ transaction: t });
    await targetFundBalance.save({ transaction: t });

    // --- Generate trxId ---
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const lastTransaction = await Transaction.findOne({
      where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } },
      order: [["createdAt", "DESC"]],
      transaction: t
    });

    let counter = 1;
    if (lastTransaction && lastTransaction.trxId) {
      const lastCounter = parseInt(lastTransaction.trxId.slice(-3), 10);
      if (!isNaN(lastCounter)) counter = lastCounter + 1;
    }
    const trxId = `TRX-${dd}${mm}${String(counter).padStart(3, "0")}`;

    const prof = fee - admBank;

    // 6. Simpan transaksi
    const trx = await Transaction.create({
      trxId,
      storeId,
      cashier_session_id,
      fund_source_id,
      transaction_type: "transfer",
      status: "success",
      note,
      total: amt,
      cost_price: amt,
      price: 0,
      profit: prof,
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: "Transfer tunai berhasil", transaction: trx });
  } catch (error) {
    await t.rollback();
    console.error("Error addTrxWd:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

