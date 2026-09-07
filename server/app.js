import express from "express";
import bodyParser from "body-parser";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import "dotenv/config";
import helmet from "helmet";

import authRoutes from "./routers/authRoutes.js";

const app = express();
const port = process.env.SERVER_PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));


/* ================= NORMAL BODY PARSERS AFTER ================= */

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// app.use(flash());

const allowedOrigins = [
  process.env.FRONTEND_URL_1,
  process.env.FRONTEND_URL_2,
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error("❌ CORS Blocked:", normalizedOrigin);
      return callback(null, false); // block silently
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Razorpay-Signature"],
  }),
);

app.options("*", cors());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://code.jquery.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://fonts.googleapis.com",
          "https://unpkg.com",
          "https://boxicons.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://unpkg.com",
          "https://boxicons.com",
          "https://cdn.jsdelivr.net",
        ],

        imgSrc: [
          "'self'",
          "data:",
          "https://cdn-icons-png.flaticon.com",
          "https://res.cloudinary.com",
        ],
        connectSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://api.razorpay.com",
          "https://checkout.razorpay.com",
        ],

        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

// app.use("/api/auth", authRoutes);

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).render("500", { title: "Server Error" });
});

export default app;
