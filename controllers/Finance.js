// controllers/CashierController.js
const { CashierSession, CashierFundBalance, FinanceRecords, Fund } = require('../models')
const { Op } = require('sequelize');

exports.addIncome = async (req, res) => {
  const { storeId, cashier_session_id, fund_source_id, nominal, note } = req.body;

  try {
    // Validasi input
    if (!storeId || !cashier_session_id || !fund_source_id || !nominal) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    // Cek session kasir
    const session = await CashierSession.findOne({
      where: { id: cashier_session_id, storeId }
    });

    if (!session) {
      return res.status(404).json({ message: "Session kasir tidak ditemukan" });
    }

    // Buat record baru di finance_records
    const record = await FinanceRecords.create({
      storeId,
      cashierSessionId: cashier_session_id,
      fundSourceId: fund_source_id,
      type: "income",
      amount: nominal,
      note: note || "",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update atau buat currentBalance di CashierFundBalance
    let fundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id }
    });

    if (fundBalance) {
      fundBalance.currentBalance = parseFloat(fundBalance.currentBalance) + parseFloat(nominal);
      await fundBalance.save();
    } else {
      fundBalance = await CashierFundBalance.create({
        cashierSessionId: cashier_session_id,
        fundSourceId: fund_source_id,
        openingBalance: 0, // default kalau belum ada
        currentBalance: nominal,
        closingBalance: null,
        variance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return res.status(201).json({
      message: "Pemasukan berhasil dicatat",
      data: {
        record,
        fundBalance
      }
    });

  } catch (err) {
    console.error("Error income:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server", error: err.message });
  }
};

exports.addExpanse = async (req, res) => {
  const { storeId, cashier_session_id, fund_source_id, nominal, note } = req.body;

  try {
    // Validasi input
    if (!storeId || !cashier_session_id || !fund_source_id || !nominal) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    // Cek session kasir
    const session = await CashierSession.findOne({
      where: { id: cashier_session_id, storeId }
    });

    if (!session) {
      return res.status(404).json({ message: "Session kasir tidak ditemukan" });
    }

    // Buat record baru di finance_records
    const record = await FinanceRecords.create({
      storeId,
      cashierSessionId: cashier_session_id,
      fundSourceId: fund_source_id,
      type: "expanse",
      amount: nominal,
      note: note || "",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update atau buat currentBalance di CashierFundBalance
    let fundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id }
    });

    if (fundBalance) {
      // Cek apakah saldo cukup
      const newBalance = parseFloat(fundBalance.currentBalance) - parseFloat(nominal);
      if (newBalance < 0) {
        return res.status(400).json({ message: "Saldo tidak mencukupi untuk pengeluaran ini" });
      }

      fundBalance.currentBalance = newBalance;
      await fundBalance.save();
    } else {
      // Kalau fundBalance belum ada, artinya saldo awal 0, otomatis tidak bisa expense
      return res.status(400).json({ message: "Saldo sumber dana tidak ditemukan, tidak bisa melakukan pengeluaran" });
    }

    return res.status(201).json({
      message: "Pengeluaran berhasil dicatat",
      data: {
        record,
        fundBalance
      }
    });

  } catch (err) {
    console.error("Error expense:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server", error: err.message });
  }
};

exports.getFinanceSummaryToday = async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId wajib dikirim" });
    }

    // Ambil waktu hari ini (awal dan akhir)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Query total income dan expense hari ini
    const [incomeResult, expanseResult] = await Promise.all([
      FinanceRecords.sum('amount', {
        where: {
          storeId,
          type: 'income',
          createdAt: { [Op.between]: [startOfDay, endOfDay] },
        },
      }),
      FinanceRecords.sum('amount', {
        where: {
          storeId,
          type: 'expanse',
          createdAt: { [Op.between]: [startOfDay, endOfDay] },
        },
      }),
    ]);

    const income = incomeResult || 0;
    const expenses = expanseResult || 0;

    return res.status(200).json({
      message: "Rekap keuangan hari ini berhasil diambil",
      data: {
        income,
        expenses,
      },
    });

  } catch (err) {
    console.error("Error getFinanceSummaryToday:", err);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};

exports.getFinance = async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId wajib dikirim" });
    }

    const records = await FinanceRecords.findAll({
      where: { storeId },
      include: [
        {
          model: Fund,
          as: "fund",
          attributes: ["name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Ubah format agar FE mudah konsumsi
    const formatted = records.map((r) => ({
      id: r.id,
      name_fund: r.fund ? r.fund.name : "-",
      amount: parseFloat(r.amount),
      type: r.type,
      status: r.type === "income" ? "Pemasukan" : "Pengeluaran",
      note: r.note || "-",
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      message: "Data keuangan berhasil diambil",
      data: formatted,
    });
  } catch (err) {
    console.error("Error getFinance:", err);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
}