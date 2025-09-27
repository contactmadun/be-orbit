const { openCashier, getActiveSession, closeCashier } = require('../controllers/Cashier');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });
router.post('/', openCashier);
router.post('/close', closeCashier);
router.get('/session/:storeId', getActiveSession);

module.exports = router;
