require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var productsRouter = require('./routes/products');
var fundRouter = require('./routes/fund');
var cashierRouter = require('./routes/cashier');
var categoryRouter = require('./routes/categorie');
var brandRouter = require('./routes/brand');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/fund', fundRouter);
app.use('/cashier', cashierRouter);
app.use('/category', categoryRouter);
app.use('/brand', brandRouter);

module.exports = app;
