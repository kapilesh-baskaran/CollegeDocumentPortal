import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KeyRound, Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import api from "../services/api";

export default function VerifyOTP() {
  const navigate = useNavigate();

  const registrationData = JSON.parse(localStorage.getItem("studentRegistration") || "null");

  const [email, setEmail] = useState(registrationData?.email || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [backupOtp, setBackupOtp] = useState(localStorage.getItem("latestOtp") || "");

  useEffect(() => {
    if (!email) {
      setMessage({
        type: "error",
        text: "No email found from registration. Please enter your registered email address."
      });
    }
  }, [email]);

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

  const handleResend = async () => {
    if (!email) return;
    try {
      setLoading(true);
      setMessage(null);
      const res = await api.post("/students/send-otp", {
        email: email.trim(),
        isRegistration: true
      });
      if (res.data?.otp) {
        setBackupOtp(res.data.otp);
        localStorage.setItem("latestOtp", res.data.otp);
      }
      setMessage({ type: "success", text: "New OTP has been dispatched to your email." });
      startCooldown();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to resend OTP. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !otp) {
      setMessage({ type: "error", text: "Please enter your email and 6-digit OTP." });
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

      setMessage({ type: "success", text: "OTP verified successfully! Logging you in..." });

      setTimeout(() => {
        navigate("/student-dashboard");
      }, 500);

    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "OTP verification failed. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-bg-decorations">
        <div className="decor-circle circle-1"></div>
        <div className="decor-circle circle-2"></div>
        <div className="decor-circle circle-3"></div>
      </div>

      <div className="auth-card-wrapper glass-card animate-fadeInUp">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <img src="/psna-logo.png" alt="PSNA College of Engineering & Technology" className="auth-college-logo" />
          </div>
          <h1 className="auth-title">Verify Email OTP</h1>
          <p className="auth-subtitle">
            Enter the 6-digit authentication code sent to your registered college email
          </p>
        </div>

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

        <form onSubmit={handleVerify} className="portal-form">
          <div className="form-group">
            <label className="form-label" htmlFor="verify-email">
              College Email ID
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="verify-email"
                type="email"
                className="form-control"
                placeholder="e.g. student@psnacet.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="otp-box">
              Enter 6-Digit OTP Code
            </label>
            <div className="input-with-icon">
              <KeyRound size={18} className="input-icon" />
              <input
                id="otp-box"
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
              <span className="text-muted text-xs">Didn&apos;t receive code?</span>
              <button
                type="button"
                className="btn-link text-xs font-semibold"
                onClick={handleResend}
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
            {loading ? "Validating OTP..." : "Verify OTP & Continue to Portal"}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer-divider">
          <span>Need to start over?</span>
        </div>

        <Link to="/login" className="btn btn-outline btn-block">
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </div>
    </div>
  );
}