// components/Navbar.jsx
import React, { useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import * as bootstrap from "bootstrap";
import "../../public/css/navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const collapseRef = useRef(null);
  const bsCollapseRef = useRef(null);

  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    if (collapseRef.current) {
      bsCollapseRef.current = new bootstrap.Collapse(
        collapseRef.current,
        { toggle: false }
      );
    }
  }, []);

  const toggleNavbar = () => {
    if (!bsCollapseRef.current) return;

    if (collapseRef.current.classList.contains("show")) {
      bsCollapseRef.current.hide();
    } else {
      bsCollapseRef.current.show();
    }
  };

  const closeNavbar = () => {
    if (bsCollapseRef.current) {
      bsCollapseRef.current.hide();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    closeNavbar();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-3">
      <div className="container">
        
      </div>
    </nav>
  );
}

export default Navbar;
