const { Categorie } = require('../models')
const Validator = require('fastest-validator')

const v = new Validator()

/* =========================
   ADD CATEGORY
========================= */

exports.addCat = async (req, res) => {

  const tenantId = req.user.tenantId
  console.log(req.user);
  const schema = {
    name: { type: "string", min: 2 },
    description: { type: "string", optional: true },
    status: { type: "enum", values: ["active", "inactive"] }
  }

  const validationResponse = v.validate(req.body, schema)

  if (validationResponse !== true) {
    return res.status(400).json({
      message: "Validation failed",
      errors: validationResponse
    })
  }

  try {

    const category = await Categorie.create({
      tenantId: tenantId,
      name: req.body.name,
      description: req.body.description,
      status: req.body.status
    })

    res.status(201).json({
      message: "Category created",
      data: category
    })

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    })

  }

}


/* =========================
   GET CATEGORY BY TENANT
========================= */

exports.getCat = async (req, res) => {

  try {

    const tenantId = req.user.tenantId

    const categories = await Categorie.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    })

    res.json({
      data: categories
    })

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    })

  }

}

exports.deleteCat = async (req, res) => {

  try {

    const tenantId = req.user.tenantId
    const id = req.params.id

    const category = await Categorie.findOne({
      where: { id, tenantId }
    })

    if (!category) {
      return res.status(404).json({
        message: "Category not found"
      })
    }

    await category.destroy()

    res.json({
      message: "Category deleted"
    })

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    })

  }

}