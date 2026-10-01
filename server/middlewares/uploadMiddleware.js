const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ============ Ensure upload directories exist ============ */
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir("uploads/products");
ensureDir("uploads/banners");
ensureDir("uploads/prints");
ensureDir("uploads/payments");
ensureDir("uploads/tmp");
ensureDir("uploads/slice-cache");

/* ============ Product Image Upload ============ */
const productImageStorage = multer.diskStorage({
  destination: "uploads/products/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const productImageUpload = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp, svg)"));
  },
});

/* ============ Banner Image Upload ============ */
const bannerImageStorage = multer.diskStorage({
  destination: "uploads/banners/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const bannerImageUpload = multer({
  storage: bannerImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

/* ============ 3D Print File Upload ============ */
const printFileStorage = multer.diskStorage({
  destination: "uploads/prints/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const printFileUpload = multer({
  storage: printFileStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".stl", ".obj", ".3mf", ".amf", ".ply", ".glb", ".gltf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error("Only 3D model files are allowed (.STL, .OBJ, .3MF, .AMF, .PLY, .GLB, .GLTF)"));
  },
});

/* ============ Payment Screenshot Upload (QR / UPI proof) ============ */
const paymentScreenshotStorage = multer.diskStorage({
  destination: "uploads/payments/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const paymentScreenshotUpload = multer({
  storage: paymentScreenshotStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  },
});

/* ============ 3D Slice-Quote Temp Upload (sliced, never stored) ============ */
const sliceFileUpload = multer({
  storage: multer.diskStorage({
    destination: "uploads/tmp/",
    filename: (req, file, cb) => {
      const uniqueName = `slice_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      cb(null, uniqueName + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".stl", ".obj", ".3mf", ".amf", ".ply", ".glb", ".gltf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error("Only 3D model files are allowed (.STL, .OBJ, .3MF, .AMF, .PLY, .GLB, .GLTF)"));
  },
});

module.exports = {
  productImageUpload,
  bannerImageUpload,
  printFileUpload,
  paymentScreenshotUpload,
  sliceFileUpload,
};
