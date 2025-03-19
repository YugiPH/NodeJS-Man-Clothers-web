const express = require('express');

const OrderController = require('../controllers/OrderController');
const jwtAuth = require('../midlewares/jwtAuth');

let router = express.Router();

router.post('/create', jwtAuth, OrderController.create);

router.get('/admin/list', OrderController.listAdminSide);

router.get('/customer/list', jwtAuth, OrderController.listCustomerSide);

router.get('/detail/:order_id', jwtAuth, OrderController.detailCustomerSide);

router.get('/admin/detail/:order_id', OrderController.detailAdminSide);

router.put('/change-status/:order_id/:state_id', OrderController.changeStatus);

module.exports = router;
