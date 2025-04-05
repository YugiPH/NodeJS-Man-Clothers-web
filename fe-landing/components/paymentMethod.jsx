import { Radio } from 'antd'
import React from 'react'
import { Controller } from 'react-hook-form'
import { FaShippingFast } from 'react-icons/fa'
import { MdOutlinePayment } from 'react-icons/md'

export default function PaymentMethod({ control }) {
    return (
        <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
                <Radio.Group {...field} className="w-100">
                    <label className="payment-item w-100 border-radius d-flex align-items-center justify-content-start">
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
                    </label>

                    <label className="payment-item w-100 border-radius d-flex align-items-center justify-content-start">
                        <div className="payment-item-radio">
                            <Radio value="op" />
                        </div>
                        <div className="payment-item-icon">
                            <MdOutlinePayment />
                        </div>
                        <div className="payment-item-name">
                            <p className="text-uppercase">OP</p>
                            <p>Thanh toán trực tuyến</p>
                        </div>
                    </label>
                </Radio.Group>
            )}
        />
    )
}