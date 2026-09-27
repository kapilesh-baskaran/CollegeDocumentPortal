import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  PlusCircle,
  Bell,
  LogOut,
  Building2,
  Calendar,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Search,
  Check,
  ChevronRight,
  ShieldCheck,
  Bus,
  Home,
  GraduationCap
} from "lucide-react";
import api from "../services/api";
import DocumentModal from "../components/DocumentModal";
import { generateCollegeDocumentPdf } from "../utils/generatePdf";
import confetti from "canvas-confetti";

const DOCUMENT_OPTIONS = [
  {
    type: "Bonafide Certificate",
    icon: GraduationCap,
    desc: "Certifies enrollment, good conduct & student status for bank loans, passport, or scholarships.",
    color: "blue"
  },
  {
    type: "Fee Structure",
    icon: FileText,
    desc: "Official certified academic year tuition fee, lab, and special fee schedule for loans or subsidies.",
    color: "amber"
  },
  {
    type: "Bus Fee Structure",
    icon: Bus,
    desc: "Certified institutional transport routes and annual bus pass fee schedule for day scholars.",
    color: "emerald"
  },
  {
    type: "Hostel Fee Structure",
    icon: Home,
    desc: "Certified boarding, lodging, mess charges, and caution deposit breakdown for residential students.",
    color: "indigo"
  }
];

const COMMON_PURPOSES = [
  "Education Loan Processing",
  "Passport / Visa Application",
  "National / State Scholarship Application",
  "Industry Internship & Training",
  "Higher Studies / Competitive Exam",
  "Bank Account Opening",
  "Other Requisition"
];

export default function StudentDashboard() {
  const navigate = useNavigate();

  // Student Profile
  const [student, setStudent] = useState(() => {
    return JSON.parse(localStorage.getItem("student") || "null");
  });

  // Active View Tab: "requests" | "new-request" | "notifications"
  const [activeTab, setActiveTab] = useState("requests");

  // Requests Data
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestFilter, setRequestFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to calculate minimum date: today + 5 days
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  };

  // New Request Form State
  const [selectedDocType, setSelectedDocType] = useState("Bonafide Certificate");
  const [purposeOption, setPurposeOption] = useState("Education Loan Processing");
  const [customPurpose, setCustomPurpose] = useState("");
  const [requiredBy, setRequiredBy] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  });
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Document Preview Modal State
  const [previewRequest, setPreviewRequest] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/students/me");
      if (res.data?.student) {
        setStudent(res.data.student);
        localStorage.setItem("student", JSON.stringify(res.data.student));
      }
    } catch (err) {
      console.warn("Profile fetch fallback:", err.message);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get("/students/my-requests");
      setRequests(res.data?.requests || []);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/students/notifications");
      const list = res.data?.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch (err) {
      console.warn("Failed to load notifications:", err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("studentToken");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchProfile();
    fetchRequests();
    fetchNotifications();
  }, [navigate, fetchProfile, fetchRequests, fetchNotifications]);
  const handleMarkAllRead = async () => {
    try {
      await api.put("/students/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("student");
    navigate("/login");
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    const finalPurpose =
      purposeOption === "Other Requisition" ? customPurpose.trim() : purposeOption;

    if (!finalPurpose) {
      setFormFeedback({ type: "error", text: "Please enter the purpose for this document." });
      return;
    }

    if (!requiredBy) {
      setFormFeedback({ type: "error", text: "Please select your required-by date." });
      return;
    }

    try {
      setSubmitting(true);
      setFormFeedback(null);

      const res = await api.post("/documents/request", {
        documentType: selectedDocType,
        purpose: finalPurpose,
        requiredBy
      });

      // Trigger celebratory confetti
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      setFormFeedback({
        type: "success",
        text: `Request submitted! Tracking ID: ${res.data.request.request_id}`
      });

      // Refresh data
      await fetchRequests();
      await fetchNotifications();

      // Switch to tracking tab after brief delay
      setTimeout(() => {
        setActiveTab("requests");
        setFormFeedback(null);
      }, 1400);

    } catch (err) {
      setFormFeedback({
        type: "error",
        text: err.response?.data?.message || "Failed to submit request. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectDownload = async (req) => {
    try {
      const pdf = await generateCollegeDocumentPdf({
        requestId: req.request_id,
        documentType: req.document_type,
        purpose: req.purpose,
        student: student || {
          name: req.name,
          register_no: req.register_no,
          department: req.department,
          year: req.year,
          section: req.section
        }
      });
      const safeName = req.document_type.replace(/\s+/g, "_");
      pdf.save(`College_${safeName}_${req.request_id}.pdf`);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download PDF. Please try previewing the document.");
    }
  };

  const getOrdinalYear = (year) => {
    const y = parseInt(year, 10);
    if (y === 1) return "1st";
    if (y === 2) return "2nd";
    if (y === 3) return "3rd";
    if (y === 4) return "4th";
    return `${year || "Current"}`;
  };

  // Status helper mapping
  const getStatusBadge = (status) => {
    switch (status) {
      case "Document Ready":
        return <span className="status-badge status-ready"><CheckCircle size={13} /> Document Ready</span>;
      case "Approved":
        return <span className="status-badge status-approved"><Check size={13} /> Approved</span>;
      case "Under Verification":
        return <span className="status-badge status-verifying"><Clock size={13} /> Under Verification</span>;
      case "Correction Required":
        return <span className="status-badge status-correction"><AlertTriangle size={13} /> Correction Needed</span>;
      case "Rejected":
        return <span className="status-badge status-rejected">Rejected</span>;
      default:
        return <span className="status-badge status-submitted"><Clock size={13} /> Submitted</span>;
    }
  };

  // Step tracker mapping
  const getStepProgress = (status) => {
    const steps = [
      { key: "Submitted", label: "Submitted" },
      { key: "Under Verification", label: "Verification" },
      { key: "Approved", label: "Approval" },
      { key: "Document Ready", label: "Ready to Download" }
    ];

    let activeIndex = 0;
    if (status === "Under Verification") activeIndex = 1;
    if (status === "Approved") activeIndex = 2;
    if (status === "Document Ready") activeIndex = 3;
    if (status === "Rejected" || status === "Correction Required") activeIndex = -1;

    return { steps, activeIndex, isSpecial: status === "Rejected" || status === "Correction Required" };
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchesFilter =
      requestFilter === "All"
        ? true
        : requestFilter === "Ready"
        ? r.status === "Document Ready"
        : requestFilter === "Pending"
        ? ["Submitted", "Under Verification", "Approved"].includes(r.status)
        : r.status === requestFilter;

    const matchesSearch =
      ((r.document_type || "") + " " + (r.request_id || "") + " " + (r.purpose || ""))
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const totalReady = (requests || []).filter((r) => r.status === "Document Ready").length;
  const totalPending = (requests || []).filter((r) => ["Submitted", "Under Verification", "Approved"].includes(r.status)).length;

  const studentData = student || {
    name: "Kapilesh B",
    register_no: "2403921320521068",
    department: "Information Technology",
    year: 3,
    section: "B",
    email: "kapileshb24it@psnacet.edu.in"
  };

  return (
    <div className="portal-layout">
      {/* Top Navigation Bar */}
      <header className="portal-navbar">
        <div className="navbar-left">
          <div className="navbar-brand-badge">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="navbar-brand-title">PSNA College Document Portal</h2>
            <span className="navbar-brand-sub">Student Self-Service Requisition System</span>
          </div>
        </div>

        <div className="navbar-right">
          {/* Notifications Bell */}
          <div className="notif-dropdown-wrapper">
            <button
              className="btn-icon notif-bell-btn"
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {showNotifMenu && (
              <div className="notif-dropdown-menu">
                <div className="notif-menu-header">
                  <span className="font-semibold text-sm">Notifications ({notifications.length})</span>
                  {unreadCount > 0 && (
                    <button className="btn-link text-xs" onClick={handleMarkAllRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="notif-menu-list">
                  {notifications.length === 0 ? (
                    <div className="empty-notif">No notifications yet.</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`notif-item ${!n.is_read ? "unread" : ""}`}>
                        <div className="notif-item-title">{n.title}</div>
                        <div className="notif-item-msg">{n.message}</div>
                        <div className="notif-item-time">
                          {new Date(n.created_at).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short"
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Student Profile Chip */}
          <div className="user-profile-chip">
            <div className="avatar-initials">
              {studentData.name?.charAt(0) || "S"}
            </div>
            <div className="user-profile-meta">
              <span className="user-profile-name">{studentData.name}</span>
              <span className="user-profile-sub font-mono">{studentData.register_no}</span>
            </div>
          </div>

          <button className="btn btn-outline-white btn-sm" onClick={handleLogout} title="Sign Out">
            <LogOut size={15} />
            <span className="hide-mobile">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="portal-main">
        <div className="dashboard-container">
          {/* Student Academic Info Banner */}
          <section className="student-profile-banner">
            <div className="banner-details">
              <span className="badge badge-accent">Enrolled Student</span>
              <h1 className="banner-name">{studentData.name}</h1>
              <div className="banner-academic-tags">
                <span className="academic-tag">
                  <strong>Register No:</strong> {studentData.register_no}
                </span>
                <span className="academic-tag">
                  <strong>Department:</strong> {studentData.department}
                </span>
                <span className="academic-tag">
                  <strong>Year:</strong> {getOrdinalYear(studentData.year)} Year (Sec {studentData.section})
                </span>
                <span className="academic-tag">
                  <strong>Email:</strong> {studentData.email}
                </span>
              </div>
            </div>

            {/* Quick KPI Stats */}
            <div className="banner-kpis">
              <div className="kpi-card" onClick={() => { setActiveTab("requests"); setRequestFilter("All"); }}>
                <span className="kpi-val">{requests.length}</span>
                <span className="kpi-lbl">Total Requests</span>
              </div>
              <div className="kpi-card" onClick={() => { setActiveTab("requests"); setRequestFilter("Pending"); }}>
                <span className="kpi-val text-amber">{totalPending}</span>
                <span className="kpi-lbl">In Verification</span>
              </div>
              <div className="kpi-card kpi-highlight" onClick={() => { setActiveTab("requests"); setRequestFilter("Ready"); }}>
                <span className="kpi-val text-success">{totalReady}</span>
                <span className="kpi-lbl">Ready to Download</span>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="dashboard-nav-tabs">
            <button
              className={`dash-tab-btn ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              <FileText size={17} />
              <span>Track Requests &amp; History ({requests.length})</span>
            </button>

            <button
              className={`dash-tab-btn ${activeTab === "new-request" ? "active" : ""}`}
              onClick={() => setActiveTab("new-request")}
            >
              <PlusCircle size={17} />
              <span>Submit New Document Request</span>
            </button>

            <button
              className={`dash-tab-btn ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
              <Bell size={17} />
              <span>Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
            </button>
          </div>

          {/* TAB 1: TRACK REQUESTS & HISTORY */}
          {activeTab === "requests" && (
            <div className="tab-content-fade">
              {/* Search & Filter Toolbar */}
              <div className="dash-toolbar">
                <div className="search-input-wrap">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by Document Type, Request ID, or Purpose..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filter-chips">
                  {["All", "Ready", "Pending", "Under Verification", "Approved", "Correction Required"].map((f) => (
                    <button
                      key={f}
                      className={`filter-chip ${requestFilter === f ? "active" : ""}`}
                      onClick={() => setRequestFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requests List */}
              {loadingRequests ? (
                <div className="card loading-state">
                  <div className="spinner"></div>
                  <p>Loading your document requisitions...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="empty-state-card">
                  <FileText size={48} className="empty-icon text-muted" />
                  <h3>No Document Requests Found</h3>
                  <p className="text-muted">
                    {searchQuery || requestFilter !== "All"
                      ? "No requests match your selected filters. Try clearing the search."
                      : "You haven't requested any official documents yet."}
                  </p>
                  <button className="btn btn-primary mt-3" onClick={() => setActiveTab("new-request")}>
                    <PlusCircle size={16} /> Submit Your First Request
                  </button>
                </div>
              ) : (
                <div className="requests-grid">
                  {filteredRequests.map((req) => {
                    const progress = getStepProgress(req.status);
                    const isReady = req.status === "Document Ready";

                    return (
                      <div key={req.id} className={`request-card ${isReady ? "card-ready-glow" : ""}`}>
                        {/* Card Header */}
                        <div className="request-card-header">
                          <div className="req-type-group">
                            <span className="doc-icon-badge">
                              {req.document_type === "Bonafide Certificate" && <GraduationCap size={18} />}
                              {req.document_type === "Fee Structure" && <FileText size={18} />}
                              {req.document_type === "Bus Fee Structure" && <Bus size={18} />}
                              {req.document_type === "Hostel Fee Structure" && <Home size={18} />}
                            </span>
                            <div>
                              <h3 className="req-doc-title">{req.document_type}</h3>
                              <span className="req-id font-mono">Ref: {req.request_id}</span>
                            </div>
                          </div>
                          <div>{getStatusBadge(req.status)}</div>
                        </div>

                        {/* Request Meta info */}
                        <div className="req-meta-grid">
                          <div className="meta-item">
                            <span className="meta-lbl">Purpose</span>
                            <span className="meta-val">{req.purpose}</span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-lbl">Submitted On</span>
                            <span className="meta-val">
                              {new Date(req.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-lbl">Required By</span>
                            <span className="meta-val font-semibold">
                              <Calendar size={13} className="icon-inline text-muted" />{" "}
                              {new Date(req.required_by).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Status Pipeline Step Tracker */}
                        <div className="step-tracker-wrap">
                          <div className="step-tracker-title">Workflow Progress:</div>
                          <div className="steps-row">
                            {progress.steps.map((st, idx) => {
                              const isComplete = !progress.isSpecial && idx <= progress.activeIndex;
                              const isCurrent = !progress.isSpecial && idx === progress.activeIndex;

                              return (
                                <div
                                  key={st.key}
                                  className={`step-col ${isComplete ? "step-done" : ""} ${
                                    isCurrent ? "step-active" : ""
                                  }`}
                                >
                                  <div className="step-dot">
                                    {isComplete ? <Check size={11} /> : idx + 1}
                                  </div>
                                  <span className="step-lbl">{st.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Admin Remarks Notice (if any) */}
                        {req.admin_remarks && (
                          <div className={`remarks-banner ${req.status === "Correction Required" ? "remarks-alert" : ""}`}>
                            <span className="remarks-author">Office Remarks:</span>
                            <p className="remarks-text">{req.admin_remarks}</p>
                          </div>
                        )}

                        {/* Card Actions */}
                        <div className="request-card-footer">
                          {isReady ? (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleDirectDownload(req)}
                              >
                                <Download size={14} /> Download PDF
                              </button>

                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setPreviewRequest(req)}
                              >
                                <Eye size={14} /> Preview Certificate
                              </button>

                              <a
                                href={`/verify/${req.request_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-sm text-primary"
                              >
                                <ShieldCheck size={14} /> Verify QR <ExternalLink size={11} />
                              </a>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setPreviewRequest(req)}
                              >
                                <Eye size={14} /> Preview Request Draft
                              </button>
                              <span className="text-muted text-xs">
                                PDF Download will unlock once marked &quot;Document Ready&quot;.
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NEW REQUEST FORM */}
          {activeTab === "new-request" && (
            <div className="tab-content-fade">
              <div className="form-card-container">
                <div className="form-card-header">
                  <div className="header-icon-wrap">
                    <Sparkles size={22} className="text-primary" />
                  </div>
                  <div>
                    <h2>Submit Official Document Request</h2>
                    <p className="text-muted text-sm">
                      Choose your required college document, specify your genuine purpose, and select
                      your deadline.
                    </p>
                  </div>
                </div>

                {formFeedback && (
                  <div className={`portal-alert alert-${formFeedback.type}`}>
                    {formFeedback.type === "success" ? (
                      <CheckCircle size={18} className="alert-icon" />
                    ) : (
                      <AlertTriangle size={18} className="alert-icon" />
                    )}
                    <span className="alert-text">{formFeedback.text}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitRequest} className="portal-form doc-request-form">
                  {/* Step 1: Select Document Type */}
                  <div className="form-section-title">
                    <span>1. Select Official Document Type</span>
                  </div>

                  <div className="doc-type-selector-grid">
                    {DOCUMENT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = selectedDocType === opt.type;

                      return (
                        <div
                          key={opt.type}
                          className={`doc-type-card ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedDocType(opt.type)}
                        >
                          <div className={`doc-icon-pill doc-icon-${opt.color}`}>
                            <Icon size={22} />
                          </div>
                          <div className="doc-card-details">
                            <h4 className="doc-card-title">{opt.type}</h4>
                            <p className="doc-card-desc">{opt.desc}</p>
                          </div>
                          <div className="doc-card-radio">
                            <div className={`radio-dot ${isSelected ? "checked" : ""}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Step 2: Select Purpose */}
                  <div className="form-section-title mt-4">
                    <span>2. Purpose of Requisition</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="purpose-select">
                      Official Purpose *
                    </label>
                    <select
                      id="purpose-select"
                      className="form-control form-select"
                      value={purposeOption}
                      onChange={(e) => setPurposeOption(e.target.value)}
                      required
                    >
                      {COMMON_PURPOSES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {purposeOption === "Other Requisition" && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="custom-purpose">
                        Specify Purpose in Detail *
                      </label>
                      <input
                        id="custom-purpose"
                        type="text"
                        className="form-control"
                        placeholder="e.g. Visa interview at US Consulate, Chennai"
                        value={customPurpose}
                        onChange={(e) => setCustomPurpose(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {/* Step 3: Required-by Date */}
                  <div className="form-section-title mt-4">
                    <span>3. Target Date Needed</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="required-date">
                      Required By Date *
                    </label>
                    <div className="input-with-icon">
                      <Calendar size={18} className="input-icon" />
                      <input
                        id="required-date"
                        type="date"
                        className="form-control"
                        min={getMinDate()}
                        value={requiredBy}
                        onChange={(e) => setRequiredBy(e.target.value)}
                        required
                      />
                    </div>
                    <div className="policy-note-badge">
                      <HelpCircle size={14} />
                      <span>
                        College administrative policy requires a minimum processing window of{" "}
                        <strong>5 working days</strong> from submission date.
                      </span>
                    </div>
                  </div>

                  {/* Confirm Student Details Summary */}
                  <div className="applicant-summary-box">
                    <span className="font-semibold text-xs text-muted uppercase">
                      Document Will Be Issued To:
                    </span>
                    <div className="applicant-row">
                      <span>
                        <strong>{student?.name}</strong> ({student?.register_no})
                      </span>
                      <span>
                        {student?.department} &bull; {getOrdinalYear(student?.year)} Year &bull; Sec{" "}
                        {student?.section}
                      </span>
                    </div>
                  </div>

                  <div className="form-actions mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg btn-block"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting Official Request..." : "Submit Document Request"}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="tab-content-fade">
              <div className="card notifications-card">
                <div className="card-header">
                  <div className="card-header-left">
                    <Bell size={20} className="text-primary" />
                    <h3>Portal Notifications</h3>
                  </div>
                  {unreadCount > 0 && (
                    <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="notifications-full-list">
                  {notifications.length === 0 ? (
                    <div className="empty-state-card">
                      <Bell size={40} className="text-muted empty-icon" />
                      <h4>No Notifications</h4>
                      <p className="text-muted">
                        You&apos;ll be notified here whenever administrative staff updates the status of your
                        requests.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`notification-row ${!n.is_read ? "unread" : ""}`}>
                        <div className="notif-bullet" />
                        <div className="notif-content-wrap">
                          <div className="notif-title-row">
                            <span className="notif-main-title">{n.title}</span>
                            <span className="notif-time-ago">
                              {new Date(n.created_at).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short"
                              })}
                            </span>
                          </div>
                          <p className="notif-body-text">{n.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Document Preview & Download Modal */}
      {previewRequest && (
        <DocumentModal
          isOpen={Boolean(previewRequest)}
          onClose={() => setPreviewRequest(null)}
          request={previewRequest}
          student={student}
        />
      )}
    </div>
  );
}