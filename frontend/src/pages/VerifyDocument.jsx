import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Award, Calendar, CheckCircle2, User, BookOpen, Clock, ArrowLeft, Building2 } from "lucide-react";
import api from "../services/api";

export default function VerifyDocument() {
  const { requestId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verify() {
      try {
        setLoading(true);
        const res = await api.get(`/documents/verify/${requestId}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Document verification failed or record not found.");
      } finally {
        setLoading(false);
      }
    }
    if (requestId) {
      verify();
    }
  }, [requestId]);

  const getOrdinal = (n) => {
    const num = parseInt(n, 10);
    if (num === 1) return "1st";
    if (num === 2) return "2nd";
    if (num === 3) return "3rd";
    if (num === 4) return "4th";
    return `${n || "Current"}`;
  };

  return (
    <div className="verify-page-wrap">
      {/* Top Banner */}
      <header className="portal-header">
        <div className="header-container">
          <div className="portal-brand">
            <div className="navbar-logo-badge verify-logo-badge">
              <img src="/psna-logo.png" alt="PSNA College" className="navbar-college-logo" />
            </div>
            <div>
              <h1 className="brand-title">PSNA College of Engineering and Technology</h1>
              <p className="brand-tagline">Official Digital Document Verification Portal</p>
            </div>
          </div>
          <Link to="/login" className="btn btn-outline-white btn-sm">
            <ArrowLeft size={14} /> Back to Portal
          </Link>
        </div>
      </header>

      <main className="verify-main-container">
        {loading ? (
          <div className="verify-card loading-card">
            <div className="spinner"></div>
            <p>Authenticating document against college database...</p>
            <span className="text-muted text-xs">Reference: {requestId}</span>
          </div>
        ) : error ? (
          <div className="verify-card error-card">
            <div className="verify-icon-wrap error-icon">
              <ShieldAlert size={56} />
            </div>
            <h2 className="verify-status-title text-danger">Verification Failed</h2>
            <p className="verify-status-sub">{error}</p>
            <div className="verify-notice-box">
              <p className="text-sm">
                The requested reference ID <code>{requestId}</code> could not be validated.
                Please ensure you scanned a genuine QR code issued by the college portal.
              </p>
            </div>
            <Link to="/login" className="btn btn-primary mt-4">
              Return to Document Portal
            </Link>
          </div>
        ) : data?.verified ? (
          <div className="verify-card success-card">
            <div className="verify-icon-wrap success-icon">
              <ShieldCheck size={56} />
            </div>

            <div className="verify-badge-pill">
              <CheckCircle2 size={16} /> GENUINE &amp; OFFICIALLY VERIFIED
            </div>

            <h2 className="verify-status-title text-success">
              Valid Institutional Document
            </h2>
            <p className="verify-status-sub">
              This document was officially approved and digitally issued by the Office of Academic
              Administration.
            </p>

            <div className="verify-details-grid">
              <div className="verify-detail-item">
                <span className="verify-label">Document Type</span>
                <span className="verify-val font-semibold text-primary">
                  <Award size={15} className="icon-inline" /> {data.document.documentType}
                </span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-label">Reference ID</span>
                <span className="verify-val font-mono">{data.document.requestId}</span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-label">Student Name</span>
                <span className="verify-val">
                  <User size={15} className="icon-inline" /> {data.document.issuedTo.name}
                </span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-label">Register Number</span>
                <span className="verify-val font-mono font-bold">
                  {data.document.issuedTo.registerNo}
                </span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-label">Department &amp; Year</span>
                <span className="verify-val">
                  <BookOpen size={15} className="icon-inline" /> {data.document.issuedTo.department} (
                  {getOrdinal(data.document.issuedTo.year)} Year, Sec {data.document.issuedTo.section})
                </span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-label">Certified Purpose</span>
                <span className="verify-val">{data.document.purpose}</span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-label">Issuing Authority</span>
                <span className="verify-val font-semibold">
                  {data.document.issuingAuthority}
                </span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-label">Issue Date</span>
                <span className="verify-val">
                  <Calendar size={15} className="icon-inline" />{" "}
                  {new Date(data.document.issuedDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </div>
            </div>

            <div className="verify-security-note">
              <p>
                <strong>Security Notice:</strong> This digital verification confirms that the record
                matches the primary college database. Intended for banks, universities, visa consulates,
                and scholarship authorities.
              </p>
            </div>
          </div>
        ) : (
          <div className="verify-card warning-card">
            <div className="verify-icon-wrap warning-icon">
              <Clock size={56} />
            </div>
            <h2 className="verify-status-title text-amber">
              Document Pending Issuance
            </h2>
            <p className="verify-status-sub">
              This request exists in the system but its status is currently:{" "}
              <strong>{data?.status}</strong>.
            </p>
            <div className="verify-notice-box">
              <p className="text-sm">
                The document has not yet been marked as <strong>Document Ready</strong>. Once the
                administrative office approves and releases the certificate, the verification badge
                will activate automatically.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="verify-footer">
        <p>
          &copy; {new Date().getFullYear()} PSNA College of Engineering and Technology. All Rights
          Reserved.
        </p>
        <p className="text-xs text-muted">
          College Document Portal &bull; ISO 9001:2015 Certified Educational Institution
        </p>
      </footer>
    </div>
  );
}
