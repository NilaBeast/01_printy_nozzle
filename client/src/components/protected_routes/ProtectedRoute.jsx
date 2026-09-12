import { Navigate, Outlet, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

function ProtectedRoute({ roles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const location = useLocation();

  if (!token) {
    // 🔔 Show toast only once per redirect
    toast.info("Please login to continue", {
      toastId: "auth-required",
    });

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (roles?.length && !roles.includes(user?.role)) {
    toast.error("You do not have permission to access this page", {
      toastId: "role-required",
    });
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
