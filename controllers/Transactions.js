const { Transaction, CashierFundBalance, Fund, CashierSession, Product } = require('../models');
const Validator = require('fastest-validator');
const { Op, fn, col, literal } = require("sequelize");

const v = new Validator();

exports.addTransactionManual = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  try {
    const { storeId, cashier_session_id, fund_source_id, customerName, phoneNumber, items, note, status, transaction_type } = req.body;

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
      customer_name: customerName, 
      customer_phone: phoneNumber,
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
      const newBalance = status === "Lunas" ? current + totalSum : current;
      await fundDefaultBalance.update(
        { currentBalance: newBalance },
        { transaction: t }
      );
    } else {
      await CashierFundBalance.create({
        cashierSessionId: cashier_session_id,
        fundSourceId: defaultFund.id,
        openingBalance: 0,
        currentBalance: status === "Lunas" ? totalSum : 0,
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
      customerName,
      phoneNumber, 
      status, // "Lunas" atau "Belum Lunas"
      transaction_type 
    } = req.body;

    // ✅ Cek session kasir
    const session = await CashierSession.findOne({ 
      where: { id: cashier_session_id, status: "open" }, 
      transaction: t 
    });
    if (!session) {
      await t.rollback();
      return res.status(400).json({ message: "Cashier session tidak valid atau sudah ditutup" });
    }

    // ✅ Generate trxId unik harian
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

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

      // ✅ Generate kode VAC acak (huruf + angka, 5 karakter)
    function generateVAC(length = 5) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let vac = '';
      for (let i = 0; i < length; i++) {
        vac += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return vac;
    }

    const results = [];
    let totalSum = 0;       // total harga jual
    let sumCostPrice = 0;   // total modal

    // ✅ Buat transaksi per item
    for (const item of items) {
      const vac = generateVAC();

      const trx = await Transaction.create({
        trxId,
        storeId,
        cashier_session_id,
        fund_source_id,
        resourceFund,
        product_id: item.product_id,
        customer_name: customerName, 
        customer_phone: phoneNumber,
        qty: item.qty,
        cost_price: item.cost_price,
        price: item.price,
        total: item.total,
        profit: item.profit,
        status,
        transaction_type,
        note,
        vac
      }, { transaction: t });

      results.push(trx);

      totalSum += parseFloat(item.total) || 0;
      sumCostPrice += (parseFloat(item.cost_price) || 0) * (parseInt(item.qty) || 0);
    }

    // ✅ Update atau buat fund balance untuk fund_source_id
    const fundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (fundBalance) {
      const current = parseFloat(fundBalance.currentBalance) || 0;
      const newBalance = status === "Lunas" ? current + totalSum : current; // ✅ hanya update jika Lunas
      await fundBalance.update({ currentBalance: newBalance }, { transaction: t });
    } else {
      await CashierFundBalance.create({
        cashierSessionId: cashier_session_id,
        fundSourceId: fund_source_id,
        openingBalance: 0,
        currentBalance: status === "Lunas" ? totalSum : 0, // ✅ jika Belum Lunas, tetap 0
        closingBalance: null,
        variance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { transaction: t });
    }

    // ✅ Jika ada resourceFund → kurangi saldo modal (cost)
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
        status: "Lunas" // opsional, kalau kamu ada filter status transaksi
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
      status: "Lunas",
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
    defaultFundBalance.currentBalance = defBal + amt;
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
      status: "Lunas",
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

exports.getReport = async (req, res) => {
  try {
    const { storeId, cashierSessionId } = req.params

    if (!storeId || !cashierSessionId) {
      return res.status(400).json({ message: "storeId dan cashierSessionId wajib dikirim" })
    }

    // range waktu hari ini
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    // 1. total transaksi
    const totalTransactions = await Transaction.count({
      where: {
        storeId,
        cashier_session_id: cashierSessionId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
        status: "Lunas"
      }
    })

    // 2. total produk terjual
    const totalProducts = await Transaction.sum("qty", {
      where: {
        storeId,
        cashier_session_id: cashierSessionId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
        status: "Lunas"
      }
    })

    // 3. produk terlaris
    const bestProduct = await Transaction.findOne({
      attributes: [
        "product_id",
        [fn("SUM", col("qty")), "totalSold"]
      ],
      where: {
        storeId,
        cashier_session_id: cashierSessionId,
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
        status: "Lunas"
      },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["name"]
        }
      ],
      group: ["product_id", "product.id"],
      order: [[literal("totalSold"), "DESC"]],
      limit: 1
    })

    return res.json({
      storeId,
      cashierSessionId,
      date: startOfDay.toISOString().split("T")[0],
      totalTransactions,
      totalProducts: totalProducts || 0,
      bestProduct: bestProduct?.product?.name || "-"
    })
  } catch (error) {
    console.error("Error getDailyReport:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

exports.getLastTransactions = async (req, res) => {
  try {
    const { storeId, cashierSessionId } = req.params

    if (!storeId || !cashierSessionId) {
      return res.status(400).json({ message: "storeId dan cashierSessionId wajib dikirim" })
    }

    // Range waktu hari ini
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    // Ambil 5 transaksi terakhir untuk hari ini
    const transactions = await Transaction.findAll({
      where: {
        storeId,
        cashier_session_id: cashierSessionId,
        status: "Lunas",
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      },
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name"]
        }
      ]
    })

    // Format hasil
    const result = transactions.map((tx) => ({
      id: `TRX-${String(tx.id).padStart(3, "0")}`, // format TRX-001
      time: tx.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      desc: tx.product?.name || tx.note || "Tanpa keterangan",
      amount: parseFloat(tx.total)
    }))

    return res.json(result)
  } catch (error) {
    console.error("Error getLastTransactions:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

exports.getTransactions = async (req, res) => {
  try {
    const { storeId, cashierSessionId } = req.params;

    if (!storeId) {
      return res.status(400).json({ message: "storeId wajib dikirim" });
    }

    // Filter dasar
    const whereClause = {
      storeId,
      status: "Lunas",
    };
    if (cashierSessionId) {
      whereClause.cashier_session_id = cashierSessionId;
    }

    // Ambil semua transaksi
    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!transactions.length) {
      return res.json([]);
    }

    // Group transaksi berdasarkan tanggal
    const grouped = {};
    transactions.forEach((tx) => {
      const date = new Date(tx.createdAt).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      if (!grouped[date]) {
        grouped[date] = {
          date,
          total: 0,
          sumProfit: 0,
          transactions: [],
        };
      }

      grouped[date].transactions.push({
        id: tx.id,
        title: tx.product?.name || tx.note,
        code: tx.trxId,
        status: tx.status,
        amount: parseFloat(tx.total),
        profit: parseFloat(tx.profit),
        time: new Date(tx.createdAt).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        note: tx.note,
      });

      grouped[date].total += parseFloat(tx.total);
      grouped[date].sumProfit += parseFloat(tx.profit);
    });

    // Konversi hasil ke array & urutkan tanggal terbaru
    const result = Object.values(grouped).sort((a, b) => {
      const da = new Date(a.date.split(", ")[1]);
      const db = new Date(b.date.split(", ")[1]);
      return db - da;
    });

    return res.json(result);
  } catch (error) {
    console.error("Error getTransactions:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getDataBon = async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId wajib dikirim" });
    }

    // ✅ Ambil semua transaksi yang belum lunas
    const data = await Transaction.findAll({
      where: {
        storeId,
        status: "Belum Lunas"
      },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name"]
        }
      ],
      attributes: ["id", "product_id", "note", "customer_name", "customer_phone", "total", "createdAt"]
    });

    // ✅ Hitung total nominal piutang & jumlah transaksi
    const totalPiutang = data.reduce((sum, trx) => sum + parseFloat(trx.total || 0), 0);
    const jumlahTransaksi = data.length;

    res.status(200).json({
      message: "Data bon berhasil diambil",
      totalPiutang,
      jumlahTransaksi,
      data
    });
  } catch (err) {
    console.error("Error getDataBon:", err);
    res.status(500).json({ message: "Gagal mengambil data bon", error: err.message });
  }
};

exports.payBon = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  try {
    const { trxId, storeId, fund_source_id, cashier_session_id } = req.body;

    // 🔍 Cari transaksi bon
    const trx = await Transaction.findOne({
      where: { id: trxId, storeId, status: "Belum Lunas" },
      transaction: t,
    });

    if (!trx) {
      await t.rollback();
      return res.status(404).json({ message: "Transaksi bon tidak ditemukan atau sudah lunas" });
    }

    // 🔍 Ambil fund source yang dipilih
    const fund = await Fund.findOne({
      where: { id: fund_source_id, storeId },
      transaction: t,
    });
    if (!fund) {
      await t.rollback();
      return res.status(404).json({ message: "Sumber dana tidak ditemukan" });
    }

    // 🔍 Cari balance fund untuk sesi kasir ini
    let fundBalance = await CashierFundBalance.findOne({
      where: {
        cashierSessionId: cashier_session_id,
        fundSourceId: fund_source_id,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const totalSum = parseFloat(trx.total) || 0;
    const current = fundBalance ? parseFloat(fundBalance.currentBalance) || 0 : 0;
    const newBalance = current + totalSum;

    if (fundBalance) {
      await fundBalance.update(
        { currentBalance: newBalance },
        { transaction: t }
      );
    } else {
      await CashierFundBalance.create({
        cashierSessionId: trx.cashier_session_id,
        fundSourceId: fund_source_id,
        openingBalance: 0,
        currentBalance: totalSum,
        closingBalance: null,
        variance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { transaction: t });
    }

    // 🔁 Update status transaksi jadi Lunas
    await trx.update(
      { status: "Lunas", fund_source_id },
      { transaction: t }
    );

    await t.commit();
    res.status(200).json({ message: "Bon berhasil dilunasi", transaction: trx });
  } catch (err) {
    await t.rollback();
    console.error("Gagal melunasi bon:", err);
    res.status(500).json({ message: "Gagal melunasi bon", error: err.message });
  }
};

exports.getTransactionDetail = async (req, res) => {
  try {
    const { id } = req.params; // bisa pakai id atau trxId
    if (!id) {
      return res.status(400).json({ message: "id atau trxId wajib dikirim" });
    }

    // cari transaksi berdasarkan id atau trxId
    const transaction = await Transaction.findOne({
      where: {
        [Op.or]: [
          { id: id },
          { trxId: id }
        ]
      },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "purchasePrice", "retailPrice"]
        },
        {
          model: Fund,
          as: "fund",
          attributes: ["id", "name", "isDefault"]
        },
        {
          model: CashierSession,
          as: "cashier_session",
          attributes: ["id", "openedAt", "closedAt", "status"]
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    // format respons
    const detail = {
      id: transaction.id,
      trxId: transaction.trxId,
      customer: {
        name: transaction.customer_name || "-",
        phone: transaction.customer_phone || "-"
      },
      product: transaction.product ? {
        id: transaction.product.id,
        name: transaction.product.name,
        // price: transaction.retailPrice,
        // costPrice: transaction.purchasePrice
      } : null,
      qty: transaction.qty,
      costPrice: parseFloat(transaction.cost_price),
      total: parseFloat(transaction.total),
      profit: parseFloat(transaction.profit),
      vac: transaction.vac,
      note: transaction.note,
      status: transaction.status,
      transaction_type: transaction.transaction_type,
      fund_source: transaction.fund_source ? transaction.fund_source.name : "-",
      cashier_session: transaction.cashier_session
        ? {
            id: transaction.cashier_session.id,
            status: transaction.cashier_session.status,
            open_time: transaction.cashier_session.openedAt,
            close_time: transaction.cashier_session.closedAt
          }
        : null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };

    return res.json(detail);
  } catch (error) {
    console.error("Error getTransactionDetail:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.voidTransaction = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  try {
    const { id } = req.params;
    const { vac } = req.body;

    if (!vac) return res.status(400).json({ message: "Kode VAC wajib dikirim" });

    // Ambil transaksi asli
    const trx = await Transaction.findOne({ where: { id }, transaction: t });
    if (!trx) {
      await t.rollback();
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    // Validasi VAC
    if (trx.vac !== vac) {
      await t.rollback();
      return res.status(400).json({ message: "Kode VAC tidak valid" });
    }

    // Pastikan belum void
    if (trx.status === "Void") {
      await t.rollback();
      return res.status(400).json({ message: "Transaksi sudah di-void" });
    }

    // Ambil fund balance (default dan resource)
    const { cashier_session_id, fund_source_id, storeId, total, cost_price, profit, status } = trx;

    // fundSource (uang penjualan)
    const fundBalance = await CashierFundBalance.findOne({
      where: { cashierSessionId: cashier_session_id, fundSourceId: fund_source_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    // resourceFund (modal)
    const resourceFundBalance = trx.resourceFund
      ? await CashierFundBalance.findOne({
          where: { cashierSessionId: cashier_session_id, fundSourceId: trx.resourceFund },
          transaction: t,
          lock: t.LOCK.UPDATE
        })
      : null;

    // Rollback saldo jika transaksi Lunas
    if (status === "Lunas") {
      if (fundBalance) {
        const current = parseFloat(fundBalance.currentBalance) || 0;
        await fundBalance.update(
          { currentBalance: current - parseFloat(total) },
          { transaction: t }
        );
      }

      if (resourceFundBalance) {
        const current = parseFloat(resourceFundBalance.currentBalance) || 0;
        await resourceFundBalance.update(
          { currentBalance: current + parseFloat(cost_price) },
          { transaction: t }
        );
      }
    }

    // Update status transaksi → Void
    await trx.update(
      {
        status: "Void",
        profit: 0, // profit dihapus
        note: trx.note ? `${trx.note} [VOIDED ${new Date().toLocaleString("id-ID")}]` : `[VOIDED ${new Date().toLocaleString("id-ID")}]`
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: "Transaksi berhasil di-void", transaction: trx });
  } catch (error) {
    await t.rollback();
    console.error("Error voidTransaction:", error);
    res.status(500).json({ message: "Gagal void transaksi", error: error.message });
  }
};
