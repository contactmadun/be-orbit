const { Fund } = require('../models');
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