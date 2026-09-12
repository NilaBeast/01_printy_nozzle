import api from "./api.js";

const authServices = {
  registerService: (data) => api.post("/auth/register", data),

  loginService: (data) => api.post("/auth/login", data),

  profileService: () => api.get("/auth/profile"),

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    window.location.href = "/login";
  },
};

export default authServices;
