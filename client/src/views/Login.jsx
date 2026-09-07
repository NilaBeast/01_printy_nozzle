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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    token ? navigate("/") : setCheckingAuth(false);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authServices.loginService(form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("authChange"));
      toast.success("Welcome back ✨");
      navigate(redirectTo, { replace: true });
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
      <div className="auth-card">
        <h3>Welcome Back</h3>
        <p className="auth-muted">
          Login as <strong>Customer</strong>, <strong>Hotel Owner</strong> or{" "}
          <strong>Admin</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="auth-input">
            <i className="bx bx-envelope auth-icon"></i>
            <input
              type="email"
              placeholder="Email address"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="auth-input">
            <i className="bx bx-lock-alt auth-icon"></i>
            <input
              type="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            text="Login"
            loadingText="Signing in..."
            className="btn btn-warning w-100"
          />
        </form>

        <p className="auth-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default Login;
