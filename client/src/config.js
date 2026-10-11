

// export const API_URL = "https://server.printynozzle.in/api";
export const API_URL = "http://localhost:3000/api"; // For local backend dev

// (previous .env value: VITE_API_URL="http://localhost:3000/api")

// Maximum printable 3D printer dimensions in millimeters (mm)
// Set to -1 for no limit (previous .env: VITE_MAX_PRINT_*_MM=250)
export const MAX_PRINT_WIDTH_MM = 250;
export const MAX_PRINT_DEPTH_MM = 250;
export const MAX_PRINT_HEIGHT_MM = 250;

// Maximum 3D model file size in Megabytes (MB)
// Set to -1 for no limit (previous .env: VITE_MAX_FILE_SIZE_MB=10240)
export const MAX_FILE_SIZE_MB = 200;

const config = {
  API_URL,
  MAX_PRINT_WIDTH_MM,
  MAX_PRINT_DEPTH_MM,
  MAX_PRINT_HEIGHT_MM,
  MAX_FILE_SIZE_MB,
};

export default config;
