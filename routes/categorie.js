const { addCat, getCat } = require('../controllers/Category');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addCat);
router.get('/', getCat);

module.exports = router;
