import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import ProtectedRoute from "./components/protected_routes/ProtectedRoute";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
// import Login from "./views/Login";
// import Register from "./views/Register";
import Home from "./views/Home";
import Product from "./views/product";
import ProductDetails from "./views/ProductDetails";
import Cart from "./views/cart";
import Checkout from "./views/checkout";
import Contact from "./views/Contact";


function App() {
  return (
    <>
      <ScrollToTop />
      <div className="app-root">
        <div className="app-main d-flex flex-column min-vh-100">
        <Navbar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Product />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/contact" element={<Contact />} />
              {/* <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} /> */}


              {/* PROTECTED ROUTES */}
              <Route element={<ProtectedRoute />}>
                
                {/* <Route path="/profile" element={<Profile />} /> */}
              </Route>
            </Routes>
          </main>
        <Footer />
        </div>
      </div>
      {/* ✅ TOAST CONTAINER (GLOBAL) */}
      <ToastContainer
        className={"mb-0"}
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </>
  );
}

export default App;
