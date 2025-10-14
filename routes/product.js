const { addProduct, getProduct, getProductAll, deleteProduct, updateProduct, getProductById } = require('../controllers/Products');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addProduct);
router.get('/', getProduct);
router.get('/all', getProductAll);
router.delete('/delete/:id', deleteProduct);
router.put('/:id', updateProduct);
router.get('/:id', getProductById);

module.exports = router;
