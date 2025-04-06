import { Radio } from 'antd';
import React from 'react';
import { Controller } from 'react-hook-form';
import { FaShippingFast } from 'react-icons/fa';
import { MdOutlinePayment } from 'react-icons/md';
import { usePayment } from '../context/PaymentContext';

export default function PaymentMethod({ control }) {
    const { setPaymentMethod } = usePayment();

    return (
        <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
                <Radio.Group
                    {...field}
                    onChange={(e) => {
                        field.onChange(e.target.value); // cập nhật form
                        setPaymentMethod(e.target.value); // cập nhật context
                    }}
                    className="w-100 d-flex flex-column gap-2"
                >
                    <div className="payment-item w-100 border-radius d-flex align-items-center justify-content-start">
                        <div className="payment-item-radio">
                            <Radio value="cod" />
                        </div>
                        <div className="payment-item-icon">
                            <FaShippingFast />
                        </div>
                        <div className="payment-item-name">
                            <p className="text-uppercase">COD</p>
                            <p>Thanh toán khi nhận hàng</p>
                        </div>
                    </div>

                    <div className="payment-item w-100 border-radius d-flex align-items-center justify-content-start">
                        <div className="payment-item-radio">
                            <Radio value="op" />
                        </div>
                        <div className="payment-item-icon">
                            <MdOutlinePayment />
                        </div>
                        <div className="payment-item-name">
                            <p className="text-uppercase">OP</p>
                            <p>Thanh toán trực tuyến (Miễn phí vận chuyển)</p>
                        </div>
                    </div>
                </Radio.Group>
            )}
        />
    );
}
