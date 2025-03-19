const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { jwtDecode } = require('jwt-decode');

const User = require('../models/user');
const Customer_Info = require('../models/customer_info');

let register = async (req, res, next) => {
    let email = req.body.email;
    if (email === undefined) return res.status(400).send({ message: 'Vui lòng nhập Email của bạn' });
    let password = req.body.password;
    if (password === undefined) return res.status(400).send({ message: 'Vui lòng nhập Mật khẩu của bạn' });
    let customer_name = req.body.customer_name;
    if (customer_name === undefined) return res.status(400).send({ message: 'Vui lòng nhập Họ và Tên của bạn' });
    let phone_number = req.body.phone_number;
    if (phone_number === undefined) return res.status(400).send({ message: 'Vui lòng nhập Số điện thoại của bạn' });

    let customer = await User.findOne({ where: { email, role_id: 2 } });
    if (customer) return res.status(409).send({ message: 'Email đã tồn tại' });
    else {
        try {
            let hashPassword = bcrypt.hashSync(password, 10);
            let newCustomer = await User.create({ email: email, password: hashPassword, role_id: 2 });
            await Customer_Info.create({ user_id: newCustomer.user_id, customer_name, phone_number });

            const accessToken = jwt.sign(
                { customer_id: newCustomer.user_id },
                process.env.ACCESSTOKEN_SECRET_KEY,
                { expiresIn: process.env.ACCESSTOKEN_EXPIRES_IN }
            );

            const { exp } = jwtDecode(accessToken);
            const accessTokenExpires = exp;

            const refreshToken = jwt.sign(
                { customer_id: newCustomer.user_id },
                process.env.REFRESHTOKEN_SECRET_KEY,
                { expiresIn: process.env.REFRESHTOKEN_EXPIRES_IN }
            );

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                path: '/',
                sameSite: 'strict'
            });
            return res.send({
                access_token: accessToken,
                access_token_expires: accessTokenExpires,
            });
        } catch (err) {
            console.log(err);
            return res.status(500).send({ message: 'Có lỗi xảy ra vui lòng thử lại' });
        }
    }
}

let login = async (req, res, next) => {
    let email = req.body.email;
    if (email === undefined) return res.status(400).send({ message: 'Email hoặc Mật khẩu không đúng' });
    let password = req.body.password;
    if (password === undefined) return res.status(400).send({ message: 'Email hoặc Mật khẩu không đúng' });

    try {
        let customer = await User.findOne({
            where: { email, role_id: 2 },
        });
        if (!customer) {
            return res.status(401).send({ message: 'Email hoặc Mật khẩu không đúng' });
        }

        let isPasswordValid = bcrypt.compareSync(password, customer.password);
        if (!isPasswordValid) {
            return res.status(401).send({ message: 'Email hoặc Mật khẩu không đúng' });
        }

        const accessToken = jwt.sign(
            { customer_id: customer.user_id },
            process.env.ACCESSTOKEN_SECRET_KEY,
            { expiresIn: process.env.ACCESSTOKEN_EXPIRES_IN }
        );

        const { exp } = jwtDecode(accessToken);
        const accessTokenExpires = exp;

        const refreshToken = jwt.sign(
            { customer_id: customer.user_id },
            process.env.REFRESHTOKEN_SECRET_KEY,
            { expiresIn: process.env.REFRESHTOKEN_EXPIRES_IN }
        );

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            path: '/',
            sameSite: 'strict'
        });
        return res.send({
            access_token: accessToken,
            access_token_expires: accessTokenExpires
        });
    } catch (err) {
        console.log(err);
        return res.status(400).send({ message: 'Có lỗi xảy ra, vui lòng thử lại' });
    }
}

let logout = async (req, res, next) => {
    res.clearCookie('refresh_token');
    return res.send({ message: 'Đăng xuất thành công' });
}

let refreshAccessToken = async (req, res, next) => {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken === undefined) return res.status(400).send({ message: 'Refresh Token không hợp lệ' });
    try {
        const { iat, exp, ...payload } = jwt.verify(refreshToken, process.env.REFRESHTOKEN_SECRET_KEY);

        const newAccessToken = jwt.sign(
            payload,
            process.env.ACCESSTOKEN_SECRET_KEY,
            { expiresIn: process.env.ACCESSTOKEN_EXPIRES_IN }
        );

        const decode = jwtDecode(newAccessToken);
        const newAccessTokenExpires = decode.exp;

        const newRefreshToken = jwt.sign(
            payload,
            process.env.REFRESHTOKEN_SECRET_KEY,
            { expiresIn: process.env.REFRESHTOKEN_EXPIRES_IN }
        );

        res.cookie('refresh_token', newRefreshToken, {
            httpOnly: true,
            path: '/',
            sameSite: 'strict'
        });
        return res.send({
            access_token: newAccessToken,
            access_token_expires: newAccessTokenExpires
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send({ message: 'Refresh Token không hợp lệ' });
    }
}

let getInfor = async (req, res, next) => {
    const customerId = req.token.customer_id;
    if (!customerId) return res.status(400).send({ message: 'Access Token không hợp lệ' });

    try {
        const customer = await User.findOne({
            where: { user_id: customerId, role_id: 2 },
            include: [
                { model: Customer_Info, attributes: ['customer_name', 'phone_number', 'address'] },
            ]
        });

        return res.send({
            email: customer.email,
            customer_name: customer.Customer_Info.customer_name,
            phone_number: customer.Customer_Info.phone_number,
            address: customer.Customer_Info.address,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: 'Có lỗi xảy ra, vui lòng thử lại' });
    }
}

let update = async (req, res, next) => {
    const user_id = req.token.customer_id;
    if (!user_id) return res.status(400).send({ message: 'Access Token không hợp lệ' });
    const customer_name = req.body.customer_name;
    if (customer_name === undefined) return res.status(400).send({ message: 'Trường customer_name không tồn tại' });
    const phone_number = req.body.phone_number;
    if (phone_number === undefined) return res.status(400).send({ message: 'Trường phone_number không tồn tại' });
    const address = req.body.address;
    if (address === undefined) return res.status(400).send({ message: 'Trường address không tồn tại' });

    try {
        const customer = await User.findOne({ where: { user_id, role_id: 2 } });
        if (!customer) return res.status(409).send({ message: 'Customer không tồn tại' });

        const numberUpdate = await Customer_Info.update(
            { customer_name, phone_number, address },
            { where: { user_id } }
        )
        if (numberUpdate) {
            return res.send({
                customer_name,
                phone_number,
                address
            });
        } else {
            return res.status(500).send({ message: 'Có lỗi xảy ra, vui lòng thử lại' });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send({ message: 'Có lỗi xảy ra, vui lòng thử lại' });
    }
}

module.exports = {
    register,
    login,
    logout,
    refreshAccessToken,
    getInfor,
    update
};
