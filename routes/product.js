const { addProduct, getProduct, getProductAll } = require('../controllers/Products');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addProduct);
router.get('/', getProduct);
router.get('/all', getProductAll);

module.exports = router;
