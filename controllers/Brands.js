const { Brand } = require("../models");
const Validator = require("fastest-validator");

const v = new Validator();

exports.addBrand = async (req, res) => {
  const tenantId = req.user.tenantId;
  const schema = {
    name: { type: "string", min: 2 },
    description: { type: "string", optional: true },
    status: { type: "enum", values: ["active", "inactive"] },
  };

  const validationResponse = v.validate(req.body, schema);

  if (validationResponse !== true) {
    return res.status(400).json({
      message: "Validation failed",
      errors: validationResponse,
    });
  }

  try {
    const brand = await Brand.create({
      tenantId: tenantId,
      name: req.body.name,
      description: req.body.description,
      status: req.body.status,
    });

    res.status(201).json({
      message: "Brand created",
      data: brand,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getBrand = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const brands = await Brand.findAll({
      where: { tenantId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      data: brands,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const id = req.params.id;

    const brand = await Brand.findOne({
      where: { id, tenantId },
    });

    if (!brand) {
      return res.status(404).json({
        message: "Brands not found",
      });
    }

    await brand.destroy();

    res.json({
      message: "Brand deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
