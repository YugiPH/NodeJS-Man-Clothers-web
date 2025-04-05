const Stripe = require('stripe')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' })

module.exports = {
    stripe
}