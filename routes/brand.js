const { addBrand, getBrand } = require('../controllers/Brands');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addBrand);
router.get('/', getBrand);

module.exports = router;
