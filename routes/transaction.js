const { addTransaction, addTrxWd, addTrxTransfer, addTransactionManual, getProfit, getReport, getLastTransactions, getDataBon, payBon } = require('../controllers/Transactions');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/', addTransaction);
router.post('/manual', addTransactionManual);
router.post('/withdrawal', addTrxWd);
router.post('/transfer', addTrxTransfer);
router.post('/pay', payBon);
router.get('/profit/:storeId', getProfit);
router.get('/bon', getDataBon);
router.get('/report/:storeId/:cashierSessionId', getReport);
router.get('/:storeId/:cashierSessionId/last-transactions', getLastTransactions);

module.exports = router;
