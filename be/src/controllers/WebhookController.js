const Order = require('../models/order');
const Order_Item = require('../models/order_item');
const Product_Variant = require('../models/product_variant');
const Product = require('../models/product');
const Product_Price_History = require('../models/product_price_history');
const Order_State = require('../models/order_state');
const { stripe } = require('../configs/stripe');
const orderid = require('order-id')('key');

let handleWebhook = async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Xử lý event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const customer_name = session.metadata.customer_name;
        const email = session.metadata.email;
        const phone_number = session.metadata.phone_number;
        const address = session.metadata.address;
        const order_items = JSON.parse(session.metadata.order_items);
        const user_id = session.metadata.user_id;

        try {
            const generated_order_id = orderid.generate().replace(/-/g, '');

            const newOrder = await Order.create({
                user_id,
                order_id: generated_order_id,
                customer_name,
                email,
                phone_number,
                address,
                total_product_value: 0,
                delivery_charges: 0,
                total_order_value: 0,
            });

            let total_product_value = 0;

            for (let i = 0; i < order_items.length; i++) {
                const order_item = order_items[i];
                const product_variant = await Product_Variant.findOne({
                    attributes: ['product_variant_id', 'quantity', 'state'],
                    include: [
                        {
                            model: Product,
                            attributes: ['product_id'],
                            include: {
                                model: Product_Price_History,
                                attributes: ['price'],
                                separate: true,
                                order: [['created_at', 'DESC']],
                            },
                        },
                    ],
                    where: { product_variant_id: order_item.product_variant_id },
                });

                if (!product_variant || !product_variant.Product || !product_variant.Product.Product_Price_Histories[0]) {
                    return res.status(400).send("Không thể lấy thông tin sản phẩm");
                }

                if (!product_variant.state)
                    return res.status(400).send("Sản phẩm này chưa được mở bán");

                if (order_item.quantity > product_variant.quantity)
                    return res.status(400).send("Số lượng sản phẩm không hợp lệ");

                const productVariantPrice = parseInt(product_variant.Product.Product_Price_Histories[0].price);
                const quantity = parseInt(order_item.quantity);
                const total_value = productVariantPrice * quantity;

                await Order_Item.create({
                    order_id: newOrder.order_id,
                    product_variant_id: product_variant.product_variant_id,
                    order_item_index: i,
                    price: productVariantPrice,
                    quantity,
                    total_value,
                });

                await product_variant.update({
                    quantity: product_variant.quantity - quantity,
                });

                total_product_value += total_value;
            }

            const total_order_value = total_product_value;

            await newOrder.update({
                total_product_value,
                total_order_value,
            });

            const state = await Order_State.findOne({ where: { state_id: 1, state_name: "Chờ Xác Nhận" } });
            if (state) {
                await newOrder.addOrder_State(state);
            }

            console.log("Đơn hàng đã được tạo thành công sau thanh toán");
        } catch (error) {
            console.error("Lỗi khi xử lý webhook tạo đơn hàng:", error);
            return res.status(500).send("Lỗi khi tạo đơn hàng từ webhook");
        }
    }

    res.status(200).send('Webhook received');
}

module.exports = {
    handleWebhook
}