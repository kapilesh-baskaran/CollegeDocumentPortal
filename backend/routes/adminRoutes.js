const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const pool = require("../database");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { adminUniqueId, password } = req.body;

    if (!adminUniqueId || !password) {
      return res.status(400).json({
        message: "Admin Unique ID and Password are required"
      });
    }

    const result = await pool.query(
      `SELECT * FROM admins
       WHERE admin_unique_id = $1`,
      [adminUniqueId.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid Admin ID or password"
      });
    }

    const admin = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid Admin ID or password"
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        uniqueId: admin.admin_unique_id,
        role: "admin"
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      message: "Admin login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.admin_name,
        uniqueId: admin.admin_unique_id
      }
    });

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      message: "Admin login failed"
    });
  }
});

// Admin Dashboard Summary Statistics
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const totalRes = await pool.query(`SELECT COUNT(*) FROM document_requests`);
    const submittedRes = await pool.query(`SELECT COUNT(*) FROM document_requests WHERE status = 'Submitted'`);
    const underVerifRes = await pool.query(`SELECT COUNT(*) FROM document_requests WHERE status = 'Under Verification'`);
    const approvedRes = await pool.query(`SELECT COUNT(*) FROM document_requests WHERE status = 'Approved'`);
    const readyRes = await pool.query(`SELECT COUNT(*) FROM document_requests WHERE status = 'Document Ready'`);
    const correctionRes = await pool.query(`SELECT COUNT(*) FROM document_requests WHERE status = 'Correction Required'`);
    const rejectedRes = await pool.query(`SELECT COUNT(*) FROM document_requests WHERE status = 'Rejected'`);
    
    // Urgent: due within 3 days and not finalized
    const urgentRes = await pool.query(`
      SELECT COUNT(*) FROM document_requests
      WHERE required_by <= CURRENT_DATE + INTERVAL '3 days'
      AND status NOT IN ('Document Ready', 'Rejected')
    `);

    // Overdue: required_by < CURRENT_DATE and not finalized
    const overdueRes = await pool.query(`
      SELECT COUNT(*) FROM document_requests
      WHERE required_by < CURRENT_DATE
      AND status NOT IN ('Document Ready', 'Rejected')
    `);

    res.json({
      stats: {
        total: parseInt(totalRes.rows[0].count, 10),
        submitted: parseInt(submittedRes.rows[0].count, 10),
        underVerification: parseInt(underVerifRes.rows[0].count, 10),
        approved: parseInt(approvedRes.rows[0].count, 10),
        documentReady: parseInt(readyRes.rows[0].count, 10),
        correctionRequired: parseInt(correctionRes.rows[0].count, 10),
        rejected: parseInt(rejectedRes.rows[0].count, 10),
        urgent: parseInt(urgentRes.rows[0].count, 10),
        overdue: parseInt(overdueRes.rows[0].count, 10)
      }
    });
  } catch (error) {
    console.error("Fetch stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

// Fetch All Requests with Search & Filters
router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const { status, documentType, search, urgency } = req.query;

    let query = `
      SELECT
        dr.id,
        dr.request_id,
        dr.student_id,
        s.name,
        s.email,
        s.register_no,
        s.department,
        s.year,
        s.section,
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
      JOIN students s ON dr.student_id = s.id
      LEFT JOIN documents d ON d.request_id = dr.id
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== "All") {
      params.push(status);
      query += ` AND dr.status = $${params.length}`;
    }

    if (documentType && documentType !== "All") {
      params.push(documentType);
      query += ` AND dr.document_type = $${params.length}`;
    }

    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(s.name) LIKE $${params.length} OR
        LOWER(s.register_no) LIKE $${params.length} OR
        LOWER(s.email) LIKE $${params.length} OR
        LOWER(dr.request_id) LIKE $${params.length}
      )`;
    }

    if (urgency === "urgent") {
      query += ` AND dr.required_by <= CURRENT_DATE + INTERVAL '3 days' AND dr.status NOT IN ('Document Ready', 'Rejected')`;
    } else if (urgency === "overdue") {
      query += ` AND dr.required_by < CURRENT_DATE AND dr.status NOT IN ('Document Ready', 'Rejected')`;
    }

    query += ` ORDER BY dr.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      requests: result.rows
    });

  } catch (error) {
    console.error("Fetch admin requests error:", error);
    res.status(500).json({
      message: "Failed to fetch requests"
    });
  }
});

// Update Request Status and Remarks
router.put("/requests/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const allowedStatuses = [
      "Submitted",
      "Under Verification",
      "Approved",
      "Rejected",
      "Correction Required",
      "Document Ready"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid request status"
      });
    }

    // Fetch existing request info to know the student_id and request_id
    const existingReqResult = await pool.query(
      `SELECT * FROM document_requests WHERE id = $1`,
      [id]
    );

    if (existingReqResult.rows.length === 0) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    const currentDoc = existingReqResult.rows[0];

    let verificationHash = null;
    if (status === "Document Ready" || status === "Approved") {
      verificationHash = crypto
        .createHash("sha256")
        .update(`PSNA-${id}-${currentDoc.student_id}-${status}-${Date.now()}`)
        .digest("hex");
    }

    const result = await pool.query(
      `UPDATE document_requests
       SET status = $1,
           admin_remarks = $2,
           verification_hash = COALESCE($3, verification_hash),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, remarks !== undefined ? remarks : currentDoc.admin_remarks, verificationHash, id]
    );

    const updatedRequest = result.rows[0];

    // If status is "Document Ready", generate QR code and link in `documents` table
    let qrDataUrl = null;
    if (status === "Document Ready") {
      try {
        // Construct the verification URL pointing to the portal's verification page
        const frontendBase = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
        const verificationUrl = `${frontendBase}/verify/${updatedRequest.request_id}`;
        
        qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 256,
          color: {
            dark: "#1e3a8a",
            light: "#ffffff"
          }
        });

        // Check if a document record already exists for this request
        const docRecordCheck = await pool.query(
          `SELECT id FROM documents WHERE request_id = $1`,
          [id]
        );

        if (docRecordCheck.rows.length > 0) {
          await pool.query(
            `UPDATE documents
             SET qr_code = $1, file_url = $2, generated_at = CURRENT_TIMESTAMP
             WHERE request_id = $3`,
            [qrDataUrl, `/documents/view/${updatedRequest.request_id}`, id]
          );
        } else {
          await pool.query(
            `INSERT INTO documents (request_id, file_url, qr_code, generated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [id, `/documents/view/${updatedRequest.request_id}`, qrDataUrl]
          );
        }
      } catch (qrErr) {
        console.warn("Could not generate QR code:", qrErr.message);
      }
    }

    // Insert automatic notification for the student
    try {
      let notifTitle = `Status Update: ${status}`;
      let notifMessage = `Your request for ${updatedRequest.document_type} is now marked as ${status}.`;

      if (status === "Document Ready") {
        notifTitle = "Document Ready for Download! 🎓";
        notifMessage = `Great news! Your ${updatedRequest.document_type} (Ref: ${updatedRequest.request_id}) is ready with digital QR verification. Download it from your dashboard.`;
      } else if (status === "Under Verification") {
        notifTitle = "Verification in Progress";
        notifMessage = `Your ${updatedRequest.document_type} request is currently under review by college administration.`;
      } else if (status === "Approved") {
        notifTitle = "Request Approved";
        notifMessage = `Your ${updatedRequest.document_type} request was approved and document preparation has begun.`;
      } else if (status === "Correction Required") {
        notifTitle = "Action Required: Correction Needed ⚠️";
        notifMessage = `Admin remarks: "${remarks || "Please verify your request details and re-submit."}"`;
      } else if (status === "Rejected") {
        notifTitle = "Request Rejected";
        notifMessage = `Your request for ${updatedRequest.document_type} was not approved. Remarks: "${remarks || "Requirements not met."}"`;
      }

      await pool.query(
        `INSERT INTO notifications (student_id, title, message)
         VALUES ($1, $2, $3)`,
        [updatedRequest.student_id, notifTitle, notifMessage]
      );
    } catch (notifErr) {
      console.warn("Could not insert notification:", notifErr.message);
    }

    res.json({
      message: "Request status updated successfully",
      request: updatedRequest,
      qrCode: qrDataUrl
    });

  } catch (error) {
    console.error("Update request status error:", error);
    res.status(500).json({
      message: "Failed to update request status"
    });
  }
});

// Bulk Update Request Statuses (Feature #3: Batch Approval)
router.post("/requests/bulk-status", authMiddleware, async (req, res) => {
  try {
    const { requestIds, status, remarks } = req.body;
    if (!Array.isArray(requestIds) || requestIds.length === 0 || !status) {
      return res.status(400).json({ message: "requestIds array and status are required" });
    }

    const updated = [];
    for (const id of requestIds) {
      let verificationHash = null;
      if (status === "Document Ready" || status === "Approved") {
        verificationHash = crypto
          .createHash("sha256")
          .update(`PSNA-${id}-${Date.now()}-${Math.random()}`)
          .digest("hex");
      }

      const result = await pool.query(
        `UPDATE document_requests
         SET status = $1,
             admin_remarks = COALESCE($2, admin_remarks),
             verification_hash = COALESCE($3, verification_hash),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [status, remarks || null, verificationHash, id]
      );

      if (result.rows.length > 0) {
        const doc = result.rows[0];
        updated.push(doc);

        if (status === "Document Ready") {
          try {
            const frontendBase = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
            const verificationUrl = `${frontendBase}/verify/${doc.request_id}`;
            const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
              errorCorrectionLevel: "H",
              margin: 1,
              width: 256,
              color: { dark: "#1e3a8a", light: "#ffffff" }
            });

            const docCheck = await pool.query(`SELECT id FROM documents WHERE request_id = $1`, [id]);
            if (docCheck.rows.length > 0) {
              await pool.query(
                `UPDATE documents SET qr_code = $1, file_url = $2, generated_at = CURRENT_TIMESTAMP WHERE request_id = $3`,
                [qrDataUrl, `/documents/view/${doc.request_id}`, id]
              );
            } else {
              await pool.query(
                `INSERT INTO documents (request_id, file_url, qr_code, generated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
                [id, `/documents/view/${doc.request_id}`, qrDataUrl]
              );
            }
          } catch (qrErr) {
            console.warn("Bulk QR generation error:", qrErr.message);
          }
        }

        try {
          await pool.query(
            `INSERT INTO notifications (student_id, title, message) VALUES ($1, $2, $3)`,
            [
              doc.student_id,
              status === "Document Ready" ? "Document Ready for Download! 🎓" : `Status Update: ${status}`,
              status === "Document Ready"
                ? `Your ${doc.document_type} (${doc.request_id}) is ready for download with digital QR verification.`
                : `Your ${doc.document_type} request status has been updated to ${status}.`
            ]
          );
        } catch (nErr) {}
      }
    }

    res.json({
      message: `Successfully updated ${updated.length} requests to "${status}"`,
      updatedCount: updated.length
    });
  } catch (error) {
    console.error("Bulk status update error:", error);
    res.status(500).json({ message: "Failed to perform bulk update" });
  }
});

// Export Requests to CSV (Feature #1: One-Click CSV Export)
router.get("/requests/export-csv", authMiddleware, async (req, res) => {
  try {
    const { status, documentType, search } = req.query;

    let query = `
      SELECT
        dr.request_id,
        s.name,
        s.register_no,
        s.email,
        s.department,
        s.year,
        s.section,
        dr.document_type,
        dr.purpose,
        dr.required_by,
        dr.status,
        dr.admin_remarks,
        dr.created_at,
        dr.verification_hash,
        dr.scan_count
      FROM document_requests dr
      JOIN students s ON dr.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "All") {
      params.push(status);
      query += ` AND dr.status = $${params.length}`;
    }
    if (documentType && documentType !== "All") {
      params.push(documentType);
      query += ` AND dr.document_type = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(s.name) LIKE $${params.length} OR
        LOWER(s.register_no) LIKE $${params.length} OR
        LOWER(dr.request_id) LIKE $${params.length} OR
        LOWER(dr.purpose) LIKE $${params.length}
      )`;
    }

    query += ` ORDER BY dr.created_at DESC`;
    const result = await pool.query(query, params);

    const headers = [
      "Request ID",
      "Student Name",
      "Register No",
      "Email",
      "Department",
      "Academic Year",
      "Section",
      "Document Type",
      "Purpose",
      "Required By Date",
      "Status",
      "Admin Remarks",
      "Submitted On",
      "Verification Hash",
      "Scan Count"
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    let csvContent = headers.join(",") + "\n";
    for (const row of result.rows) {
      const line = [
        escapeCsv(row.request_id),
        escapeCsv(row.name),
        escapeCsv(row.register_no),
        escapeCsv(row.email),
        escapeCsv(row.department),
        escapeCsv(row.year),
        escapeCsv(row.section),
        escapeCsv(row.document_type),
        escapeCsv(row.purpose),
        escapeCsv(new Date(row.required_by).toLocaleDateString()),
        escapeCsv(row.status),
        escapeCsv(row.admin_remarks || ""),
        escapeCsv(new Date(row.created_at).toLocaleString()),
        escapeCsv(row.verification_hash || "N/A"),
        escapeCsv(row.scan_count || 0)
      ];
      csvContent += line.join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="PSNA_Document_Requests_${Date.now()}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error("Export CSV error:", error);
    res.status(500).json({ message: "Failed to export requests to CSV" });
  }
});

// Get Messages for a Request (Feature #8: In-App Query Thread)
router.get("/requests/:id/messages", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
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

// Post Message on Request (Admin)
router.post("/requests/:id/messages", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    const docResult = await pool.query(`SELECT student_id, request_id, document_type FROM document_requests WHERE id = $1`, [id]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }
    const doc = docResult.rows[0];

    const result = await pool.query(
      `INSERT INTO request_messages (request_id, sender_role, sender_name, message)
       VALUES ($1, 'admin', 'Office Administration', $2)
       RETURNING *`,
      [id, message.trim()]
    );

    try {
      await pool.query(
        `INSERT INTO notifications (student_id, title, message)
         VALUES ($1, 'New Office Message 💬', $2)`,
        [doc.student_id, `Office query regarding ${doc.document_type} (${doc.request_id}): "${message.trim().slice(0, 75)}..."`]
      );
    } catch (e) {}

    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error("Post message error:", error);
    res.status(500).json({ message: "Failed to post message" });
  }
});

// Get Portal Settings (Feature #6: Digital Signature & Seal)
router.get("/settings", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT setting_key, setting_value FROM portal_settings`);
    const settings = {};
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    res.json({ settings });
  } catch (error) {
    console.error("Fetch settings error:", error);
    res.status(500).json({ message: "Failed to fetch portal settings" });
  }
});

// Update Portal Settings (Feature #6)
router.post("/settings", authMiddleware, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ message: "Settings object is required" });
    }

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO portal_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value)]
      );
    }

    res.json({ message: "Portal settings updated successfully" });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: "Failed to update portal settings" });
  }
});

module.exports = router;