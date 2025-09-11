const { openCashier, getActiveSession } = require('../controllers/Cashier');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });
router.post('/', openCashier);
router.get('/session/:storeId', getActiveSession);

module.exports = router;
