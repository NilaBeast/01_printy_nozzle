import api from "./api.js";

const cartService = {
  getCart: () => api.get("/cart"),
  addItem: ({ product_id, variant_id, quantity = 1 }) =>
    api.post("/cart/add", { product_id, variant_id, quantity }),
  updateItem: (item_id, quantity) => api.put(`/cart/item/${item_id}`, { item_id, quantity }),
  removeItem: (id) => api.delete(`/cart/item/${id}`),
  clear: () => api.delete("/cart/clear"),
  applyCoupon: (code) => api.post("/cart/coupon", { code }),
  removeCoupon: () => api.delete("/cart/coupon"),
};

export default cartService;
