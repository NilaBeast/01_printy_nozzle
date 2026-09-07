import pg from "pg";
import "dotenv/config";

const db =  new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl:{
        rejectUnauthorized: false,
    },
});

const testDbConnection = async () => {
  try {
    const client = await db.connect();
    console.log("PostgreSQL connected successfully");
    client.release();
  } catch (err) {
    console.error("PostgreSQL connection failed:", err.message);
    process.exit(1); // stop server if DB fails
  }
};

testDbConnection();

export default db;