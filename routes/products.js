var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('halo ini halaman produk kita');
});

module.exports = router;
