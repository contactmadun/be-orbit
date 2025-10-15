const { addFund, getFund, getFundDefault, getFundExceptDefault, topupFund, transferFund, getFundBalancesBySession } = require('../controllers/Fund');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });
router.post('/', addFund);
router.post('/topup', topupFund);
router.post('/transfer', transferFund);
router.get('/:storeId', getFund);
router.get('/default/:storeId', getFundDefault);
router.get('/except-default/:storeId', getFundExceptDefault);
router.get('/:storeId/:cashierSessionId', getFundBalancesBySession);

module.exports = router;
