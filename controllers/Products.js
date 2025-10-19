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
    const { storeId, brandId, page = 1, limit = 10, all } = req.query;

    if (!storeId && !brandId) {
      return res.status(400).json({ message: "storeId or brandId is required" });
    }

    // Filter dasar
    const where = {};
    if (storeId) where.storeId = storeId;
    if (brandId) {
      where.brandId = brandId;
      where.typeProduct = "stok"; // hanya ambil yang stok jika ada brandId
    }

    // Jika "all=true", ambil semua tanpa pagination
    if (all === "true") {
      const products = await Product.findAll({
        where,
        include: [
          { model: Categorie, as: "categorie", attributes: ["id", "name"] },
          { model: Brand, as: "brand", attributes: ["id", "name"] },
          { model: Store, as: "store", attributes: ["id", "nameOutlet"] },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({
        data: products,
        totalProducts: products.length,
        totalPages: 1,
        currentPage: 1,
      });
    }

    // Pagination normal
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Categorie, as: "categorie", attributes: ["id", "name"] },
        { model: Brand, as: "brand", attributes: ["id", "name"] },
        { model: Store, as: "store", attributes: ["id", "nameOutlet"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitInt,
      offset,
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

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" })
    }

    const product = await Product.findByPk(id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    await product.destroy()

    return res.json({
      message: "Produk berhasil dihapus",
      deletedId: id
    })
  } catch (err) {
    console.error("Error deleteProduct:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      brandId,
      categoryId,
      purchasePrice,
      agentPrice,
      retailPrice,
      stok,
      minimumStok
    } = req.body;

    const typeProduct = req.body.typeProduct === true ? "inject" : "stok";

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    await product.update({
      name,
      description,
      brandId,
      categoryId,
      purchasePrice,
      agentPrice,
      retailPrice,
      stok,
      minimumStok,
      typeProduct
    });

    res.json({ message: 'Produk berhasil diperbarui ✅', data: product });
  } catch (err) {
    console.error('Gagal update produk:', err);
    res.status(500).json({ message: 'Gagal update produk' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const product = await Product.findByPk(id, {
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
      ]
    });

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    return res.json(product);
  } catch (err) {
    console.error("Error getProductById:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};