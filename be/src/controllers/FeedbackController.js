const orderid = require('order-id')('key');
const { Sequelize } = require('sequelize');
const { Op } = require("sequelize");

const Order = require('../models/order');
const User = require('../models/user');
const Customer_Info = require('../models/customer_info');
const Order_State = require('../models/order_state');
const Product_Variant = require('../models/product_variant');
const Product = require('../models/product');
const Product_Price_History = require('../models/product_price_history');
const Order_Item = require('../models/order_item');
const Feedback = require('../models/feedback');
const Order_Status_Change_History = require('../models/order_status_change_history');
const Colour = require('../models/colour');
const Size = require('../models/size');

let create = async (req, res, next) => {
    try {
        let customer_id = req.token.customer_id;
        if (!customer_id) return res.status(400).send({ message: 'Access Token không hợp lệ' });

        let { product_variant_id, rate, content } = req.body;
        if (!product_variant_id) return res.status(400).send('Trường product_variant_id không tồn tại');
        if (!rate) return res.status(400).send('Trường rate không tồn tại');
        if (!content) return res.status(400).send('Trường content không tồn tại');

        // Kiểm tra customer có tồn tại không?
        let customer = await User.findOne({ where: { user_id: customer_id, role_id: 2 } });
        if (!customer) return res.status(400).send('Customer này không tồn tại');

        // Kiểm tra Product Variant
        let productVariant = await Product_Variant.findOne({ where: { product_variant_id } });
        if (!productVariant) return res.status(400).send('Product Variant này không tồn tại');

        // Kiểm tra Feedback đã tồn tại chưa
        let feedbackExists = await Feedback.findOne({ where: { user_id: customer_id, product_variant_id } });
        if (feedbackExists) return res.status(400).send('Feedback đã tồn tại');

        // Kiểm tra đơn hàng hợp lệ
        let order = await Order.findOne({
            attributes: ['order_id'],
            include: [
                { model: Order_Item, where: { product_variant_id } },
                { model: Order_Status_Change_History, where: { state_id: 4 } },
            ],
            where: { user_id: customer_id },
        });

        if (!order) return res.status(400).send('Feedback không hợp lệ');

        // Tạo Feedback mới
        let feedback = await Feedback.create({ user_id: customer_id, product_variant_id, rate, content });

        // Cập nhật Rating của Product
        let product = await productVariant.getProduct();
        let product_id = product.product_id;
        let result = await Feedback.findAll({
            attributes: [
                [Sequelize.fn('avg', Sequelize.col('rate')), 'avg'],
                [Sequelize.fn('count', Sequelize.col('rate')), 'count']
            ],
            include: { model: Product_Variant, where: { product_id } },
            group: ['product_variant.product_id']
        });

        // Kiểm tra nếu không có dữ liệu feedback
        if (!result || result.length === 0) return res.send(feedback);

        let rating = parseFloat(result[0].dataValues.avg) || 0;
        let feedback_quantity = parseInt(result[0].dataValues.count) || 0;
        await product.update({ rating, feedback_quantity });

        return res.send(feedback);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Gặp lỗi khi tải dữ liệu, vui lòng thử lại');
    }
};

let update = async (req, res, next) => {
    try {
        let { feedback_id, rate, content } = req.body;
        if (!feedback_id) return res.status(400).send('Trường feedback_id không tồn tại');
        if (!rate) return res.status(400).send('Trường rate không tồn tại');
        if (!content) return res.status(400).send('Trường content không tồn tại');

        let feedback = await Feedback.findOne({ where: { feedback_id } });
        if (!feedback) return res.status(400).send('Feedback này không tồn tại');

        // Cập nhật Feedback
        await feedback.update({ rate, content });

        // Lấy Product tương ứng
        let productVariant = await feedback.getProduct_variant();
        let product = await productVariant.getProduct();
        let product_id = product.product_id;

        let result = await Feedback.findAll({
            attributes: [
                [Sequelize.fn('avg', Sequelize.col('rate')), 'avg'],
                [Sequelize.fn('count', Sequelize.col('rate')), 'count']
            ],
            include: [{ model: Product_Variant, where: { product_id } }],
            group: ['product_variant.product_id']
        });

        if (!result || result.length === 0) return res.send({ message: 'Cập nhật feedback thành công!' });

        let rating = parseFloat(result[0].dataValues.avg) || 0;
        let feedback_quantity = parseInt(result[0].dataValues.count) || 0;
        await product.update({ rating, feedback_quantity });

        return res.send({ message: 'Cập nhật feedback thành công!' });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Gặp lỗi khi tải dữ liệu, vui lòng thử lại');
    }
};

let detail = async (req, res, next) => {
    try {
        let customer_id = req.token.customer_id;
        if (!customer_id) return res.status(400).send({ message: 'Access Token không hợp lệ' });

        let product_variant_id = req.params.product_variant_id;
        if (!product_variant_id) return res.status(400).send('Trường product_variant_id không tồn tại');

        let feedback = await Feedback.findOne({
            attributes: ['feedback_id', 'rate', 'content'],
            where: { user_id: customer_id, product_variant_id }
        });

        if (!feedback) return res.status(400).send('Feedback này không tồn tại');
        return res.send(feedback);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Gặp lỗi khi tải dữ liệu, vui lòng thử lại');
    }
};

let list = async (req, res, next) => {
    try {
        let product_id = req.params.product_id;
        if (!product_id) return res.status(400).send('Trường product_id không tồn tại');

        let feedbackList = await Feedback.findAll({
            attributes: ['rate', 'content', 'created_at'],
            include: [
                {
                    model: User,
                    include: [{ model: Customer_Info, attributes: ['customer_name'] }]
                },
                {
                    model: Product_Variant, where: { product_id },
                    include: [
                        { model: Colour, attributes: ['colour_name'] },
                        { model: Size, attributes: ['size_name'] },
                    ]
                },
            ],
            order: [['created_at', 'DESC']]
        });

        feedbackList = feedbackList.map((feedback) => ({
            customer: feedback.User.Customer_Info.customer_name,
            rate: feedback.rate,
            colour: feedback.product_variant.Colour.colour_name,
            size: feedback.product_variant.Size.size_name,
            content: feedback.content,
            created_at: feedback.created_at
        }));

        return res.send(feedbackList);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Gặp lỗi khi tải dữ liệu, vui lòng thử lại');
    }
};

module.exports = {
    create,
    update,
    detail,
    list
};
