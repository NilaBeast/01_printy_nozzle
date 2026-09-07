import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import authServices from "../services/auth.service";
import GlobalLoader from "../components/Loaders/GlobalLoader";
import LoadingButton from "../components/Loaders/LoadingButton";
import "../../public/css/auth.css";

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  /* 🔐 Auth check */
  useEffect(() => {
    const token = localStorage.getItem("token");
    token ? navigate("/") : setCheckingAuth(false);
  }, [navigate]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authServices.registerService(form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("authChange"));

      toast.success("Account created successfully 🎉");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <GlobalLoader loading text="Checking authentication..." />;
  }

  return (
    <section className="auth-page">
      <div className="auth-card auth-card-wide">
        <h3>Create your account</h3>
        <p className="auth-muted">
          Join us to explore destinations & book amazing stays ✨
        </p>

        <form onSubmit={handleSubmit}>
          {/* NAME */}
          <div className="row">
            <div className="col-md-6">
              <div className="auth-input">
                <i className="bx bx-user auth-icon"></i>
                <input
                  name="first_name"
                  placeholder="First name"
                  required
                  value={form.first_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="auth-input">
                <i className="bx bx-user auth-icon"></i>
                <input
                  name="last_name"
                  placeholder="Last name"
                  required
                  value={form.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* EMAIL */}
          <div className="auth-input">
            <i className="bx bx-envelope auth-icon"></i>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>

          {/* PHONE */}
          <div className="auth-input">
            <i className="bx bx-phone auth-icon"></i>
            <input
              name="phone"
              placeholder="Phone number"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          {/* PASSWORD */}
          <div className="auth-input">
            <i className="bx bx-lock-alt auth-icon"></i>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i
                className={`bx ${
                  showPassword ? "bx-hide" : "bx-show"
                }`}
              ></i>
            </button>
          </div>

          <small className="auth-hint">
            Min 8 chars · uppercase · lowercase · number · special character
          </small>

          <LoadingButton
            type="submit"
            loading={loading}
            text="Create Account"
            loadingText="Creating..."
            className="btn btn-warning w-100 mt-3"
          />
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  );
}

export default Register;
