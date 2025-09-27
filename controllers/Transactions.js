const { Transaction, CashierFundBalance, Fund, CashierSession, Store } = require('../models');
const Validator = require('fastest-validator');
const { Op } = require("sequelize");

const v = new Validator();

exports.addTransaction = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  try {
    const { storeId, cashier_session_id, fund_source_id, items, note, status, transaction_type } = req.body;

    // cek apakah cashier_session valid & masih open
    const session = await CashierSession.findOne({ where: { id: cashier_session_id, status: "open" }, transaction: t });
    if (!session) {
      await t.rollback();
      return res.status(400).json({ message: "Cashier session tidak valid atau sudah ditutup" });
    }

    // --- Generate trxId ---
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    // cari transaksi terakhir di hari ini
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const lastTransaction = await Transaction.findOne({
      where: {
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      },
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
    let totalSum = 0;

    // buat semua transaksi (masih di dalam transaction t)
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

      // pastikan totalSum numeric
      totalSum += parseFloat(item.total) || 0;
    }

    // update atau buat cashier fund balance
    const fundBalance = await CashierFundBalance.findOne({
      where: {
        cashierSessionId: cashier_session_id,
        fundSourceId: fund_source_id
      },
      transaction: t,
      lock: t.LOCK.UPDATE // lock row untuk menghindari race condition
    });

    if (fundBalance) {
      const current = parseFloat(fundBalance.currentBalance) || 0;
      const newBalance = current + totalSum;
      console.log(newBalance);
      await fundBalance.update({ currentBalance: newBalance }, { transaction: t });
    } else {
      // jika belum ada record balance untuk session+fund, buat baru
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

    await t.commit();
    res.status(201).json({ message: "Transaksi berhasil", transactions: results });
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
