import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation} from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop.jsx";
import App from "./App.jsx";
// import "../public/css/styles.css"

createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <ScrollToTop />
      <App />
    </BrowserRouter>
);
