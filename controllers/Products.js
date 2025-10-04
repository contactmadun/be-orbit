const { Product, Categorie, Brand, Store } = require('../models');
const Validator = require('fastest-validator');

const v = new Validator();

exports.addProduct = async (req, res) => {
 try {
    // Cek duplikat (nama produk per store harus unik)
    const existingProduct = await Product.findOne({
      where: {
        storeId: req.body.storeId,
        name: req.body.name,
      },
    });

    if (existingProduct) {
      return res.status(400).json({ message: "Produk dengan nama ini sudah ada di toko ini." });
    }

    const typeProduct =
      req.body.typeProduct === true ? "inject" : "stok";

    // Simpan produk baru
    const newProduct = await Product.create({
      storeId: req.body.storeId,
      categoryId: req.body.categoryId,
      brandId: req.body.brandId,
      name: req.body.name,
      description: req.body.description || null,
      purchasePrice: req.body.purchasePrice,
      agentPrice: req.body.agentPrice,
      retailPrice: req.body.retailPrice,
      typeProduct: typeProduct,
      stok: req.body.stok || 0,
      minimumStok: req.body.minimumStok || 0,
      status: req.body.status || "active",
    });

    return res.status(201).json({
      message: "Produk berhasil ditambahkan",
      product: newProduct,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { storeId, page = 1, limit = 10 } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: "storeId is required" });
    }

    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    const { count, rows } = await Product.findAndCountAll({
      where: { storeId },
      include: [
        {
          model: Categorie,
          as: 'categorie',
          attributes: ['id', 'name']
        },
        {
          model: Brand,
          as: 'brand',
          attributes: ['id', 'name']
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'nameOutlet']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitInt,
      offset: offset,
    });

    const totalPages = Math.ceil(count / limitInt);

    return res.json({
      data: rows,
      totalProducts: count,
      totalPages,
      currentPage: pageInt,
      totalItems: count,
    });

  } catch (err) {
    console.error("Error getProduct:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getProductAll = async (req, res) => { 
  try { const { storeId } = req.query; 
  if (!storeId) { return res.status(400).json({ message: "storeId is required" }); } 
  const products = await Product.findAll({ 
    where: { storeId }, 
    include: [ { model: Categorie, as: 'categorie', attributes: ['id', 'name'] }, 
    { model: Brand, as: 'brand', attributes: ['id', 'name'] }, 
    { model: Store, as: 'store', attributes: ['id', 'nameOutlet'] } ], 
    order: [['createdAt', 'DESC']] }); res.json(products); } 
    
    catch (err) { console.error("Error getProduct:", err); 
      
      res.status(500).json({ message: "Internal server error" }); 
    } };

