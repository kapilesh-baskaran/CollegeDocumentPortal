const express = require("express");
const pool = require("../database");
const { isValidRequiredDate } = require("../utils/dateValidation");
const studentAuthMiddleware = require("../middleware/studentAuthMiddleware");

const router = express.Router();

// Allowed Document Types
const VALID_DOC_TYPES = [
  "Bonafide Certificate",
  "Fee Structure",
  "Bus Fee Structure",
  "Hostel Fee Structure"
];

// Submit a new document request (Student only)
router.post("/request", studentAuthMiddleware, async (req, res) => {
  try {
    const { documentType, purpose, requiredBy } = req.body;
    const studentId = req.student.id;

    if (!documentType || !purpose || !requiredBy) {
      return res.status(400).json({
        message: "Document type, purpose, and required-by date are required"
      });
    }

    if (!VALID_DOC_TYPES.includes(documentType)) {
      return res.status(400).json({
        message: `Invalid document type. Allowed types: ${VALID_DOC_TYPES.join(", ")}`
      });
    }

    if (!isValidRequiredDate(requiredBy)) {
      return res.status(400).json({
        message: "Required-by date must be at least 5 days from today per college processing policy"
      });
    }

    const requestId = `REQ-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO document_requests
      (request_id, student_id, document_type, purpose, required_by, status)
      VALUES ($1, $2, $3, $4, $5, 'Submitted')
      RETURNING *`,
      [requestId, studentId, documentType, purpose.trim(), requiredBy]
    );

    const newRequest = result.rows[0];

    // Create an automatic notification for the student
    try {
      await pool.query(
        `INSERT INTO notifications (student_id, title, message)
         VALUES ($1, $2, $3)`,
        [
          studentId,
          "Request Submitted",
          `Your request for ${documentType} (ID: ${requestId}) has been submitted successfully and queued for verification.`
        ]
      );
    } catch (notifErr) {
      console.warn("Could not insert submission notification:", notifErr.message);
    }

    res.status(201).json({
      message: "Document request submitted successfully",
      request: newRequest
    });

  } catch (error) {
    console.error("Document request submission error:", error);
    res.status(500).json({
      message: "Failed to submit document request. Please try again."
    });
  }
});

// Public Document Verification (Used by QR codes and third-party verifiers)
router.get("/verify/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;

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
        s.name AS student_name,
        s.register_no,
        s.department,
        s.year,
        s.section,
        s.email,
        d.id AS document_id,
        d.qr_code,
        d.file_url,
        d.generated_at,
        dr.verification_hash,
        dr.scan_count,
        dr.last_scanned_at
      FROM document_requests dr
      JOIN students s ON dr.student_id = s.id
      LEFT JOIN documents d ON d.request_id = dr.id
      WHERE dr.request_id = $1`,
      [requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        verified: false,
        message: "No record found for the provided Document ID."
      });
    }

    const doc = result.rows[0];
    const isReady = doc.status === "Document Ready" || doc.status === "Approved";

    // Increment scan counter in background
    let newScanCount = (doc.scan_count || 0) + 1;
    let vHash = doc.verification_hash;
    if (!vHash) {
      const crypto = require("crypto");
      vHash = crypto.createHash("sha256").update(`PSNA-${doc.id}-${doc.register_no}-${doc.document_type}`).digest("hex");
    }

    try {
      await pool.query(
        `UPDATE document_requests
         SET scan_count = $1, last_scanned_at = CURRENT_TIMESTAMP, verification_hash = COALESCE(verification_hash, $2)
         WHERE id = $3`,
        [newScanCount, vHash, doc.id]
      );
    } catch (scErr) {
      console.warn("Scan count increment warning:", scErr.message);
    }

    res.json({
      verified: isReady,
      status: doc.status,
      message: isReady
        ? "This document is verified and authenticated by the College Office."
        : `This document is currently ${doc.status} and has not yet been marked ready.`,
      document: {
        requestId: doc.request_id,
        documentType: doc.document_type,
        purpose: doc.purpose,
        status: doc.status,
        issuedTo: {
          name: doc.student_name,
          registerNo: doc.register_no,
          department: doc.department,
          year: doc.year,
          section: doc.section
        },
        issuingAuthority: "Office of Academic Affairs & Administration",
        issuedDate: doc.generated_at || doc.updated_at,
        createdAt: doc.created_at,
        verificationHash: vHash,
        scanCount: newScanCount,
        lastScannedAt: new Date()
      }
    });

  } catch (error) {
    console.error("Document verification error:", error);
    res.status(500).json({
      verified: false,
      message: "An error occurred while verifying the document."
    });
  }
});

module.exports = router;