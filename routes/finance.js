const { addIncome, addExpanse, getFinanceSummaryToday } = require('../controllers/Finance');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.get('/summary-today', getFinanceSummaryToday);
router.post('/income', addIncome);
router.post('/expanse', addExpanse);

module.exports = router;
