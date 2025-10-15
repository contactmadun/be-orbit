const { Fund, CashierFundBalance, CashierSession, sequelize } = require('../models');
const Validator = require('fastest-validator');

const v = new Validator();

exports.addFund = async (req, res) => {
  try {
    const schema = {
      storeId: { type: "number", positive: true, integer: true },
      name: { type: "string", min: 3, max: 100 }
    };

    const validate = v.validate(req.body, schema);
    if (validate.length) {
      return res.status(400).json(validate);
    }

    // Cek apakah nama sumber dana sudah ada di store ini
    const existingFund = await Fund.findOne({
      where: { storeId: req.body.storeId, name: req.body.name }
    });

    if (existingFund) {
      return res.status(400).json({ message: "Sumber dana dengan nama ini sudah ada." });
    }

    // Simpan data baru
    const newFund = await Fund.create({
      storeId: req.body.storeId,
      name: req.body.name
    });

    return res.json({
      message: "Sumber dana berhasil ditambahkan",
      id: newFund.id,
      name: newFund.name
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getFund = async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({ message: "storeId wajib dikirim" });
    }

    const funds = await Fund.findAll({
      where: { storeId: storeId }
    });

    return res.json(funds);
  } catch (error) {
    console.error("Error getFund:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getFundExceptDefault = async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({ message: "storeId wajib dikirim" });
    }

    const funds = await Fund.findAll({
      where: { storeId: storeId,
               isDefault: 0
       }
    });

    // console.log(funds);
    return res.json(funds);
  } catch (error) {
    console.error("Error getFund:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getFundDefault = async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({ message: "storeId wajib dikirim" });
    }

    const fund = await Fund.findOne({
      where: {
        storeId: storeId,
        isDefault: 1
      }
    });

    if (!fund) {
      return res.status(404).json({ message: "Fund default tidak ditemukan" });
    }

    return res.json(fund);
  } catch (error) {
    console.error("Error getFundDefault:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.topupFund = async (req, res) => {
  const t = await CashierFundBalance.sequelize.transaction();
  try {
    const { storeId, cashier_session_id, fund_source_id, nominal, note } = req.body;

    if (!storeId || !cashier_session_id || !fund_source_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "storeId, cashier_session_id dan fund_source_id wajib dikirim" });
    }

    const amount = Number(nominal);
    if (isNaN(amount) || amount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Nominal tidak valid" });
    }

    // 1) cek session aktif
    const session = await CashierSession.findOne({
      where: { id: cashier_session_id, storeId, status: "open" },
      transaction: t
    });
    if (!session) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Session kasir tidak ditemukan atau tidak aktif" });
    }

    // 2) cek fund source ada
    const fund = await Fund.findOne({
      where: { id: fund_source_id, storeId },
      transaction: t
    });
    if (!fund) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Sumber dana tidak ditemukan" });
    }

    // 3) ambil atau buat CashierFundBalance untuk session+fund (lock row)
    let fundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!fundBalance) {
      // create initial record (openingBalance 0)
      fundBalance = await CashierFundBalance.create({
        cashierSessionId: cashier_session_id,
        fundSourceId: fund_source_id,
        openingBalance: 0,
        currentBalance: amount.toFixed(2),
        closingBalance: null,
        variance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { transaction: t });
    } else {
      // konversi ke number (DECIMAL biasanya string)
      const current = parseFloat(fundBalance.currentBalance) || 0;
      const newBalance = current + amount;
      // simpan sebagai string dengan 2 desimal agar sesuai DECIMAL
      await fundBalance.update({ currentBalance: newBalance.toFixed(2) }, { transaction: t });
      // reload instance supaya value terbarui
      await fundBalance.reload({ transaction: t });
    }

    // (opsional) — kalau mau insert log transaksi topup ke table Transaction,
    // bisa dibuat di sini (tidak dimasukkan karena kamu belum minta).
    // contoh singkat:
    // await Transaction.create({ ... }, { transaction: t });

    await t.commit();
    return res.json({ success: true, message: "Saldo berhasil ditambahkan", balance: fundBalance });
  } catch (error) {
    await t.rollback();
    console.error("Error topupFund:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

exports.transferFund = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { storeId, cashier_session_id, sourceFundId, targetFundId, nominal } = req.body;

    // pastikan integer
    const sourceId = parseInt(sourceFundId, 10);
    const targetId = parseInt(targetFundId, 10);
    const amount = parseFloat(nominal);

    if (!sourceId || !targetId) {
      return res.status(400).json({ message: "Fund ID tidak valid" });
    }

    if (sourceId === targetId) {
      return res.status(400).json({ message: "Sumber dan tujuan tidak boleh sama" });
    }

    // cek session aktif
    const session = await CashierSession.findOne({
      where: { id: cashier_session_id, storeId, status: "open" },
      transaction: t
    });

    if (!session) {
      await t.rollback();
      return res.status(400).json({ message: "Tidak ada sesi kasir aktif" });
    }

    // cari saldo fund asal
    const sourceFund = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: sourceId },
      transaction: t
    });

    if (!sourceFund) {
      await t.rollback();
      return res.status(404).json({ message: "Sumber dana tidak ditemukan" });
    }

    if (parseFloat(sourceFund.currentBalance) < amount) {
      await t.rollback();
      return res.status(400).json({ message: "Saldo sumber tidak mencukupi" });
    }

    // cari saldo fund tujuan
    let targetFund = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: targetId },
      transaction: t
    });

    if (!targetFund) {
      await t.rollback();
      return res.status(404).json({ message: "Tujuan dana tidak ditemukan" });
    }

    // update balances (pakai currentBalance sesuai model)
    sourceFund.currentBalance = parseFloat(sourceFund.currentBalance) - amount;
    targetFund.currentBalance = parseFloat(targetFund.currentBalance) + amount;

    await sourceFund.save({ transaction: t });
    await targetFund.save({ transaction: t });

    await t.commit();
    return res.json({
      message: "Transfer berhasil",
      from: sourceId,
      to: targetId,
      amount
    });

  } catch (error) {
    console.error("Error transferFund:", error);
    await t.rollback();
    return res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
  }
};

exports.getFundBalancesBySession = async (req, res) => {
  try {
    const { storeId, cashierSessionId } = req.params;

    if (!storeId || !cashierSessionId) {
      return res.status(400).json({ message: "storeId dan cashierSessionId wajib dikirim" });
    }

    // Ambil semua fund milik store
    const funds = await Fund.findAll({
      where: { storeId: storeId },
      raw: true
    });

    // Ambil semua balance fund pada session kasir
    const balances = await CashierFundBalance.findAll({
      where: { cashierSessionId: cashierSessionId },
      include: [
        {
          model: Fund,
          as: 'fundSource',
          attributes: ['id', 'name']
        }
      ],
      raw: true,
      nest: true
    });

    // Gabungkan data fund dan balance
    const result = funds.map((fund) => {
      const balanceData = balances.find(b => b.fundSourceId === fund.id);
      return {
        id: fund.id,
        title: fund.name,
        openingBalance: balanceData ? parseFloat(balanceData.openingBalance) : 0,
        currentBalance: balanceData ? parseFloat(balanceData.currentBalance) : 0,
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error getFundBalancesBySession:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};