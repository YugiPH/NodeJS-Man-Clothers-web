const express = require('express');

const PaymentController = require('../controllers/PaymentController');
const jwtAuth = require('../midlewares/jwtAuth');

let router = express.Router();

router.post('/create', jwtAuth, PaymentController.create);

module.exports = router;