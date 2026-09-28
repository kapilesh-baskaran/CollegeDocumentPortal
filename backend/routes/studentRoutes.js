const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const pool = require("../database");
const studentAuthMiddleware = require("../middleware/studentAuthMiddleware");
const { isValidRequiredDate } = require("../utils/dateValidation");

const router = express.Router();

const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim().replace(/^["']|["']$/g, "") : "";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // port 587 uses STARTTLS
  auth: {
    user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "",
    pass: emailPass
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 8000
});

// Student Registration
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      year,
      department,
      section,
      registerNo
    } = req.body;

    if (!name || !email || !year || !department || !section || !registerNo) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    // Check if email or register number already exists
    const existing = await pool.query(
      `SELECT email, register_no FROM students WHERE email = $1 OR register_no = $2`,
      [email.trim().toLowerCase(), registerNo.trim()]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.email === email.trim().toLowerCase()) {
        return res.status(400).json({
          message: "A student with this email is already registered. Please log in directly."
        });
      }
      return res.status(400).json({
        message: "A student with this Register Number is already registered."
      });
    }

    const result = await pool.query(
      `INSERT INTO students
      (name, email, year, department, section, register_no)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, year, department, section, register_no, created_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        parseInt(year, 10),
        department.trim(),
        section.trim().toUpperCase(),
        registerNo.trim()
      ]
    );

    res.status(201).json({
      message: "Student registered successfully",
      student: result.rows[0]
    });

  } catch (error) {
    console.error("Student registration error:", error);
    res.status(500).json({
      message: "Student registration failed. Please try again."
    });
  }
});

// Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email, isRegistration } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // If it's a login attempt, verify that the student exists
    if (!isRegistration) {
      const studentCheck = await pool.query(
        `SELECT id FROM students WHERE email = $1`,
        [cleanEmail]
      );
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({
          message: "No registered student found with this email. Please register first."
        });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await pool.query(
      `INSERT INTO otp_verifications
      (email, otp, expires_at)
      VALUES ($1, $2, $3)`,
      [cleanEmail, otp, expiresAt]
    );

    let emailSent = false;
    let emailErrorMsg = null;
    try {
      const mailPromise = transporter.sendMail({
        from: `"College Document Portal" <${process.env.EMAIL_USER}>`,
        to: cleanEmail,
        subject: "Your OTP for College Document Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #1e3a8a; margin-top: 0;">College Document Portal</h2>
            <p style="color: #475569; font-size: 15px;">You requested an OTP for signing into your student portal account.</p>
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">PSNA College of Engineering and Technology &bull; Student Document Portal</p>
          </div>
        `
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email dispatch timed out after 4.5s")), 4500)
      );

      await Promise.race([mailPromise, timeoutPromise]);
      emailSent = true;
    } catch (mailError) {
      console.warn("Nodemailer delivery warning:", mailError.message);
      emailErrorMsg = mailError.message;
    }

    res.json({
      message: emailSent
        ? "OTP sent successfully! Please check your Inbox or Spam folder."
        : "OTP generated! Please check your college inbox or spam folder.",
      otp: otp
    });

  } catch (error) {
    console.error("Failed to send OTP:", error);
    res.status(500).json({
      message: `Failed to send OTP: ${error.message || "Please try again."}`
    });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT *
       FROM otp_verifications
       WHERE email = $1
       AND otp = $2
       AND expires_at > CURRENT_TIMESTAMP
       AND verified = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanEmail, otp.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired OTP. Please request a new one."
      });
    }

    await pool.query(
      `UPDATE otp_verifications
       SET verified = TRUE
       WHERE id = $1`,
      [result.rows[0].id]
    );

    const studentResult = await pool.query(
      `SELECT id, name, email, year, department, section, register_no, created_at
       FROM students
       WHERE email = $1`,
      [cleanEmail]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Student account not found. Please register your details first."
      });
    }

    const student = studentResult.rows[0];

    const token = jwt.sign(
      {
        id: student.id,
        email: student.email,
        role: "student"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "OTP verified successfully",
      token,
      student
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      message: "OTP verification failed. Please try again."
    });
  }
});

// Get Current Student Profile
router.get("/me", studentAuthMiddleware, async (req, res) => {
  try {
    const studentResult = await pool.query(
      `SELECT id, name, email, year, department, section, register_no, created_at
       FROM students
       WHERE id = $1`,
      [req.student.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ student: studentResult.rows[0] });
  } catch (error) {
    console.error("Fetch student profile error:", error);
    res.status(500).json({ message: "Failed to fetch student profile" });
  }
});

// Get Student's Document Requests
router.get("/my-requests", studentAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        dr.id,
        dr.request_id,
        dr.student_id,
        dr.document_type,
        dr.purpose,
        dr.required_by,
        dr.status,
        dr.admin_remarks,
        dr.created_at,
        dr.updated_at,
        d.id AS document_id,
        d.file_url,
        d.qr_code,
        d.generated_at
      FROM document_requests dr
      LEFT JOIN documents d ON d.request_id = dr.id
      WHERE dr.student_id = $1
      ORDER BY dr.created_at DESC`,
      [req.student.id]
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error("Fetch student requests error:", error);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});

// Get Student Notifications
router.get("/notifications", studentAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, student_id, title, message, is_read, created_at
       FROM notifications
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      [req.student.id]
    );

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark Single Notification as Read
router.put("/notifications/:id/read", studentAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND student_id = $2`,
      [id, req.student.id]
    );

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification error:", error);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// Mark All Notifications as Read
router.put("/notifications/read-all", studentAuthMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE student_id = $1`,
      [req.student.id]
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications error:", error);
    res.status(500).json({ message: "Failed to update notifications" });
  }
});

// Student Document Vault / Academic Locker (Feature #4: My Document Vault)
router.get("/vault", studentAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        dr.id,
        dr.request_id,
        dr.document_type,
        dr.purpose,
        dr.required_by,
        dr.status,
        dr.admin_remarks,
        dr.created_at,
        dr.updated_at,
        dr.verification_hash,
        dr.scan_count,
        dr.last_scanned_at,
        d.id AS document_id,
        d.qr_code,
        d.file_url,
        d.generated_at
       FROM document_requests dr
       LEFT JOIN documents d ON d.request_id = dr.id
       WHERE dr.student_id = $1 AND dr.status IN ('Document Ready', 'Approved')
       ORDER BY COALESCE(d.generated_at, dr.updated_at) DESC`,
      [req.student.id]
    );

    res.json({ vault: result.rows });
  } catch (error) {
    console.error("Fetch document vault error:", error);
    res.status(500).json({ message: "Failed to fetch document vault" });
  }
});

// 1-Click Re-Request (Feature #5: 1-Click Re-Request)
router.post("/requests/re-request", studentAuthMiddleware, async (req, res) => {
  try {
    const { previousRequestId, purpose, requiredBy } = req.body;
    const studentId = req.student.id;

    if (!previousRequestId || !requiredBy) {
      return res.status(400).json({ message: "Previous request ID and required-by date are required" });
    }

    if (!isValidRequiredDate(requiredBy)) {
      return res.status(400).json({
        message: "Required-by date must be at least 5 days from today per college processing policy"
      });
    }

    // Fetch previous request details
    const prevResult = await pool.query(
      `SELECT document_type, purpose FROM document_requests WHERE (id::text = $1 OR request_id = $1) AND student_id = $2`,
      [String(previousRequestId), studentId]
    );

    if (prevResult.rows.length === 0) {
      return res.status(404).json({ message: "Previous request not found" });
    }

    const prev = prevResult.rows[0];
    const newRequestId = `REQ-${Date.now()}`;
    const newPurpose = purpose && purpose.trim() ? purpose.trim() : prev.purpose;

    const result = await pool.query(
      `INSERT INTO document_requests
       (request_id, student_id, document_type, purpose, required_by, status)
       VALUES ($1, $2, $3, $4, $5, 'Submitted')
       RETURNING *`,
      [newRequestId, studentId, prev.document_type, newPurpose, requiredBy]
    );

    // Notify student
    try {
      await pool.query(
        `INSERT INTO notifications (student_id, title, message)
         VALUES ($1, 'Re-Request Queued 🔁', $2)`,
        [studentId, `Your renewal request for ${prev.document_type} (${newRequestId}) has been submitted successfully.`]
      );
    } catch (e) {}

    res.status(201).json({
      message: "Document re-requested successfully!",
      request: result.rows[0]
    });
  } catch (error) {
    console.error("Re-request error:", error);
    res.status(500).json({ message: "Failed to submit re-request" });
  }
});

// Get Query Messages for a Request (Student)
router.get("/requests/:id/messages", studentAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify student ownership
    const docCheck = await pool.query(
      `SELECT id FROM document_requests WHERE id = $1 AND student_id = $2`,
      [id, req.student.id]
    );
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const result = await pool.query(
      `SELECT id, request_id, sender_role, sender_name, message, created_at
       FROM request_messages
       WHERE request_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    res.json({ messages: result.rows });
  } catch (error) {
    console.error("Fetch request messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Post Clarification Message on Request (Student)
router.post("/requests/:id/messages", studentAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    const docResult = await pool.query(
      `SELECT id, request_id, document_type FROM document_requests WHERE id = $1 AND student_id = $2`,
      [id, req.student.id]
    );
    if (docResult.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }
    const doc = docResult.rows[0];

    const result = await pool.query(
      `INSERT INTO request_messages (request_id, sender_role, sender_name, message)
       VALUES ($1, 'student', $2, $3)
       RETURNING *`,
      [id, req.student.name || "Student", message.trim()]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error("Student message post error:", error);
    res.status(500).json({ message: "Failed to post message" });
  }
});

module.exports = router;