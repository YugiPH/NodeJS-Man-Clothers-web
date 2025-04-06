import { createContext, useContext, useState } from "react";

const PaymentContext = createContext(null);

export const PaymentProvider = ({ children }) => {
    const [paymentMethod, setPaymentMethod] = useState("cod"); // mặc định là COD

    return (
        <PaymentContext.Provider value={{ paymentMethod, setPaymentMethod }}>
            {children}
        </PaymentContext.Provider>
    );
};

export const usePayment = () => useContext(PaymentContext);
