import api from "./api.js";

const printingService = {
  getMaterials: () => api.get("/printing/materials"),
  getColors: () => api.get("/printing/colors"),
  calculatePrice: (payload) => api.post("/printing/calculate-price", payload),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/printing/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  createOrder: (payload) => api.post("/printing/order", payload),
};

export default printingService;
