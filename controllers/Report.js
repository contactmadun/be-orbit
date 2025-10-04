const { Reports } = require('../models')
const { Op } = require('sequelize')

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
