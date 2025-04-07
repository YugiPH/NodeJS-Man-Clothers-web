const express = require('express');
const router = express.Router();
const { stripe } = require('../configs/stripe');

router.get('/', async (req, res) => {
    const session_id = req.query.session_id;

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);

        res.send({ status: session.payment_status });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Không thể kiểm tra session' });
    }
});

module.exports = router;
