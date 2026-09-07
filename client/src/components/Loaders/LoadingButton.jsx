import React from "react";
import { ClipLoader } from "react-spinners";

function LoadingButton({
  loading,
  text,
  loadingText,
  spinnerSize = 16,
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      disabled={loading}
      className={`btn p-3 d-flex align-items-center justify-content-center gap-2 ${
        loading ? "opacity-75" : ""
      } ${className}`}
    >
      {loading && <ClipLoader size={spinnerSize} color="#fff" />}
      {loading ? loadingText : text}
    </button>
  );
}

export default LoadingButton;
