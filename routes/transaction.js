const { addTransaction, addTrxWd, addTrxTransfer, addTransactionManual, getProfit } = require('../controllers/Transactions');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addTransaction);
router.post('/manual', addTransactionManual);
router.post('/withdrawal', addTrxWd);
router.post('/transfer', addTrxTransfer);
router.get('/profit/:storeId', getProfit);

module.exports = router;
