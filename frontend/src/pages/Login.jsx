import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, Shield, Mail, KeyRound, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  // Role: "student" or "admin"
  const [role, setRole] = useState("student");

  // Student Login State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Admin Login State
  const [adminUniqueId, setAdminUniqueId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Feedback Messages
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [backupOtp, setBackupOtp] = useState("");

  const startCooldown = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email) {
      setMessage({ type: "error", text: "Please enter your college email address" });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const res = await api.post("/students/send-otp", {
        email: email.trim()
      });

      setOtpSent(true);
      if (res.data?.otp) {
        setBackupOtp(res.data.otp);
      }
      setMessage({
        type: "success",
        text: res.data.message || "OTP sent successfully! Please check your Inbox or Spam folder."
      });
      startCooldown();
    } catch (err) {
      console.error("Login OTP error:", err);
      const errorMsg =
        err.response?.data?.message ||
        (!err.response
          ? "Unable to reach server. Please check your backend status or network connection."
          : "Failed to send OTP. Please check your email.");
      setMessage({
        type: "error",
        text: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otp) {
      setMessage({ type: "error", text: "Please enter the 6-digit OTP" });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const res = await api.post("/students/verify-otp", {
        email: email.trim(),
        otp: otp.trim()
      });

      localStorage.setItem("studentToken", res.data.token);
      localStorage.setItem("student", JSON.stringify(res.data.student));

      setMessage({ type: "success", text: "Verification successful! Redirecting..." });
      setTimeout(() => {
        navigate("/student-dashboard");
      }, 500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Invalid or expired OTP. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e?.preventDefault();
    if (!adminUniqueId || !adminPassword) {
      setMessage({ type: "error", text: "Please enter your Admin Unique ID and Password" });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const res = await api.post("/admin/login", {
        adminUniqueId: adminUniqueId.trim(),
        password: adminPassword
      });

      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("admin", JSON.stringify(res.data.admin));

      setMessage({ type: "success", text: "Admin login successful! Redirecting..." });
      setTimeout(() => {
        navigate("/admin-dashboard");
      }, 500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Invalid Admin ID or Password."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* College Background Texture & Shapes */}
      <div className="auth-bg-decorations">
        <div className="decor-circle circle-1"></div>
        <div className="decor-circle circle-2"></div>
      </div>

      <div className="auth-card-wrapper">
        {/* College Header */}
        <div className="auth-header">
          <div className="college-crest-badge">
            <span className="crest-initials">PSNA</span>
          </div>
          <h1 className="auth-title">College Document Portal</h1>
          <p className="auth-subtitle">
            Secure, paperless official document requisitions with digital QR verification
          </p>
        </div>

        {/* Portal Role Selector Tabs */}
        <div className="role-tab-group">
          <button
            type="button"
            className={`role-tab-btn ${role === "student" ? "active" : ""}`}
            onClick={() => {
              setRole("student");
              setMessage(null);
            }}
          >
            <GraduationCap size={18} />
            <span>Student Portal</span>
          </button>

          <button
            type="button"
            className={`role-tab-btn ${role === "admin" ? "active" : ""}`}
            onClick={() => {
              setRole("admin");
              setMessage(null);
            }}
          >
            <Shield size={18} />
            <span>Staff / Admin</span>
          </button>
        </div>

        {/* Status Alert Banner */}
        {message && (
          <div className={`portal-alert alert-${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle2 size={18} className="alert-icon" />
            ) : (
              <AlertCircle size={18} className="alert-icon" />
            )}
            <span className="alert-text">{message.text}</span>
          </div>
        )}

        {/* STUDENT LOGIN FORM */}
        {role === "student" ? (
          <div className="auth-form-body">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="portal-form">
                <div className="form-group">
                  <label htmlFor="student-email" className="form-label">
                    Registered College Email ID
                  </label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="student-email"
                      type="email"
                      className="form-control"
                      placeholder="e.g. yourname@psnacet.edu.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <span className="field-hint">
                    Enter the official institutional email you registered with.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={loading}
                >
                  {loading ? "Sending One-Time Password..." : "Send Verification OTP"}
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="portal-form">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="email-display-pill">
                    <span>{email}</span>
                    <button
                      type="button"
                      className="btn-link text-xs"
                      onClick={() => setOtpSent(false)}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="otp-input" className="form-label">
                    Enter 6-Digit OTP
                  </label>
                  <div className="input-with-icon">
                    <KeyRound size={18} className="input-icon" />
                    <input
                      id="otp-input"
                      type="text"
                      className="form-control font-mono font-bold tracking-widest text-center"
                      maxLength={6}
                      placeholder="&bull; &bull; &bull; &bull; &bull; &bull;"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>

                  <div className="otp-resend-row">
                    <span className="text-muted text-xs">
                      OTP valid for 5 minutes. Didn&apos;t receive it?
                    </span>
                    <button
                      type="button"
                      className="btn-link text-xs font-semibold"
                      onClick={handleSendOtp}
                      disabled={resendTimer > 0 || loading}
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                    </button>
                  </div>

                  {backupOtp && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', textAlign: 'center', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                      <span>Institutional email delayed? Code: </span>
                      <strong style={{ color: '#1e3a8a', letterSpacing: '2px', fontSize: '13px' }}>{backupOtp}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={loading || otp.length < 6}
                >
                  {loading ? "Verifying..." : "Verify OTP & Enter Dashboard"}
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

            <div className="auth-footer-divider">
              <span>New to the portal?</span>
            </div>

            <Link to="/register" className="btn btn-outline btn-block">
              <GraduationCap size={18} />
              Register as New Student
            </Link>
          </div>
        ) : (
          /* ADMIN LOGIN FORM */
          <div className="auth-form-body">
            <form onSubmit={handleAdminLogin} className="portal-form">
              <div className="form-group">
                <label htmlFor="admin-id" className="form-label">
                  Admin Unique ID
                </label>
                <div className="input-with-icon">
                  <Shield size={18} className="input-icon" />
                  <input
                    id="admin-id"
                    type="text"
                    className="form-control"
                    placeholder="Enter Admin Unique ID"
                    value={adminUniqueId}
                    onChange={(e) => setAdminUniqueId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="admin-pass" className="form-label">
                  Administrative Password
                </label>
                <div className="input-with-icon">
                  <KeyRound size={18} className="input-icon" />
                  <input
                    id="admin-pass"
                    type="password"
                    className="form-control"
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={loading}
              >
                {loading ? "Authenticating Staff..." : "Sign In to Admin Console"}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        )}

        {/* Security & Authenticity Stamp */}
        <div className="portal-trust-footer">
          <Shield size={14} className="text-muted" />
          <span>Official Portal of PSNA College of Engineering and Technology</span>
        </div>
      </div>
    </div>
  );
}