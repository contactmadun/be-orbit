// controllers/CashierController.js
const { CashierSession, CashierFundBalance } = require('../models')

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
