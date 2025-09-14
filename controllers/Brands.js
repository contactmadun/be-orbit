const { Brand } = require('../models');
const Validator = require('fastest-validator');

const v = new Validator();

exports.addBrand = async (req, res) => {
  try {
    // Cek apakah kategori sudah ada di store ini
    const existingBrand = await Brand.findOne({
      where: { storeId: req.body.storeId, name: req.body.name }
    });

    if (existingBrand) {
      return res.status(400).json({ message: "Kategori dengan nama ini sudah ada." });
    }

    // Simpan data baru
    const newBrand = await Brand.create({
      storeId: req.body.storeId,
      name: req.body.name
    });

    return res.json({
      message: "Kategori berhasil ditambahkan",
      id: newBrand.id,
      name: newBrand.name
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getBrand = async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId is required" });
    }

    const brands = await Brand.findAll({
      where: { storeId },
    });

    res.json(brands);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
