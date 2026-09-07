import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
// import db from "../config/db.js";
import passwordValidation from "../utils/passwordValidation.js";

const saltRounds = Number(process.env.SALT_ROUNDS) || 10;


export async function register(req, res) {
  const client = await db.connect();

  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      business_name,
      gst_number,
    } = req.body;

    
    const role = "customer";
    
    /* -------- Validation -------- */

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (phone && phone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (!["customer", "hotel_owner", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (!(await passwordValidation(password))) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long with uppercase, lowercase, number and special character",
      });
    }

    /* -------- Existing User Check -------- */

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    /* -------- Transaction -------- */

    await client.query("BEGIN");

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    /* -------- Insert User -------- */

    const userResult = await client.query(
      `
        INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, first_name, last_name, email, phone, role
        `,
      [first_name, last_name, email, phone || null, hashedPassword, role],
    );

    const user = userResult.rows[0];

    /* -------- Role Specific Inserts -------- */

    if (role === "hotel_owner") {
      if (!business_name || !gst_number) {
        throw new Error("Business name and GST number are required");
      }

      await client.query(
        `
        INSERT INTO hotel_owners (user_id, business_name, gst_number)
        VALUES ($1, $2, $3)
        `,
        [user.id, business_name, gst_number],
      );
    }

    if (role === "admin") {
      await client.query(
        `
        INSERT INTO admins (user_id)
        VALUES ($1)
        `,
        [user.id],
      );
    }

    await client.query("COMMIT");

    /* -------- JWT -------- */

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Register error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error during registration",
    });
  } finally {
    client.release();
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    /* -------- Validation -------- */

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    /* -------- Fetch User -------- */

    const result = await db.query(
      `
      SELECT id, first_name, last_name, email, password_hash, role
      FROM users
      WHERE email = $1
      `,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    /* -------- Password Check -------- */

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* -------- JWT -------- */

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    delete user.password_hash;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
}
