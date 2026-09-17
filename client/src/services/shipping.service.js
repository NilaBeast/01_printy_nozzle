import api from "./api.js";

// Public shipping endpoints (Delhivery-backed with safe local fallbacks).
// serviceability() normalizes to the legacy check-pincode shape so existing
// callers (checkout, product page) keep working unchanged.
const normalizeServiceability = (res) => {
  const d = res?.data || {};
  const serviceable = d.serviceable !== undefined ? d.serviceable : d.is_serviceable;
  return {
    ...res,
    data: {
      ...d,
      is_serviceable: serviceable !== false,
      serviceable: serviceable !== false,
    },
  };
};

const shippingService = {
  checkPincode: async (pincode) => {
    const res = await api.get(`/shipping/serviceability/${encodeURIComponent(String(pincode || "").trim())}`);
    return normalizeServiceability(res);
  },
  getCharges: (params = {}) => api.get("/shipping/charges", { params }),
  // type: "order" | "print" — owner-checked, throttled live refresh server-side
  getTracking: (type, id) => api.get(`/shipping/track/${type}/${id}`),
};

export default shippingService;
