import api from "./api.js";

const profileService = {
  getProfile: () => api.get("/profile"),
  updateProfile: (payload) => api.put("/profile", payload),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("avatar", file);
    return api.post("/profile/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  updatePreferences: (payload) => api.put("/profile/preferences", payload),
  changePassword: (payload) => api.put("/profile/change-password", payload),
  getAddresses: () => api.get("/profile/addresses"),
  addAddress: (payload) => api.post("/profile/addresses", payload),
  updateAddress: (id, payload) => api.put(`/profile/addresses/${id}`, payload),
  deleteAddress: (id) => api.delete(`/profile/addresses/${id}`),
  setDefaultAddress: (id) => api.put(`/profile/addresses/${id}/default`),
  getWishlist: () => api.get("/profile/wishlist"),
  toggleWishlist: (productId) => api.post(`/profile/wishlist/toggle/${productId}`),
  removeWishlist: (productId) => api.delete(`/profile/wishlist/${productId}`),
  getPrintFiles: () => api.get("/profile/3d-files"),
};

export default profileService;
