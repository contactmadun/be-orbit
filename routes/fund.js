const { addFund, getFund, getFundDefault } = require('../controllers/Fund');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });
router.post('/', addFund);
router.get('/:storeId', getFund);
router.get('/default/:storeId', getFundDefault);

module.exports = router;
