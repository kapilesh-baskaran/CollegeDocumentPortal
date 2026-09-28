import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Calendar, BookOpen, Hash, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import api from "../services/api";

const DEPARTMENTS = [
  "Information Technology",
  "Computer Science and Engineering",
  "Artificial Intelligence and Data Science",
  "Electronics and Communication Engineering",
  "Electrical and Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Biomedical Engineering",
  "Computer Science and Business Systems"
];

export default function StudentRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    year: "1",
    department: "Information Technology",
    section: "A",
    registerNo: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.registerNo) {
      setMessage({ type: "error", text: "Please fill in all required academic fields." });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      // 1. Register student details
      await api.post("/students/register", formData);

      // 2. Trigger OTP to verify college email
      const otpRes = await api.post("/students/send-otp", {
        email: formData.email.trim(),
        isRegistration: true
      });

      if (otpRes.data?.otp) {
        localStorage.setItem("latestOtp", otpRes.data.otp);
      }

      // Save registration state to localStorage for the OTP screen
      localStorage.setItem("studentRegistration", JSON.stringify(formData));

      setMessage({
        type: "success",
        text: "Account registered! An OTP has been dispatched to your email."
      });

      setTimeout(() => {
        navigate("/verify-otp");
      }, 700);

    } catch (error) {
      console.error("Student registration error:", error);
      const errorMsg =
        error.response?.data?.message ||
        (!error.response
          ? "Unable to reach server. Please check your backend status or network connection."
          : "Registration failed. Please check your details.");
      setMessage({
        type: "error",
        text: errorMsg
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

      <div className="auth-card-wrapper registration-card-wrapper glass-card animate-fadeInUp">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <img src="/psna-logo.png" alt="PSNA College of Engineering & Technology" className="auth-college-logo" />
          </div>
          <h1 className="auth-title">Student Registration</h1>
          <p className="auth-subtitle">
            Provide your authentic college academic records to create your document requisition account
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

        <form onSubmit={handleSubmit} className="portal-form register-grid-form">
          {/* Full Name */}
          <div className="form-group span-2">
            <label className="form-label" htmlFor="name">
              Full Legal Name (as in College Records) *
            </label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="name"
                type="text"
                name="name"
                className="form-control"
                placeholder="e.g. Kapilesh B"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* College Email */}
          <div className="form-group span-2">
            <label className="form-label" htmlFor="email">
              College Email ID *
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                name="email"
                className="form-control"
                placeholder="e.g. yourname@psnacet.edu.in"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <span className="field-hint">A 6-digit OTP will be sent to this email for verification.</span>
          </div>

          {/* Register Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="registerNo">
              College Register / Roll Number *
            </label>
            <div className="input-with-icon">
              <Hash size={18} className="input-icon" />
              <input
                id="registerNo"
                type="text"
                name="registerNo"
                className="form-control font-mono font-bold"
                placeholder="e.g. 2403921320521068"
                value={formData.registerNo}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Academic Year */}
          <div className="form-group">
            <label className="form-label" htmlFor="year">
              Current Academic Year *
            </label>
            <div className="input-with-icon">
              <Calendar size={18} className="input-icon" />
              <select
                id="year"
                name="year"
                className="form-control form-select"
                value={formData.year}
                onChange={handleChange}
                required
              >
                <option value="1">1st Year (Freshman)</option>
                <option value="2">2nd Year (Sophomore)</option>
                <option value="3">3rd Year (Junior)</option>
                <option value="4">4th Year (Senior / Final)</option>
              </select>
            </div>
          </div>

          {/* Department */}
          <div className="form-group">
            <label className="form-label" htmlFor="department">
              Academic Department *
            </label>
            <div className="input-with-icon">
              <BookOpen size={18} className="input-icon" />
              <select
                id="department"
                name="department"
                className="form-control form-select"
                value={formData.department}
                onChange={handleChange}
                required
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section */}
          <div className="form-group">
            <label className="form-label" htmlFor="section">
              Section *
            </label>
            <select
              id="section"
              name="section"
              className="form-control form-select"
              value={formData.section}
              onChange={handleChange}
              required
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div className="span-2 form-actions-wrap">
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? "Registering & Sending OTP..." : "Proceed to Email OTP Verification"}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        <div className="auth-footer-divider">
          <span>Already registered?</span>
        </div>

        <Link to="/login" className="btn btn-outline btn-block">
          <ArrowLeft size={16} /> Return to Portal Login
        </Link>
      </div>
    </div>
  );
}