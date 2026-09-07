require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 ElectroLab Server is running on port ${PORT}`);
  });
}

module.exports = app;