const { getData } = require('../controllers/Report');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

router.get('/', getData);

module.exports = router;
