const { addTransaction, addTrxWd, addTransactionManual, getProfit } = require('../controllers/Transactions');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addTransaction);
router.post('/manual', addTransactionManual);
router.post('/withdrawal', addTrxWd);
router.get('/profit/:storeId', getProfit);

module.exports = router;
