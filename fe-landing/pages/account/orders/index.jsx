import CreateFeedbackModal from '@/components/orderHistoryPage/createFeedbackModal';
import UpdateFeedbackModal from '@/components/orderHistoryPage/updateFeedbackModal';
import { useEffect, useState } from 'react';

import AccountSidebar from '@/components/accountSidebar';
import Order from '@/components/orderHistoryPage/order';
import orderService from '@/services/orderService';
import useCustomerStore from '@/store/customerStore';
import useCartStore from '@/store/cartStore';
import { useRouter } from 'next/router';

const OrderHistoryPage = () => {
    const session_id = new URLSearchParams(window.location.search).get("session_id");
    const clearCart = useCartStore((state) => state.clearCart);
    const customerId = useCustomerStore((state) => state.customerInfor?.customerId);
    const [orderList, setOrderList] = useState([]);
    const [productVariantIdForFeedBack, setProductVariantIdForFeedBack] = useState(null);
    const [isCreateFeedbackModalOpen, setIsCreateFeedbackModalOpen] = useState(false);
    const [isUpdateFeedbackModalOpen, setIsUpdateFeedbackModalOpen] = useState(false);

    const refreshOrderList = async () => {
        if (customerId) {
            try {
                const result = await orderService.getOrderHistory();
                setOrderList(result.data);
            } catch (err) {
                console.log(err);
            }
        }
    };

    useEffect(() => {
        const getOrderList = async () => {
            try {
                const result = await orderService.getOrderHistory();
                setOrderList(result.data);
            } catch (err) {
                console.log(err);
            }
        };
        getOrderList();
    }, [customerId]);

    useEffect(() => {
        const removeCart = async () => {
            try {
                if (session_id) {
                    const { data } = await orderService.checkSession(session_id)
                    if (data.status === 'paid') {
                        clearCart()
                    }
                }
            } catch (err) {
                console.log(err)
            }
        }
        removeCart()
    }, [session_id])

    return (
        <div className="order-history-page container">
            <div className="row">
                <div className="col-4">
                    <AccountSidebar />
                </div>
                <div className="col-8">
                    <div className="orders-tab">
                        <div className="title">
                            {orderList.length == 0
                                ? 'Đơn hàng của bạn'
                                : `Đơn hàng của bạn: ${orderList.length} đơn hàng`}
                        </div>
                        <div className="orders-body">
                            {orderList && orderList.length === 0 ? (
                                <p className="text-center">Bạn chưa có đơn hàng nào!</p>
                            ) : (
                                orderList.map((order, index) => {
                                    return (
                                        <Order
                                            key={index}
                                            id={order.order_id}
                                            stateId={order.state_id}
                                            stateName={order.state_name}
                                            orderItems={order.order_items}
                                            totalOrderValue={order.total_order_value}
                                            createdAt={order.created_at}
                                            setIsCreateFeedbackModalOpen={setIsCreateFeedbackModalOpen}
                                            setIsUpdateFeedbackModalOpen={setIsUpdateFeedbackModalOpen}
                                            setProductVariantIdForFeedBack={
                                                setProductVariantIdForFeedBack
                                            }
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                    {isCreateFeedbackModalOpen && (
                        <CreateFeedbackModal
                            isOpen={isCreateFeedbackModalOpen}
                            setIsOpen={setIsCreateFeedbackModalOpen}
                            productVariantId={productVariantIdForFeedBack}
                            setProductVariantId={setProductVariantIdForFeedBack}
                            refreshOrderList={refreshOrderList}
                        />
                    )}
                    {isUpdateFeedbackModalOpen && (
                        <UpdateFeedbackModal
                            isOpen={isUpdateFeedbackModalOpen}
                            setIsOpen={setIsUpdateFeedbackModalOpen}
                            productVariantId={productVariantIdForFeedBack}
                            setProductVariantId={setProductVariantIdForFeedBack}
                            refreshOrderList={refreshOrderList}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

OrderHistoryPage.isAuth = true;

export default OrderHistoryPage;
