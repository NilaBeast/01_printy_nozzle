import api from "./api.js";

const orderService = {
  getOrders: (params = {}) => api.get("/orders", { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
  reorder: (id) => api.post(`/orders/${id}/reorder`),
  getInvoice: (id) => api.get(`/orders/${id}/invoice`),
};

export default orderService;
