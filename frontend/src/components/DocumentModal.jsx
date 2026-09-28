import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Download, Printer, X, ShieldCheck } from "lucide-react";
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
          dark: "#0f172a",
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
        verificationUrl,
        verificationHash: request.verification_hash
      });
      const safeDocName = request.document_type.replace(/\s+/g, "_");
      pdf.save(`PSNA_${safeDocName}_${request.request_id}.pdf`);
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

  const getWordYear = (n) => {
    const num = parseInt(n, 10);
    if (num === 1) return "First";
    if (num === 2) return "Second";
    if (num === 3) return "Third";
    if (num === 4) return "Final";
    return "First";
  };

  const getRomanYear = (n) => {
    const num = parseInt(n, 10);
    if (num === 1) return "I";
    if (num === 2) return "II";
    if (num === 3) return "III";
    if (num === 4) return "IV";
    return "I";
  };

  const today = new Date();
  const dateHyphen = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  const dateDots = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

  let cleanPurpose = request.purpose && request.purpose.trim() ? request.purpose.trim() : "an education loan";
  if (cleanPurpose.toLowerCase().startsWith("apply for ")) {
    cleanPurpose = cleanPurpose.slice(10);
  } else if (cleanPurpose.toLowerCase().startsWith("for ")) {
    cleanPurpose = cleanPurpose.slice(4);
  }
  if (cleanPurpose.toLowerCase() === "education loan processing" || cleanPurpose.toLowerCase() === "education loan") {
    cleanPurpose = "an education loan";
  }

  const isTransportReceipt = request.document_type === "Bus Fee Structure";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container document-preview-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: isTransportReceipt ? "680px" : "860px" }}
      >
        {/* Modal Top Bar */}
        <div className="modal-header">
          <div className="modal-header-info">
            <span className="badge badge-success">
              <ShieldCheck size={14} className="icon-inline" /> Official College Record
            </span>
            <h3>{request.document_type} Preview</h3>
            <p className="text-muted text-sm font-mono">Ref ID: {request.request_id}</p>
          </div>
          <div className="modal-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
              disabled={isGenerating}
            >
              <Download size={15} />
              {isGenerating ? "Generating PDF..." : "Download Official PDF"}
            </button>
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>
              <Printer size={15} /> Print
            </button>
            <button className="btn-close" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body: Authentic Certificate Paper */}
        <div className="modal-body certificate-paper-wrap" style={{ background: "#94a3b8", padding: "24px" }}>
          <div
            className="certificate-sheet printable-area"
            style={{
              background: "#ffffff",
              color: "#0f172a",
              boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
              padding: isTransportReceipt ? "24px" : "28px 36px",
              position: "relative",
              borderRadius: "4px",
              minHeight: isTransportReceipt ? "700px" : "850px",
              display: "flex",
              flexDirection: "column",
              fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          >
            {/* Authentic PSNA College Letterhead (Not on Transport slip) */}
            {!isTransportReceipt && (
              <div style={{ marginBottom: "16px" }}>
                <img
                  src="/psna-letterhead.png"
                  alt="PSNA College of Engineering and Technology Letterhead"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            )}

            {/* Left Margin "Building the Future" script and body container */}
            <div style={{ display: "flex", flex: 1, position: "relative" }}>
              {!isTransportReceipt && (
                <div style={{ width: "36px", marginRight: "16px", flexShrink: 0 }}>
                  <img
                    src="/building-future.png"
                    alt="Building the Future"
                    style={{ width: "100%", height: "auto", opacity: 0.85 }}
                  />
                </div>
              )}

              {/* Main Document Content Area */}
              <div style={{ flex: 1 }}>
                {/* 1. BONAFIDE CERTIFICATE (Exact replica: media_1790575764431.png) */}
                {request.document_type === "Bonafide Certificate" && (
                  <div>
                    <div style={{ textAlign: "right", fontWeight: 700, fontSize: "0.95rem", marginBottom: "18px" }}>
                      Date:{dateHyphen}
                    </div>

                    <div style={{ textAlign: "center", marginBottom: "28px" }}>
                      <h2 style={{ fontSize: "1.55rem", fontWeight: 800, margin: 0, letterSpacing: "0.5px" }}>
                        Bonafide Certificate
                      </h2>
                    </div>

                    <div style={{ fontSize: "1.06rem", lineHeight: 1.85, color: "#1e293b", marginBottom: "20px" }}>
                      <p>
                        This is to certify that{" "}
                        <strong style={{ fontSize: "1.12rem" }}>Mr./Ms. {studentData?.name}</strong> is a
                        bonafide student of this college, studying in{" "}
                        <strong>{getOrdinal(studentData?.year)} year B.Tech. Degree in {studentData?.department}</strong> during
                        the academic year <strong>2024-2025</strong>.
                      </p>
                      <p style={{ marginTop: "24px" }}>
                        This certificate is issued to apply for {cleanPurpose}.
                      </p>
                    </div>

                    {/* Signatures & Stamp Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "65px" }}>
                      {/* Left: QR Verification */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {qrCodeUrl && (
                          <img src={qrCodeUrl} alt="Verification QR" style={{ width: "72px", height: "72px" }} />
                        )}
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          <div style={{ fontWeight: 800, color: "#1e3a8a" }}>DIGITAL QR VERIFICATION</div>
                          <div>Scan to verify college authenticity</div>
                          <div style={{ fontFamily: "monospace" }}>Ref: {request.request_id}</div>
                        </div>
                      </div>

                      {/* Right: Authentic HOD Stamp & Signature */}
                      <div style={{ textAlign: "center" }}>
                        <img
                          src="/hod-stamp.png"
                          alt="HOD Stamp"
                          style={{ width: "190px", height: "auto", display: "inline-block" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. FEE STRUCTURE / CERTIFICATE (Exact replica: media_1790575770000.png) */}
                {request.document_type === "Fee Structure" && (
                  <div>
                    <div style={{ textAlign: "right", fontSize: "0.95rem", marginBottom: "12px" }}>
                      Date: {dateDots}
                    </div>

                    <div style={{ textAlign: "center", marginBottom: "18px" }}>
                      <h2
                        style={{
                          fontSize: "1.35rem",
                          fontWeight: 800,
                          margin: 0,
                          textDecoration: "underline",
                          letterSpacing: "1px"
                        }}
                      >
                        CERTIFICATE
                      </h2>
                    </div>

                    <div style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "#1e293b", marginBottom: "14px" }}>
                      <p>
                        This is to certify that{" "}
                        <strong>Mr./Ms. {studentData?.name?.toUpperCase()}</strong> is a bonafide student of this
                        college studying in{" "}
                        <strong>{getWordYear(studentData?.year)} Year B.Tech – {studentData?.department?.toUpperCase()}</strong> during
                        the academic year <strong>2024-2025</strong>. The duration of the Programme is four years. The
                        student is liable to pay the following college fees from the academic years{" "}
                        <strong>2024-25 to 2027-28</strong>.
                      </p>
                    </div>

                    {/* 4-Year Schedule Table */}
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.8rem",
                        marginBottom: "10px",
                        border: "1px solid #64748b"
                      }}
                    >
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={{ border: "1px solid #64748b", padding: "6px", textAlign: "left" }}>
                            Particulars
                          </th>
                          <th style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>
                            I Year<br />(2024-25) Rs.
                          </th>
                          <th style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>
                            II Year<br />(2025-26) Rs.
                          </th>
                          <th style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>
                            III Year<br />(2026-27) Rs.
                          </th>
                          <th style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>
                            IV Year<br />(2027-28) Rs.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: "1px solid #64748b", padding: "6px" }}>
                            Tuition Fee, Special Fee and Accreditation Fee
                          </td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>87,000</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>87,000</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>87,000</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>87,000</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #64748b", padding: "6px" }}>Development Fees</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>5,000</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>5,000</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>5,000</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>5,000</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #64748b", padding: "6px" }}>
                            Other Charges: Stationery, Insurance, Internet, Curriculum, Sports, Affiliation Fees and Autonomous Fees etc,
                          </td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>49,600</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>49,600</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>49,600</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>49,600</td>
                        </tr>
                        <tr style={{ fontWeight: 800, background: "#f8fafc" }}>
                          <td style={{ border: "1px solid #64748b", padding: "6px" }}>Total</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>1,41,600</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>1,41,600</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>1,41,600</td>
                          <td style={{ border: "1px solid #64748b", padding: "6px", textAlign: "center" }}>1,41,600</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ fontSize: "0.82rem", lineHeight: 1.5, color: "#1e293b", marginBottom: "12px" }}>
                      <p style={{ fontWeight: 800, margin: "4px 0" }}>
                        Rs. 5,66,400/- (Rupees Five Lakhs Sixty Six Thousand and Four Hundred Only) for four years.
                      </p>
                      <p style={{ margin: "2px 0" }}>
                        &bull; This certificate is issued to enable the student for applying educational loan from bank only.
                      </p>
                      <p style={{ margin: "2px 0" }}>
                        &bull; Demand Draft may be drawn in favour of &quot;PSNA College of Engineering and Technology&quot; payable at Dindigul for every year.
                      </p>
                    </div>

                    {/* Seal & Registrar Signature */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
                      <div>
                        <img
                          src="/college-seal.png"
                          alt="College Seal"
                          style={{ width: "95px", height: "auto" }}
                        />
                      </div>

                      {qrCodeUrl && (
                        <div style={{ textAlign: "center" }}>
                          <img src={qrCodeUrl} alt="QR Code" style={{ width: "60px", height: "60px" }} />
                          <div style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#64748b" }}>
                            Ref: {request.request_id}
                          </div>
                        </div>
                      )}

                      <div style={{ textAlign: "center" }}>
                        <img
                          src="/registrar-sign.png"
                          alt="Registrar Sign"
                          style={{ width: "160px", height: "auto" }}
                        />
                        <div style={{ fontWeight: 800, fontSize: "0.85rem", marginTop: "2px" }}>
                          REGISTRAR (ACADEMIC)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BUS FEE STRUCTURE / TRANSPORT RECEIPT (Exact replica: media_1790575778460.jpg) */}
                {request.document_type === "Bus Fee Structure" && (
                  <div style={{ border: "2px solid #1e3a8a", padding: "18px", borderRadius: "4px", position: "relative" }}>
                    {/* Header */}
                    <div style={{ textAlign: "center", borderBottom: "1.5px solid #1e3a8a", paddingBottom: "10px", marginBottom: "14px" }}>
                      <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#334155", letterSpacing: "1px" }}>
                        STUDENT COPY
                      </div>
                      <div style={{ margin: "6px auto", maxWidth: "260px" }}>
                        <img src="/psna-logo.png" alt="PSNA Logo" style={{ width: "100%", height: "auto" }} />
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                        Kothandaraman Nagar, Dindigul - 624 622.
                      </div>
                      <div
                        style={{
                          background: "#f1f5f9",
                          padding: "5px",
                          marginTop: "8px",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          borderTop: "1px solid #1e3a8a",
                          borderBottom: "1px solid #1e3a8a",
                          color: "#1e3a8a"
                        }}
                      >
                        TRANSPORT FEES RECEIPT
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.84rem", marginBottom: "12px", color: "#0f172a" }}>
                      <div><strong>R.No. :</strong> {request.request_id}</div>
                      <div style={{ textAlign: "right" }}><strong>Date :</strong> {dateDots}</div>
                      <div><strong>Name :</strong> {studentData?.name?.toUpperCase()}</div>
                      <div style={{ textAlign: "right" }}><strong>Roll No. :</strong> 24293</div>
                      <div><strong>Year :</strong> {getRomanYear(studentData?.year)} Year</div>
                      <div style={{ textAlign: "right" }}><strong>Reg No :</strong> {studentData?.register_no}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Branch :</strong> B.Tech - {studentData?.department}</div>
                    </div>

                    {/* Table with Stamp */}
                    <div style={{ border: "1px solid #1e3a8a", position: "relative", marginBottom: "12px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #1e3a8a", background: "#f8fafc" }}>
                            <th style={{ padding: "6px", width: "45px" }}>S.No</th>
                            <th style={{ padding: "6px", textAlign: "left" }}>Description</th>
                            <th style={{ padding: "6px", textAlign: "right" }}>Amount (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: "8px 6px", textAlign: "center" }}>1</td>
                            <td style={{ padding: "8px 6px" }}>Bus Route : MADURAI / DINDIGUL / PALANI</td>
                            <td style={{ padding: "8px 6px", textAlign: "right" }}>-</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 6px", textAlign: "center" }}>2</td>
                            <td style={{ padding: "8px 6px" }}>Boarding Point : COLLEGE TRANSIT POINT</td>
                            <td style={{ padding: "8px 6px", textAlign: "right" }}>-</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 6px", textAlign: "center" }}>3</td>
                            <td style={{ padding: "8px 6px" }}>Annual Institutional Bus Fee Schedule</td>
                            <td style={{ padding: "8px 6px", textAlign: "right" }}>35,400.00</td>
                          </tr>
                          <tr style={{ borderTop: "1.5px solid #1e3a8a", fontWeight: 800, background: "#f8fafc" }}>
                            <td colSpan="2" style={{ padding: "8px 6px", textAlign: "right" }}>TOTAL</td>
                            <td style={{ padding: "8px 6px", textAlign: "right" }}>Rs. 35,400.00</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Diagonal CASH RECEIVED Stamp */}
                      <img
                        src="/transport-stamp.png"
                        alt="Cash Received Stamp"
                        style={{
                          position: "absolute",
                          left: "22%",
                          top: "6px",
                          width: "210px",
                          opacity: 0.92,
                          pointerEvents: "none"
                        }}
                      />
                    </div>

                    <div style={{ fontSize: "0.82rem", fontStyle: "italic", marginBottom: "18px", color: "#1e293b" }}>
                      Rupees in words : Thirty five thousand four hundred only.
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem", fontWeight: 700 }}>
                      <div>Transport Department</div>
                      {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" style={{ width: "52px", height: "52px" }} />}
                      <div>Cashier Sign</div>
                    </div>
                  </div>
                )}

                {/* 4. HOSTEL FEE STRUCTURE */}
                {request.document_type === "Hostel Fee Structure" && (
                  <div>
                    <div style={{ textAlign: "right", fontSize: "0.95rem", marginBottom: "10px" }}>
                      Date: {dateDots}
                    </div>

                    <div style={{ textAlign: "center", marginBottom: "18px" }}>
                      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, textDecoration: "underline" }}>
                        HOSTEL &amp; RESIDENTIAL FEE CERTIFICATE
                      </h2>
                    </div>

                    <div style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "#1e293b", marginBottom: "14px" }}>
                      <p>
                        This is to certify that{" "}
                        <strong>Mr./Ms. {studentData?.name?.toUpperCase()}</strong> (Reg No: {studentData?.register_no}) is a
                        residential student enrolled at PSNA College Hostels, pursuing{" "}
                        <strong>{getOrdinal(studentData?.year)} Year B.Tech – {studentData?.department}</strong> during the
                        academic year 2024-2025.
                      </p>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", marginBottom: "14px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", border: "1px solid #64748b" }}>
                          <th style={{ padding: "6px", textAlign: "left" }}>S.No</th>
                          <th style={{ padding: "6px", textAlign: "left" }}>Particulars</th>
                          <th style={{ padding: "6px", textAlign: "right" }}>Amount (INR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ border: "1px solid #cbd5e1" }}>
                          <td style={{ padding: "6px" }}>1</td>
                          <td style={{ padding: "6px" }}>Hostel Room Rent (Standard Accommodation)</td>
                          <td style={{ padding: "6px", textAlign: "right" }}>Rs. 38,000.00</td>
                        </tr>
                        <tr style={{ border: "1px solid #cbd5e1" }}>
                          <td style={{ padding: "6px" }}>2</td>
                          <td style={{ padding: "6px" }}>Mess Charges (Annual Boarding - Veg &amp; Non-Veg)</td>
                          <td style={{ padding: "6px", textAlign: "right" }}>Rs. 42,000.00</td>
                        </tr>
                        <tr style={{ border: "1px solid #cbd5e1" }}>
                          <td style={{ padding: "6px" }}>3</td>
                          <td style={{ padding: "6px" }}>Electricity, Water &amp; Facility Maintenance</td>
                          <td style={{ padding: "6px", textAlign: "right" }}>Rs. 8,000.00</td>
                        </tr>
                        <tr style={{ border: "1px solid #cbd5e1" }}>
                          <td style={{ padding: "6px" }}>4</td>
                          <td style={{ padding: "6px" }}>Hostel Caution Deposit (Refundable)</td>
                          <td style={{ padding: "6px", textAlign: "right" }}>Rs. 5,000.00</td>
                        </tr>
                        <tr style={{ border: "1px solid #64748b", fontWeight: 800, background: "#f8fafc" }}>
                          <td colSpan="2" style={{ padding: "6px" }}>TOTAL ANNUAL HOSTEL CHARGES</td>
                          <td style={{ padding: "6px", textAlign: "right" }}>Rs. 93,000.00</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "30px" }}>
                      <img src="/college-seal.png" alt="College Seal" style={{ width: "95px", height: "auto" }} />
                      {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" style={{ width: "60px", height: "60px" }} />}
                      <div style={{ textAlign: "center" }}>
                        <img src="/registrar-sign.png" alt="Registrar Signature" style={{ width: "160px", height: "auto" }} />
                        <div style={{ fontWeight: 800, fontSize: "0.85rem", marginTop: "2px" }}>
                          REGISTRAR (ACADEMIC)
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Official 3-Column Contact Footer (Only for Letterhead Documents) */}
            {!isTransportReceipt && (
              <div style={{ marginTop: "auto", paddingTop: "24px" }}>
                <img
                  src="/psna-footer.png"
                  alt="PSNA College Contact Footer"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="modal-footer">
          <div className="text-muted text-xs">
            Authentic PSNACET Institutional Copy &bull; Verifiable via QR Code and Cryptographic SHA-256 Hash
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
