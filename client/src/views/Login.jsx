import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import authServices from "../services/auth.service";
import GlobalLoader from "../components/Loaders/GlobalLoader";
import LoadingButton from "../components/Loaders/LoadingButton";
import "../../public/css/auth.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    token ? navigate(user?.role === "admin" ? "/admin" : "/") : setCheckingAuth(false);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authServices.loginService(form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("authChange"));
      toast.success("Welcome back");
      navigate(res.data.user?.role === "admin" ? "/admin" : redirectTo, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
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
            <span className="auth-kicker">Maker commerce</span>
            <h1>Components, prints, and projects in one connected workspace.</h1>
            <p>
              Sign in to manage orders, 3D print requests, addresses, and saved
              checkout details.
            </p>
          </div>
          <div className="auth-feature-list">
            <span>Electronics catalog</span>
            <span>3D printing service</span>
            <span>Order tracking</span>
          </div>
        </aside>

        <div className="auth-form-panel">
          <div className="auth-card">
            <span className="auth-kicker">Account access</span>
            <h3>Welcome back</h3>
            <p className="auth-muted">
              Use your PrintyNozzle customer or admin account to continue.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="auth-field-label" htmlFor="login-email">Email</label>
              <div className="auth-input">
                <i className="bx bx-envelope auth-icon"></i>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <label className="auth-field-label" htmlFor="login-password">Password</label>
              <div className="auth-input">
                <i className="bx bx-lock-alt auth-icon"></i>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bx ${showPassword ? "bx-hide" : "bx-show"}`}></i>
                </button>
              </div>

              <LoadingButton
                type="submit"
                loading={loading}
                text="Login"
                loadingText="Signing in..."
                className="btn btn-warning w-100 auth-submit"
              />
            </form>

            <p className="auth-footer">
              New here? <Link to="/register">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;
