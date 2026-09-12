import api from "./api.js";

const profileService = {
  getProfile: () => api.get("/profile"),
  updateProfile: (payload) => api.put("/profile", payload),
  updatePreferences: (payload) => api.put("/profile/preferences", payload),
  getAddresses: () => api.get("/profile/addresses"),
  addAddress: (payload) => api.post("/profile/addresses", payload),
  updateAddress: (id, payload) => api.put(`/profile/addresses/${id}`, payload),
  deleteAddress: (id) => api.delete(`/profile/addresses/${id}`),
};

export default profileService;
