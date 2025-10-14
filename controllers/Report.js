const { Reports } = require('../models')
const { Op, fn, col, literal } = require('sequelize')

exports.getData = async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query

    if (!storeId || !startDate || !endDate) {
      return res.status(400).json({ error: "storeId, startDate, endDate wajib" })
    }

    const reports = await Reports.findAll({
      where: {
        storeId,
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      },
      order: [["createdAt", "ASC"]]
    })

    const totalProfit = reports.reduce((acc, r) => acc + parseFloat(r.totalProfit || 0), 0)

    return res.json({
      totalProfit,
      data: reports
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
}

exports.getDataProfitLimit = async (req, res) => {
   try {
    const { storeId, startDate, endDate } = req.query

    if (!storeId || !startDate || !endDate) {
      return res.status(400).json({ error: "storeId, startDate, endDate wajib dikirim" })
    }

    const reports = await Reports.findAll({
      where: {
        storeId,
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      },
      attributes: ['id', 'createdAt', 'totalProfit'], // cukup ambil yang penting saja
      order: [['createdAt', 'ASC']]
    })

    // Format agar mudah dipakai di FE
    const formatted = reports.map(r => ({
      date: r.createdAt.toISOString().split('T')[0], // contoh: "2025-10-12"
      totalProfit: parseFloat(r.totalProfit || 0)
    }))

    return res.json({
      data: formatted
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
}
