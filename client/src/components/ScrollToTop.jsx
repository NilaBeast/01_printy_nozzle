// components/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname, hash, state } = useLocation();

  useEffect(() => {
    if (!hash && !state?.scrollTo) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname, hash, state]);

  return null;
}

export default ScrollToTop;
