const bcrypt = require("bcrypt");
const pool = require("./database");

async function initDB() {
  try {
    console.log("Checking and initializing database schema...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        admin_unique_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        year INT NOT NULL,
        department VARCHAR(100) NOT NULL,
        section VARCHAR(10) NOT NULL,
        register_no VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS otp_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_requests (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(50) UNIQUE NOT NULL,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        purpose TEXT NOT NULL,
        required_by DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'Submitted',
        admin_remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        request_id INT REFERENCES document_requests(id) ON DELETE CASCADE,
        file_url TEXT,
        qr_code TEXT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Query / Discussion messages for document clarification
      CREATE TABLE IF NOT EXISTS request_messages (
        id SERIAL PRIMARY KEY,
        request_id INT REFERENCES document_requests(id) ON DELETE CASCADE,
        sender_role VARCHAR(20) NOT NULL,
        sender_name VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Institutional settings (digital signature, seal stamp, signing authority)
      CREATE TABLE IF NOT EXISTS portal_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Alter document_requests to support SHA-256 verification hash and scan analytics
      ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS verification_hash VARCHAR(64);
      ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS scan_count INT DEFAULT 0;
      ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP;
    `);

    // Ensure default admin exists
    const adminCheck = await pool.query(
      "SELECT id FROM admins WHERE admin_unique_id = $1",
      ["ADMIN001"]
    );
    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash("Admin@123", 10);
      await pool.query(
        `INSERT INTO admins (admin_unique_id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)`,
        ["ADMIN001", "Academic Administration Office", "admin@psnacet.edu.in", hash]
      );
      console.log("Default admin ADMIN001 created successfully.");
    }

    // Ensure default student exists
    const studentCheck = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      ["kapileshb24it@psnacet.edu.in"]
    );
    if (studentCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO students (name, email, year, department, section, register_no)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          "Kapilesh B",
          "kapileshb24it@psnacet.edu.in",
          3,
          "Information Technology",
          "B",
          "2403921320521068"
        ]
      );
      console.log("Default student Kapilesh B registered successfully.");
    }

    // Ensure default portal settings exist (Signatory & Seal defaults)
    const signCheck = await pool.query(
      "SELECT id FROM portal_settings WHERE setting_key = $1",
      ["signatory_title"]
    );
    if (signCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO portal_settings (setting_key, setting_value) VALUES 
         ('signatory_name', 'Dr. D. Vasudevan, M.E., Ph.D.'),
         ('signatory_title', 'Principal & Academic Head'),
         ('institution_seal_text', 'PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY - OFFICIAL SEAL')`
      );
    }

    console.log("Database initialized successfully with advanced feature schema!");
  } catch (error) {
    console.error("Database initialization error:", error.message);
  }
}

module.exports = initDB;
