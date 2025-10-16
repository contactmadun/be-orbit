const { registerUser, activateAccount, loginUser, requestResetPassword, changePassword, getUserProfile } = require('../controllers/User');
const authMiddleware = require('../middleware/authMiddleware');

var express = require('express');
var router = express.Router();

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });
router.get('/profile', authMiddleware, getUserProfile);
router.post('/', registerUser);
router.post('/login', loginUser);
router.post('/reset-password', requestResetPassword);
router.post('/change-password', changePassword);
router.post('/activate/:token', activateAccount);

module.exports = router;
