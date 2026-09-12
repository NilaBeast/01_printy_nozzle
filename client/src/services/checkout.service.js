import api from "./api.js";

const checkoutService = {
  initiate: () => api.post("/checkout/initiate"),
  placeOrder: (payload) => api.post("/orders", payload),
  createRazorpayOrder: (payload) => api.post("/checkout/razorpay-order", payload),
  verifyPayment: (payload) => api.post("/checkout/verify-payment", payload),
};

export default checkoutService;
