const { addTransaction, addTrxWd, addTrxTransfer, addTransactionManual, getProfit, getReport, getLastTransactions, getDataBon, payBon, getTransactions, getTransactionDetail, voidTransaction } = require('../controllers/Transactions');
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
router.get('/:storeId', getTransactions);
router.get("/detail/:id", getTransactionDetail);
router.post("/void/:id", voidTransaction);


module.exports = router;
