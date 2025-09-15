const { addProduct, getProduct } = require('../controllers/Products');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addProduct);
router.get('/', getProduct);

module.exports = router;
