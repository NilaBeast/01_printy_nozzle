import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../../public/css/navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const navbarRef = useRef(null);
  const desktopSearchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  const [search, setSearch] = useState("");

  const isLoggedIn = !!localStorage.getItem("token");

  // Replace with your actual cart state/context.
  const cartCount = 2;


  /* =====================================================
     CLOSE EVERYTHING
     ===================================================== */

  const closeNavbar = () => {
    setMenuOpen(false);
    setSearchOpen(false);
    setProductsOpen(false);
  };


  /* =====================================================
     OUTSIDE CLICK + ESCAPE
     ===================================================== */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
        setSearchOpen(false);
        setProductsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
        setProductsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);


  /* =====================================================
     BODY LOCK WHEN MOBILE MENU OPEN
     ===================================================== */

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("navbar-menu-open");
    } else {
      document.body.classList.remove("navbar-menu-open");
    }

    return () => {
      document.body.classList.remove("navbar-menu-open");
    };
  }, [menuOpen]);


  /* =====================================================
     SEARCH
     ===================================================== */

  const openSearch = () => {
    setSearchOpen(true);
    setProductsOpen(false);

    /*
      Do NOT close the hamburger here.
      This keeps the search independent from the menu.
    */

    setTimeout(() => {
      if (window.innerWidth < 992) {
        mobileSearchInputRef.current?.focus();
      } else {
        desktopSearchInputRef.current?.focus();
      }
    }, 100);
  };


  const closeSearch = () => {
    setSearchOpen(false);
    setSearch("");
  };


  const toggleSearch = () => {
    if (searchOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  };


  const handleSearch = (event) => {
    event.preventDefault();

    const value = search.trim();

    if (!value) {
      if (window.innerWidth < 992) {
        mobileSearchInputRef.current?.focus();
      } else {
        desktopSearchInputRef.current?.focus();
      }

      return;
    }

    navigate(
      `/products?search=${encodeURIComponent(value)}`
    );

    closeNavbar();
  };


  /* =====================================================
     MOBILE MENU
     ===================================================== */

  const toggleMenu = () => {
    setMenuOpen((previous) => !previous);

    /*
      Hamburger does not control the search panel.
      Only close the product dropdown.
    */

    setProductsOpen(false);
  };


  /* =====================================================
     ACCOUNT
     ===================================================== */

  const handleAccount = () => {
    closeNavbar();

    navigate(
      isLoggedIn
        ? "/profile"
        : "/login"
    );
  };


  /* =====================================================
     CART
     ===================================================== */

  const handleCart = () => {
    closeNavbar();

    navigate("/cart");
  };


  return (
    <header
      className="site-header"
      ref={navbarRef}
    >

      {/* =================================================
          ANNOUNCEMENT BAR
          ================================================= */}

      <div className="announcement-bar">

        <div className="announcement-content">

          <i className="bi bi-truck announcement-icon"></i>

          <span>
            Free Shipping on orders over ₹999
          </span>

          <span className="announcement-divider">
            |
          </span>

          <span>
            Fast Delivery Across India
          </span>

        </div>

      </div>


      {/* =================================================
          MAIN NAVBAR
          ================================================= */}

      <div className="main-navbar">

        <div className="navbar-container">

          {/* =================================================
              LOGO
              ================================================= */}

        <NavLink
          to="/"
          className="brand-logo"
          onClick={closeNavbar}
        >
          <img
            src="/images/logo.png"
            alt="Printy Nozzles"
            className="brand-logo-image"
          />
        </NavLink>


          {/* =================================================
              DESKTOP NAVIGATION
              ================================================= */}

          <nav
            className="desktop-navigation"
            aria-label="Main navigation"
          >

            <ul className="main-nav">

              {/* HOME */}

              <li className="nav-item">

                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `nav-link-custom ${
                      isActive ? "active" : ""
                    }`
                  }
                  onClick={closeNavbar}
                >
                  Home
                </NavLink>

              </li>


              {/* PRODUCTS */}

              <li className="nav-item products-nav-item">

                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `nav-link-custom ${
                      isActive ? "active" : ""
                    }`
                  }
                  onClick={closeNavbar}
                >

                  <span>
                    Products
                  </span>

                  <i className="bi bi-chevron-down products-arrow"></i>

                </NavLink>


                {/* PRODUCTS DROPDOWN */}

                <div className="products-dropdown">

                  <NavLink
                    to="/products"
                    onClick={closeNavbar}
                  >
                    <i className="bi bi-grid"></i>
                    <span>All Products</span>
                  </NavLink>

                  <NavLink
                    to="/products?category=microcontrollers"
                    onClick={closeNavbar}
                  >
                    <i className="bi bi-cpu"></i>
                    <span>Microcontrollers</span>
                  </NavLink>

                  <NavLink
                    to="/products?category=sensors"
                    onClick={closeNavbar}
                  >
                    <i className="bi bi-broadcast"></i>
                    <span>Sensors & Modules</span>
                  </NavLink>

                  <NavLink
                    to="/products?category=components"
                    onClick={closeNavbar}
                  >
                    <i className="bi bi-diagram-3"></i>
                    <span>Electronic Components</span>
                  </NavLink>

                  <NavLink
                    to="/products?category=tools"
                    onClick={closeNavbar}
                  >
                    <i className="bi bi-tools"></i>
                    <span>Tools & Accessories</span>
                  </NavLink>

                </div>

              </li>


              {/* 3D PRINTING */}

              <li className="nav-item">

                <NavLink
                  to="/3d-printing"
                  className={({ isActive }) =>
                    `nav-link-custom ${
                      isActive ? "active" : ""
                    }`
                  }
                  onClick={closeNavbar}
                >
                  3D Printing
                </NavLink>

              </li>


              {/* CHECKOUT */}

              <li className="nav-item">

                <NavLink
                  to="/checkout"
                  className={({ isActive }) =>
                    `nav-link-custom ${
                      isActive ? "active" : ""
                    }`
                  }
                  onClick={closeNavbar}
                >
                  Checkout
                </NavLink>

              </li>


              {/* CONTACT */}

              <li className="nav-item">

                <NavLink
                  to="/contact"
                  className={({ isActive }) =>
                    `nav-link-custom ${
                      isActive ? "active" : ""
                    }`
                  }
                  onClick={closeNavbar}
                >
                  Contact
                </NavLink>

              </li>

            </ul>

          </nav>


          {/* =================================================
              RIGHT ACTIONS
              ================================================= */}

          <div className="navbar-actions">


            {/* =================================================
                DESKTOP SEARCH
                ONLY VISIBLE ON DESKTOP
                ================================================= */}

            <div
              className={`desktop-search ${
                searchOpen
                  ? "desktop-search-open"
                  : ""
              }`}
            >

              {searchOpen ? (

                <form
                  className="desktop-search-form"
                  onSubmit={handleSearch}
                >

                  <i className="bi bi-search"></i>

                  <input
                    ref={desktopSearchInputRef}
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    type="text"
                    placeholder="Search products..."
                    aria-label="Search products"
                  />

                  {search && (

                    <button
                      type="button"
                      className="desktop-search-clear"
                      onClick={() => {
                        setSearch("");
                        desktopSearchInputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                    >
                      <i className="bi bi-x"></i>
                    </button>

                  )}

                  <button
                    type="submit"
                    className="desktop-search-submit"
                    aria-label="Submit search"
                  >
                    <i className="bi bi-arrow-right"></i>
                  </button>

                </form>

              ) : (

                <button
                  type="button"
                  className="nav-icon-btn"
                  onClick={toggleSearch}
                  aria-label="Search"
                >
                  <i className="bi bi-search"></i>
                </button>

              )}

            </div>


            {/* =================================================
                MOBILE SEARCH BUTTON
                ONLY VISIBLE ON SMALL SCREENS
                ================================================= */}

            <button
              type="button"
              className="mobile-search-trigger"
              onClick={toggleSearch}
              aria-label={
                searchOpen
                  ? "Close search"
                  : "Search"
              }
            >

              <i className="bi bi-search"></i>

            </button>


            {/* =================================================
                ACCOUNT
                ================================================= */}

            <div className="account-wrapper">

              <button
                type="button"
                className="nav-icon-btn"
                onClick={handleAccount}
                aria-label={
                  isLoggedIn
                    ? "My Profile"
                    : "Login"
                }
              >

                <i className="bi bi-person"></i>

              </button>

              <span className="account-tooltip">

                {isLoggedIn
                  ? "My Profile"
                  : "Login"}

              </span>

            </div>


            {/* =================================================
                CART
                ================================================= */}

            <button
              type="button"
              className="cart-wrapper"
              onClick={handleCart}
              aria-label="Shopping cart"
            >

              <i className="bi bi-cart3"></i>

              {cartCount > 0 && (

                <span className="cart-badge">
                  {cartCount}
                </span>

              )}

            </button>


            {/* =================================================
                MOBILE HAMBURGER
                ================================================= */}

            <button
              type="button"
              className={`menu-toggle ${
                menuOpen
                  ? "menu-open"
                  : ""
              }`}
              onClick={toggleMenu}
              aria-label={
                menuOpen
                  ? "Close menu"
                  : "Open menu"
              }
              aria-expanded={menuOpen}
            >

              <span></span>
              <span></span>
              <span></span>

            </button>

          </div>

        </div>


        {/* =================================================
            MOBILE SEARCH PANEL

            THIS IS THE ONLY SEARCH INPUT ON MOBILE.
            ================================================= */}

        <div
          className={`mobile-search-panel ${
            searchOpen
              ? "search-visible"
              : ""
          }`}
        >

          <form
            className="mobile-search-form"
            onSubmit={handleSearch}
          >

            <i className="bi bi-search"></i>

            <input
              ref={mobileSearchInputRef}
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              aria-label="Search products"
            />

            {search && (

              <button
                type="button"
                className="mobile-search-clear"
                onClick={() => {
                  setSearch("");
                  mobileSearchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >

                <i className="bi bi-x"></i>

              </button>

            )}

            <button
              type="submit"
              className="mobile-search-submit"
            >
              Search
            </button>

          </form>

        </div>


        {/* =================================================
            MOBILE MENU
            ================================================= */}

        <div
          className={`mobile-menu ${
            menuOpen
              ? "mobile-menu-visible"
              : ""
          }`}
        >

          <div className="mobile-menu-inner">

            {/* HOME */}

            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `mobile-nav-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
              onClick={closeNavbar}
            >

              <span>
                Home
              </span>

              <i className="bi bi-chevron-right"></i>

            </NavLink>


            {/* PRODUCTS */}

            <div className="mobile-products">

              <button
                type="button"
                className={`mobile-nav-link mobile-products-button ${
                  productsOpen
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setProductsOpen(
                    (previous) => !previous
                  )
                }
              >

                <span>
                  Products
                </span>

                <i
                  className={`bi ${
                    productsOpen
                      ? "bi-chevron-up"
                      : "bi-chevron-down"
                  }`}
                ></i>

              </button>


              {/* PRODUCT SUBMENU */}

              <div
                className={`mobile-products-dropdown ${
                  productsOpen
                    ? "mobile-products-visible"
                    : ""
                }`}
              >

                <NavLink
                  to="/products"
                  onClick={closeNavbar}
                >
                  <i className="bi bi-grid"></i>
                  <span>All Products</span>
                </NavLink>

                <NavLink
                  to="/products?category=microcontrollers"
                  onClick={closeNavbar}
                >
                  <i className="bi bi-cpu"></i>
                  <span>Microcontrollers</span>
                </NavLink>

                <NavLink
                  to="/products?category=sensors"
                  onClick={closeNavbar}
                >
                  <i className="bi bi-broadcast"></i>
                  <span>Sensors & Modules</span>
                </NavLink>

                <NavLink
                  to="/products?category=components"
                  onClick={closeNavbar}
                >
                  <i className="bi bi-diagram-3"></i>
                  <span>Electronic Components</span>
                </NavLink>

                <NavLink
                  to="/products?category=tools"
                  onClick={closeNavbar}
                >
                  <i className="bi bi-tools"></i>
                  <span>Tools & Accessories</span>
                </NavLink>

              </div>

            </div>


            {/* 3D PRINTING */}

            <NavLink
              to="/3d-printing"
              className={({ isActive }) =>
                `mobile-nav-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
              onClick={closeNavbar}
            >

              <span>
                3D Printing
              </span>

              <i className="bi bi-chevron-right"></i>

            </NavLink>


            {/* CHECKOUT */}

            <NavLink
              to="/checkout"
              className={({ isActive }) =>
                `mobile-nav-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
              onClick={closeNavbar}
            >

              <span>
                Checkout
              </span>

              <i className="bi bi-chevron-right"></i>

            </NavLink>


            {/* CONTACT */}

            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `mobile-nav-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
              onClick={closeNavbar}
            >

              <span>
                Contact
              </span>

              <i className="bi bi-chevron-right"></i>

            </NavLink>


            {/* MOBILE ACCOUNT / CART */}

            <div className="mobile-account-section">

              <button
                type="button"
                className="mobile-account-button"
                onClick={handleAccount}
              >

                <span className="mobile-account-icon">
                  <i className="bi bi-person"></i>
                </span>

                <span>
                  {isLoggedIn
                    ? "My Profile"
                    : "Login / Register"}
                </span>

              </button>


              <button
                type="button"
                className="mobile-account-button"
                onClick={handleCart}
              >

                <span className="mobile-account-icon">

                  <i className="bi bi-cart3"></i>

                  {cartCount > 0 && (

                    <span className="mobile-account-badge">
                      {cartCount}
                    </span>

                  )}

                </span>

                <span>
                  My Cart
                </span>

              </button>

            </div>

          </div>

        </div>

      </div>

    </header>
  );
}

export default Navbar;