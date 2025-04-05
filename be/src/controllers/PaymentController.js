const orderid = require('order-id')('key');

const Order = require('../models/order');
const User = require('../models/user');
const Order_State = require('../models/order_state');
const Product_Variant = require('../models/product_variant');
const Product = require('../models/product');
const Product_Price_History = require('../models/product_price_history');
const Order_Item = require('../models/order_item');
const { stripe } = require('../configs/stripe');

let create = async (req, res, next) => {
    let user_id = req.token.customer_id;
    if (!user_id) return res.status(400).send({ message: 'Access Token không hợp lệ' });

    try {
        let user = await User.findOne({ where: { user_id, role_id: 2 } });
        if (user == null) return res.status(400).send('User này không tồn tại');
    } catch (err) {
        console.log(err);
        return res.status(500).send('Gặp lỗi khi tạo đơn hàng vui lòng thử lại');
    }
    const requiredFields = ['customer_name', 'email', 'phone_number', 'address', 'order_items'];

    for (const field of requiredFields) {
        if (req.body[field] === undefined) {
            return res.status(400).send(`Trường ${field} không tồn tại`);
        }
    }

    const { customer_name, email, phone_number, address, order_items } = req.body

    try {
        let order_id = orderid.generate().replace(/-/g, "");
        const newOrder = await Order.create({
            user_id,
            order_id,
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
            let order_item = order_items[i];
            let product_variant = await Product_Variant.findOne({
                attributes: ['product_variant_id', 'quantity', 'state'],
                include: [
                    {
                        model: Product, attributes: ['product_id'],
                        include: { model: Product_Price_History, attributes: ['price'], separate: true, order: [['created_at', 'DESC']] }
                    },
                ],
                where: { product_variant_id: order_item.product_variant_id }
            });
            if (product_variant == null)
                return res.status(400).send("Sản phẩm này không tồn tại");
            if (product_variant.state != true)
                return res.status(400).send("Sản phẩm này chưa được mở bán");
            if (order_item.quantity > product_variant.quantity)
                return res.status(400).send("Số lượng sản phẩm không hợp lệ");

            let productVariantPrice = product_variant.Product.Product_Price_Histories[0].price;
            let total_value = productVariantPrice * order_item.quantity;
            let newOrderItem = {
                order_id: newOrder.order_id,
                product_variant_id: product_variant.product_variant_id,
                order_item_index: i,
                price: productVariantPrice,
                quantity: order_item.quantity,
                total_value
            }

            await Order_Item.create(newOrderItem);
            newProductVariantQuantity = product_variant.quantity - order_item.quantity;
            product_variant.update({ quantity: newProductVariantQuantity });
            total_product_value += total_value;
        }

        let delivery_charges = 20000
        let total_order_value = total_product_value + delivery_charges;

        newOrder.update({ total_product_value, delivery_charges, total_order_value });

        let line_items = [];

        for (let i = 0; i < order_items.length; i++) {
            let order_item = order_items[i];
            let product_variant = await Product_Variant.findOne({
                include: [
                    {
                        model: Product,
                        attributes: ['product_name'],
                    },
                ],
                where: { product_variant_id: order_item.product_variant_id },
            });

            if (!product_variant || !product_variant.Product) {
                return res.status(400).send("Không thể tìm thấy thông tin sản phẩm cho Stripe");
            }

            const product_name = product_variant.Product.product_name;
            const quantity = order_item.quantity;

            line_items.push({
                price_data: {
                    currency: "vnd",
                    unit_amount: Math.round(total_product_value),
                    product_data: {
                        name: product_name,
                    },
                },
                quantity: quantity,
            });
        }

        const customer = await stripe.customers.create({
            email
        })

        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: line_items,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/get-order/${newOrder.order_id}`,
            cancel_url: `${process.env.FRONTEND_URL}/cart`
        })

        let state = await Order_State.findOne({ where: { state_id: 1, state_name: "Chờ Xác Nhận" } });
        await newOrder.addOrder_State(state);
        return res.send({ url: session.url })
    } catch (err) {
        console.log(err);
        return res.status(500).send('Gặp lỗi khi tạo đơn hàng vui lòng thử lại');
    }
}

module.exports = {
    create
}