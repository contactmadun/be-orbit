// controllers/CashierController.js
const { CashierSession, CashierFundBalance, FinanceRecords } = require('../models')

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
