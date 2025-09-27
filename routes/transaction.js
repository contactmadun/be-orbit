const { addTransaction, getProfit } = require('../controllers/Transactions');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addTransaction);
router.get('/profit/:storeId', getProfit);

module.exports = router;
