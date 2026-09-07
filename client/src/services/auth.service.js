import api from "./api.js";

const authServices = {
  registerService: (data) => api.post("/auth/register", data),

  loginService: (data) => api.post("/auth/login", data),

  logout: () => {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("authChange"));
    window.location.href = "/login";
  },
};

export default authServices;
