import { Navigate, Outlet, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

function ProtectedRoute() {
  const token = localStorage.getItem("token");
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

  return <Outlet />;
}

export default ProtectedRoute;
