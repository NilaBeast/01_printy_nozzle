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

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    token ? navigate(user?.role === "admin" ? "/admin" : "/") : setCheckingAuth(false);
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

      toast.success("Account created successfully");
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
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link to="/" className="auth-logo">
            <img src="/images/logo.png" alt="Printy Nozzles" />
            <span>PrintyNozzle</span>
          </Link>
          <div>
            <span className="auth-kicker">Create your workspace</span>
            <h1>Build faster with parts, prints, and order history together.</h1>
            <p>
              Your account keeps shopping, custom 3D print requests, and profile
              details synced across the store.
            </p>
          </div>
          <div className="auth-feature-list">
            <span>Saved addresses</span>
            <span>Faster checkout</span>
            <span>Print order updates</span>
          </div>
        </aside>

        <div className="auth-form-panel">
          <div className="auth-card auth-card-wide">
            <span className="auth-kicker">New account</span>
            <h3>Create your account</h3>
            <p className="auth-muted">
              Start ordering electronics and custom 3D printed parts.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="auth-form-grid">
                <div>
                  <label className="auth-field-label" htmlFor="first-name">First name</label>
                  <div className="auth-input">
                    <i className="bx bx-user auth-icon"></i>
                    <input
                      id="first-name"
                      name="first_name"
                      placeholder="First name"
                      required
                      value={form.first_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-field-label" htmlFor="last-name">Last name</label>
                  <div className="auth-input">
                    <i className="bx bx-user auth-icon"></i>
                    <input
                      id="last-name"
                      name="last_name"
                      placeholder="Last name"
                      required
                      value={form.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <label className="auth-field-label" htmlFor="register-email">Email</label>
              <div className="auth-input">
                <i className="bx bx-envelope auth-icon"></i>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <label className="auth-field-label" htmlFor="register-phone">Phone</label>
              <div className="auth-input">
                <i className="bx bx-phone auth-icon"></i>
                <input
                  id="register-phone"
                  name="phone"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              <label className="auth-field-label" htmlFor="register-password">Password</label>
              <div className="auth-input">
                <i className="bx bx-lock-alt auth-icon"></i>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create password"
                  required
                  value={form.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bx ${showPassword ? "bx-hide" : "bx-show"}`}></i>
                </button>
              </div>

              <small className="auth-hint">
                Min 8 chars | uppercase | lowercase | number | special character
              </small>

              <LoadingButton
                type="submit"
                loading={loading}
                text="Create Account"
                loadingText="Creating..."
                className="btn btn-warning w-100 auth-submit"
              />
            </form>

            <p className="auth-footer">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Register;
