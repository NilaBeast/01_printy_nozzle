import React from "react";
import { ClipLoader } from "react-spinners";

function GlobalLoader({ loading, text = "Loading..." }) {
  if (!loading) return null;

  return (
    <div className="global-loader">
      <ClipLoader color="#36d7b7" size={60} />
      <p className="loader-text">{text}</p>
    </div>
  );
}

export default GlobalLoader;
