const { addIncome, addExpanse } = require('../controllers/Finance');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.post('/income', addIncome);
router.post('/expanse', addExpanse);

module.exports = router;
