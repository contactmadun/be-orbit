const { getData, getDataProfitLimit } = require('../controllers/Report');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.get('/', getData);
router.get('/profit-limit', getDataProfitLimit);

module.exports = router;
