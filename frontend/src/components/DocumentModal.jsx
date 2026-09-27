import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Download, Printer, X, ExternalLink, ShieldCheck } from "lucide-react";
import { generateCollegeDocumentPdf } from "../utils/generatePdf";

export default function DocumentModal({ isOpen, onClose, request, student }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const verificationUrl = `${window.location.origin}/verify/${request?.request_id}`;

  useEffect(() => {
    if (isOpen && request?.request_id) {
      QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: 160,
        color: {
          dark: "#1e3a8a",
          light: "#ffffff"
        }
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("QR Code error:", err));
    }
  }, [isOpen, request?.request_id, verificationUrl]);

  if (!isOpen || !request) return null;

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const pdf = await generateCollegeDocumentPdf({
        requestId: request.request_id,
        documentType: request.document_type,
        purpose: request.purpose,
        student: student || {
          name: request.name,
          register_no: request.register_no,
          department: request.department,
          year: request.year,
          section: request.section
        },
        verificationUrl
      });
      const safeDocName = request.document_type.replace(/\s+/g, "_");
      pdf.save(`College_${safeDocName}_${request.request_id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const studentData = student || {
    name: request.name,
    register_no: request.register_no,
    department: request.department,
    year: request.year,
    section: request.section
  };

  const getOrdinal = (n) => {
    const num = parseInt(n, 10);
    if (num === 1) return "1st";
    if (num === 2) return "2nd";
    if (num === 3) return "3rd";
    if (num === 4) return "4th";
    return `${n || "Current"}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container document-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="modal-header">
          <div className="modal-header-info">
            <span className="badge badge-success">
              <ShieldCheck size={14} className="icon-inline" /> Verified Document
            </span>
            <h3>{request.document_type} Preview</h3>
            <p className="text-muted text-sm">Ref ID: {request.request_id}</p>
          </div>
          <div className="modal-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
              disabled={isGenerating}
            >
              <Download size={15} />
              {isGenerating ? "Generating..." : "Download Official PDF"}
            </button>
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>
              <Printer size={15} /> Print
            </button>
            <button className="btn-close" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body: Realistic Certificate Paper */}
        <div className="modal-body certificate-paper-wrap">
          <div className="certificate-sheet printable-area">
            {/* Certificate Header */}
            <div className="cert-header">
              <div className="cert-emblem-seal">
                <div className="seal-emblem">PSNA</div>
              </div>
              <div className="cert-college-details">
                <h1 className="cert-college-title">
                  PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY
                </h1>
                <p className="cert-college-sub">
                  (An Autonomous Institution Affiliated to Anna University, Chennai)
                </p>
                <p className="cert-college-sub">
                  Accredited by NAAC with &apos;A++&apos; Grade | Approved by AICTE, New Delhi
                </p>
                <p className="cert-college-address">
                  Kothandaraman Nagar, Dindigul - 624622, Tamil Nadu, India
                </p>
              </div>
            </div>

            <hr className="cert-divider" />

            {/* Meta Row */}
            <div className="cert-meta-row">
              <span className="cert-ref">
                <strong>REF NO:</strong> PSNA/DOC/{request.request_id}
              </span>
              <span className="cert-date">
                <strong>DATE:</strong>{" "}
                {new Date(request.created_at || request.generated_at || "2026-09-27").toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </span>
            </div>

            {/* Document Title Ribbon */}
            <div className="cert-title-ribbon">
              <h2>{request.document_type.toUpperCase()}</h2>
            </div>

            {/* Document Body */}
            <div className="cert-content">
              {request.document_type === "Bonafide Certificate" && (
                <div className="cert-prose">
                  <p>
                    This is to certify that{" "}
                    <strong>{studentData?.name || "Student"}</strong> (Register No:{" "}
                    <strong>{studentData?.register_no}</strong>) is a bonafide student
                    of this institution, currently studying in the{" "}
                    <strong>{getOrdinal(studentData?.year)} Year</strong> of Bachelor of
                    Technology / Engineering in{" "}
                    <strong>{studentData?.department}</strong>, Section &apos;
                    <strong>{studentData?.section}</strong>&apos; during the academic
                    year 2025-2026.
                  </p>
                  <p>
                    According to the college records, his/her academic progress, conduct,
                    and character have been found to be <strong>GOOD</strong> throughout
                    the academic period.
                  </p>
                  <p>
                    This certificate is issued on the student&apos;s requisition for the
                    purpose of <strong>&ldquo;{request.purpose}&rdquo;</strong>.
                  </p>
                </div>
              )}

              {request.document_type === "Fee Structure" && (
                <div className="cert-table-wrap">
                  <p className="cert-subtitle">
                    Certified Tuition &amp; Academic Fee Schedule for Academic Year 2025-2026:
                  </p>
                  <table className="cert-fee-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Fee Particulars</th>
                        <th className="text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>Tuition Fee (Annual)</td>
                        <td className="text-right">Rs. 65,000.00</td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td>Special Academic, Computing &amp; Lab Fee</td>
                        <td className="text-right">Rs. 18,500.00</td>
                      </tr>
                      <tr>
                        <td>3</td>
                        <td>Digital Library &amp; Learning Resources Fee</td>
                        <td className="text-right">Rs. 5,000.00</td>
                      </tr>
                      <tr>
                        <td>4</td>
                        <td>University Registration &amp; Exam Charges</td>
                        <td className="text-right">Rs. 4,500.00</td>
                      </tr>
                      <tr>
                        <td>5</td>
                        <td>Campus Development &amp; Student Amenities</td>
                        <td className="text-right">Rs. 7,000.00</td>
                      </tr>
                      <tr className="cert-total-row">
                        <td colSpan="2">
                          <strong>TOTAL ANNUAL INSTITUTIONAL FEES</strong>
                        </td>
                        <td className="text-right">
                          <strong>Rs. 1,00,000.00</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-muted mt-2">
                    Certified for Purpose: {request.purpose}
                  </p>
                </div>
              )}

              {request.document_type === "Bus Fee Structure" && (
                <div className="cert-table-wrap">
                  <p className="cert-subtitle">
                    Official College Transport &amp; Bus Transit Fee Schedule:
                  </p>
                  <table className="cert-fee-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Transport Particulars</th>
                        <th className="text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>Annual Bus Route Transport Pass</td>
                        <td className="text-right">Rs. 22,000.00</td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td>Fleet Maintenance &amp; GPS Tracking Service</td>
                        <td className="text-right">Rs. 3,500.00</td>
                      </tr>
                      <tr>
                        <td>3</td>
                        <td>Student Bus Transit Insurance</td>
                        <td className="text-right">Rs. 2,000.00</td>
                      </tr>
                      <tr className="cert-total-row">
                        <td colSpan="2">
                          <strong>TOTAL TRANSPORT CHARGES</strong>
                        </td>
                        <td className="text-right">
                          <strong>Rs. 27,500.00</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-muted mt-2">
                    Certified for Purpose: {request.purpose}
                  </p>
                </div>
              )}

              {request.document_type === "Hostel Fee Structure" && (
                <div className="cert-table-wrap">
                  <p className="cert-subtitle">
                    Official College Residential Hostel &amp; Mess Charges:
                  </p>
                  <table className="cert-fee-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Hostel Particulars</th>
                        <th className="text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>Room Rent (Standard Sharing Accommodation)</td>
                        <td className="text-right">Rs. 38,000.00</td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td>Mess Charges (Annual Boarding - Veg &amp; Non-Veg)</td>
                        <td className="text-right">Rs. 42,000.00</td>
                      </tr>
                      <tr>
                        <td>3</td>
                        <td>Electricity, Water &amp; Facility Maintenance</td>
                        <td className="text-right">Rs. 8,000.00</td>
                      </tr>
                      <tr>
                        <td>4</td>
                        <td>Caution Deposit (Refundable)</td>
                        <td className="text-right">Rs. 5,000.00</td>
                      </tr>
                      <tr className="cert-total-row">
                        <td colSpan="2">
                          <strong>TOTAL HOSTEL &amp; MESS CHARGES</strong>
                        </td>
                        <td className="text-right">
                          <strong>Rs. 93,000.00</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-muted mt-2">
                    Certified for Purpose: {request.purpose}
                  </p>
                </div>
              )}
            </div>

            {/* Verification & Signature Footer */}
            <div className="cert-footer">
              <div className="cert-qr-block">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Digital Verification QR Code"
                    className="cert-qr-img"
                  />
                ) : (
                  <div className="cert-qr-placeholder">Generating QR...</div>
                )}
                <div className="cert-qr-meta">
                  <span className="cert-qr-label">DIGITAL QR VERIFICATION</span>
                  <span className="cert-qr-note">
                    Scan with any smartphone camera to authenticate certificate.
                  </span>
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="cert-verify-link"
                  >
                    Open Verification Page <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              <div className="cert-sig-block">
                <div className="official-stamp-circle">
                  <span>PSNACET</span>
                  <span>SEAL</span>
                </div>
                <div className="cert-sig-lines">
                  <div className="sig-authorizer">PRINCIPAL / DEAN</div>
                  <div className="sig-office">Academic Administration</div>
                </div>
              </div>
            </div>

            <div className="cert-disclaimer">
              This document is an authentic electronic record issued under digital authorization by
              the College Document Portal. No physical signature is required.
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="modal-footer">
          <div className="text-muted text-xs">
            Tip: You can download this official PDF anytime or share the verification link with banks
            and institutions.
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
