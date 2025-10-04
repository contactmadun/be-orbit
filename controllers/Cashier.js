// controllers/CashierController.js
const { CashierSession, CashierFundBalance, Transaction, FinanceRecords, Reports } = require('../models')

exports.openCashier = async (req, res) => {
  const { userId, storeId, funds } = req.body
  // funds = [{ fundSourceId: 1, amount: 100000 }, { fundSourceId: 2, amount: 50000 }]

  try {
    // 1. buat session kasir baru
    const session = await CashierSession.create({
      userId,
      storeId,
      openedAt: new Date(),
      status: 'open'
    })

    // 2. isi tabel fund balances
    const balances = await Promise.all(
      funds.map(f => CashierFundBalance.create({
        cashierSessionId: session.id,
        fundSourceId: f.fundSourceId,
        openingBalance: f.amount,
        currentBalance: f.amount
      }))
    )

    res.status(201).json({
      session,
      balances
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal membuka kasir', error: err })
  }
}

exports.getActiveSession = async (req, res) => {
  try {
    const { storeId } = req.params
    const session = await CashierSession.findOne({
      where: { storeId, status: "open" }
    })
    res.json(session) // bisa null kalau tidak ada
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Gagal ambil session" })
  }
}

  // exports.closeCashier = async (req, res) => {
  //   const t = await CashierSession.sequelize.transaction()
  //   try {
  //     const { cashierSessionId, funds } = req.body

  //     if (!cashierSessionId || !Array.isArray(funds)) {
  //       return res.status(400).json({ message: "cashierSessionId & funds wajib dikirim" })
  //     }

  //     // ambil session lengkap (harus include semua kolom)
  //     const session = await CashierSession.findOne({
  //       where: { id: cashierSessionId, status: "open" },
  //       transaction: t,
  //       raw: false // penting supaya instance bisa .save()
  //     })

  //     if (!session) {
  //       await t.rollback()
  //       return res.status(404).json({ message: "Session tidak ditemukan atau sudah ditutup" })
  //     }

  //     let totalVariance = 0
  //     let updatedFunds = []

  //     // update fund balances
  //     for (const f of funds) {
  //       const fundBalance = await CashierFundBalance.findOne({
  //         where: { cashierSessionId, fundSourceId: f.fundSourceId },
  //         transaction: t
  //       })

  //       if (!fundBalance) continue

  //       const closingBalance = parseFloat(f.amount) || 0
  //       const variance = closingBalance - parseFloat(fundBalance.currentBalance)

  //       await fundBalance.update(
  //         { closingBalance, variance },
  //         { transaction: t }
  //       )

  //       totalVariance += variance
  //       updatedFunds.push({
  //         fundSourceId: f.fundSourceId,
  //         closingBalance,
  //         variance
  //       })
  //     }

  //     // update status session jadi close
  //     await session.update(
  //       { status: "close", closedAt: new Date() },
  //       { transaction: t }
  //     )

  //     await t.commit()

  //     return res.json({
  //       message: "Kasir berhasil ditutup",
  //       cashierSessionId,
  //       totalVariance,
  //       funds: updatedFunds
  //     })
  //   } catch (err) {
  //     console.error("Error closeCashier:", err)
  //     await t.rollback()
  //     return res.status(500).json({ message: "Internal server error" })
  //   }
  // }

  exports.closeCashier = async (req, res) => {
  const t = await CashierSession.sequelize.transaction()
  try {
    const { cashierSessionId, funds, storeId } = req.body

    if (!cashierSessionId || !Array.isArray(funds)) {
      return res.status(400).json({ message: "cashierSessionId & funds wajib dikirim" })
    }

    // ambil session
    const session = await CashierSession.findOne({
      where: { id: cashierSessionId, status: "open" },
      transaction: t,
      raw: false
    })

    if (!session) {
      await t.rollback()
      return res.status(404).json({ message: "Session tidak ditemukan atau sudah ditutup" })
    }

    let totalVariance = 0
    let updatedFunds = []

    // update fund balances
    for (const f of funds) {
      const fundBalance = await CashierFundBalance.findOne({
        where: { cashierSessionId, fundSourceId: f.fundSourceId },
        transaction: t
      })

      if (!fundBalance) continue

      const closingBalance = parseFloat(f.amount) || 0
      const variance = closingBalance - parseFloat(fundBalance.currentBalance)

      await fundBalance.update(
        { closingBalance, variance },
        { transaction: t }
      )

      totalVariance += variance
      updatedFunds.push({
        fundSourceId: f.fundSourceId,
        closingBalance,
        variance
      })
    }

    // ==== HITUNG SUMMARY ====
    const trxSummary = await Transaction.findOne({
      attributes: [
        [Transaction.sequelize.fn("COUNT", Transaction.sequelize.col("id")), "totalTrx"],
        [Transaction.sequelize.fn("SUM", Transaction.sequelize.col("total")), "totalSales"],
        [Transaction.sequelize.fn("SUM", Transaction.sequelize.col("profit")), "totalProfit"]
      ],
      where: { cashier_session_id: cashierSessionId, status: 'Lunas' },
      raw: true,
      transaction: t
    })

    const financeSummary = await FinanceRecords.findAll({
      attributes: [
        "type",
        [FinanceRecords.sequelize.fn("SUM", FinanceRecords.sequelize.col("amount")), "total"]
      ],
      where: { cashierSessionId },
      group: ["type"],
      raw: true,
      transaction: t
    })

    let cashIn = 0, cashOut = 0
    financeSummary.forEach(f => {
      if (f.type === "income") cashIn = f.total
      if (f.type === "expanse") cashOut = f.total
    })

    // ==== SIMPAN KE TABLE REPORTS ====
    await Reports.create({
      storeId,
      cashierSessionId,
      openedAt: session.openedAt,
      closedAt: new Date(),
      closingBalance: updatedFunds.reduce((acc, f) => acc + (f.closingBalance || 0), 0),
      totalTrx: trxSummary.totalTrx || 0,
      totalSales: trxSummary.totalSales || 0,
      totalProfit: trxSummary.totalProfit || 0, 
      cashIn,
      cashOut,
      variance: totalVariance
    }, { transaction: t })

    // update session close
    await session.update(
      { status: "close", closedAt: new Date() },
      { transaction: t }
    )

    await t.commit()

    return res.json({
      message: "Kasir berhasil ditutup & laporan tersimpan",
      cashierSessionId,
      totalVariance,
      funds: updatedFunds,
      report: {
        totalTrx: trxSummary.totalTrx || 0,
        totalSales: trxSummary.totalSales || 0,
        totalProfit: trxSummary.totalProfit || 0,
        cashIn,
        cashOut
      }
    })
  } catch (err) {
    console.error("Error closeCashier:", err)
    await t.rollback()
    return res.status(500).json({ message: "Internal server error" })
  }
}
