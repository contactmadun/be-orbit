const { Categorie } = require('../models');
const Validator = require('fastest-validator');

const v = new Validator();

exports.addCat = async (req, res) => {
  try {
    // Cek apakah kategori sudah ada di store ini
    const existingCategory = await Categorie.findOne({
      where: { storeId: req.body.storeId, name: req.body.name }
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Kategori dengan nama ini sudah ada." });
    }

    // Simpan data baru
    const newCategory = await Categorie.create({
      storeId: req.body.storeId,
      name: req.body.name
    });

    return res.json({
      message: "Kategori berhasil ditambahkan",
      id: newCategory.id,
      name: newCategory.name
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getCat = async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId is required" });
    }

    const categories = await Categorie.findAll({
      where: { storeId },
    });

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
