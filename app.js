require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var fundRouter = require('./routes/fund');
var cashierRouter = require('./routes/cashier');
var categoryRouter = require('./routes/categorie');
var brandRouter = require('./routes/brand');
var productRouter = require('./routes/product');
var transactionRouter = require('./routes/transaction');
var financeRouter = require('./routes/finance');
var reportRouter = require('./routes/report');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/products', productRouter);
app.use('/fund', fundRouter);
app.use('/cashier', cashierRouter);
app.use('/category', categoryRouter);
app.use('/brand', brandRouter);
app.use('/transaction', transactionRouter);
app.use('/finance', financeRouter);
app.use('/report', reportRouter);

module.exports = app;
