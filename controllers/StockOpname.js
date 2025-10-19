const { StockOpname, StockOpnameItem, sequelize } = require('../models')

exports.create = async (req, res) => {
  const t = await sequelize.transaction()
  try {
    const { storeId, brandId, items, note } = req.body

    if (!storeId || !brandId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "storeId, brandId, dan items wajib diisi" })
    }

    // Buat record utama opname
    const opname = await StockOpname.create({
      storeId,
      brandId,
      note,
      status: "draft",
    }, { transaction: t })

    // Masukkan item-item opname
    const opnameItems = items.map((item) => ({
      stockOpnameId: opname.id,
      productId: item.productId,
      systemStock: item.systemStock,
      physicalStock: item.physicalStock,
      difference: item.difference,
    }))

    await StockOpnameItem.bulkCreate(opnameItems, { transaction: t })

    await t.commit()

    return res.status(201).json({
      message: "Stock opname berhasil disimpan",
      data: opname,
    })
  } catch (err) {
    await t.rollback()
    console.error("Error saving stock opname:", err)
    return res.status(500).json({ error: "Gagal menyimpan stock opname" })
  }
}


exports.getAll = async (req, res) => {
  try {
    const { storeId } = req.query
    const where = storeId ? { storeId } : {}

    const opnames = await StockOpname.findAll({
      where,
      include: [
        {
          model: StockOpnameItem,
          as: 'items',
        },
      ],
      order: [['createdAt', 'DESC']],
    })

    return res.json({ data: opnames })
  } catch (err) {
    console.error("Error fetching stock opname:", err)
    return res.status(500).json({ error: "Gagal memuat data stock opname" })
  }
}


exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params
    const opname = await StockOpname.findByPk(id, {
      include: [
        {
          model: StockOpnameItem,
          as: 'items',
        },
      ],
    })

    if (!opname) {
      return res.status(404).json({ error: "Stock opname tidak ditemukan" })
    }

    return res.json({ data: opname })
  } catch (err) {
    console.error("Error fetching opname detail:", err)
    return res.status(500).json({ error: "Gagal memuat detail stock opname" })
  }
}
