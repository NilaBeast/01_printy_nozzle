import api from "./api.js";

const adminService = {
  getStats: () => api.get("/admin/dashboard/stats"),
  getSalesChart: () => api.get("/admin/dashboard/sales-chart"),
  getProducts: (params = {}) => api.get("/admin/products", { params }),
  createProduct: (payload) => api.post("/admin/products", payload),
  updateProduct: (id, payload) => api.put(`/admin/products/${id}`, payload),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  getOrders: (params = {}) => api.get("/admin/orders", { params }),
  getOrderDetails: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, payload) => api.put(`/admin/orders/${id}/status`, payload),
  getPrintOrders: (params = {}) => api.get("/admin/printing/orders", { params }),
  getPrintOrderDetails: (id) => api.get(`/admin/printing/orders/${id}`),
  updatePrintOrderStatus: (id, payload) =>
    api.put(`/admin/printing/orders/${id}/status`, payload),
  getUsers: (params = {}) => api.get("/admin/users", { params }),
  updateUser: (id, payload) => api.put(`/admin/users/${id}`, payload),
  getCoupons: () => api.get("/admin/coupons"),
  createCoupon: (payload) => api.post("/admin/coupons", payload),
  updateCoupon: (id, payload) => api.put(`/admin/coupons/${id}`, payload),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  getCategories: () => api.get("/categories"),
  createCategory: (payload) => api.post("/admin/categories", payload),
  updateCategory: (id, payload) => api.put(`/admin/categories/${id}`, payload),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  getMaterials: () => api.get("/admin/printing/materials"),
  createMaterial: (payload) => api.post("/admin/printing/materials", payload),
  updateMaterial: (id, payload) => api.put(`/admin/printing/materials/${id}`, payload),
  deleteMaterial: (id) => api.delete(`/admin/printing/materials/${id}`),
  getColors: () => api.get("/admin/printing/colors"),
  createColor: (payload) => api.post("/admin/printing/colors", payload),
  updateColor: (id, payload) => api.put(`/admin/printing/colors/${id}`, payload),
  deleteColor: (id) => api.delete(`/admin/printing/colors/${id}`),
};

export default adminService;
