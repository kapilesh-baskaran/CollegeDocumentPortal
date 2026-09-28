import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle,
  CheckCircle2,
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
  GraduationCap,
  FolderLock,
  Sun,
  Moon,
  RotateCcw,
  MessageSquare,
  Send,
  Copy,
  X
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

  // Dark / Light Theme Toggle
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("portal_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("portal_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Document Vault State
  const [vaultItems, setVaultItems] = useState([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);

  // 1-Click Re-Request State
  const [reRequestTarget, setReRequestTarget] = useState(null);
  const [reRequestPurpose, setReRequestPurpose] = useState("");
  const [reRequestDate, setReRequestDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  });
  const [submittingReRequest, setSubmittingReRequest] = useState(false);
  const [reRequestFeedback, setReRequestFeedback] = useState(null);

  // Requisition Query / Clarification Chat State
  const [chatRequest, setChatRequest] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);

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

  const fetchVault = useCallback(async () => {
    try {
      setLoadingVault(true);
      const res = await api.get("/students/vault");
      setVaultItems(res.data?.vault || []);
    } catch (err) {
      console.warn("Failed to load vault:", err);
    } finally {
      setLoadingVault(false);
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
    fetchVault();
    fetchNotifications();
  }, [navigate, fetchProfile, fetchRequests, fetchVault, fetchNotifications]);

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const openReRequestModal = (req) => {
    setReRequestTarget(req);
    setReRequestPurpose(req.purpose || "Academic Re-enrollment / Term Renewal");
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setReRequestDate(d.toISOString().split("T")[0]);
    setReRequestFeedback(null);
  };

  const handleConfirmReRequest = async (e) => {
    e.preventDefault();
    if (!reRequestTarget) return;

    try {
      setSubmittingReRequest(true);
      setReRequestFeedback(null);

      await api.post("/students/requests/re-request", {
        previousRequestId: reRequestTarget.id,
        purpose: reRequestPurpose.trim(),
        requiredBy: reRequestDate
      });

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      setReRequestFeedback({
        type: "success",
        text: "Renewal request submitted successfully!"
      });

      await fetchRequests();
      await fetchVault();

      setTimeout(() => {
        setReRequestTarget(null);
        setActiveTab("requests");
      }, 1200);
    } catch (err) {
      setReRequestFeedback({
        type: "error",
        text: err.response?.data?.message || "Failed to submit renewal request."
      });
    } finally {
      setSubmittingReRequest(false);
    }
  };

  const openChatModal = async (req) => {
    setChatRequest(req);
    setChatMessages([]);
    setChatInput("");
    try {
      setLoadingChat(true);
      const res = await api.get(`/students/requests/${req.id}/messages`);
      setChatMessages(res.data?.messages || []);
    } catch (err) {
      console.warn("Failed to load chat messages:", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatRequest || sendingChat) return;

    try {
      setSendingChat(true);
      const text = chatInput.trim();
      setChatInput("");
      const res = await api.post(`/students/requests/${chatRequest.id}/messages`, {
        message: text
      });
      if (res.data?.message) {
        setChatMessages((prev) => [...prev, res.data.message]);
      }
    } catch (err) {
      console.error("Failed to post message:", err);
    } finally {
      setSendingChat(false);
    }
  };
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
      <header className="portal-navbar glass-navbar">
        <div className="navbar-left">
          <div className="navbar-logo-badge">
            <img src="/psna-logo.png" alt="PSNA College Logo" className="navbar-college-logo" />
          </div>
          <div>
            <h2 className="navbar-brand-title">College Document Portal</h2>
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

          {/* Dark / Light Mode Toggle */}
          <button
            className="btn-icon theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            style={{ marginRight: "4px" }}
          >
            {theme === "dark" ? <Sun size={19} className="text-amber" /> : <Moon size={19} />}
          </button>

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
              className={`dash-tab-btn ${activeTab === "vault" ? "active" : ""}`}
              onClick={() => setActiveTab("vault")}
            >
              <FolderLock size={17} />
              <span>Document Vault {vaultItems.length > 0 && `(${vaultItems.length})`}</span>
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
                                <Eye size={14} /> Preview
                              </button>

                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => openReRequestModal(req)}
                                title="Re-request for next semester or academic renewal"
                              >
                                <RotateCcw size={14} /> Re-Request
                              </button>

                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => openChatModal(req)}
                                title="Clarification chat with administration"
                              >
                                <MessageSquare size={14} /> Chat
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

                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => openChatModal(req)}
                                title="Clarification chat with administration"
                              >
                                <MessageSquare size={14} /> Clarification Chat
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

          {/* TAB: DOCUMENT VAULT / ACADEMIC LOCKER */}
          {activeTab === "vault" && (
            <div className="tab-content-fade">
              <div className="applicant-summary-box mb-4" style={{ background: "rgba(30, 58, 138, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FolderLock size={22} className="text-primary" />
                      <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>My Academic Document Vault</h2>
                    </div>
                    <p className="text-muted text-sm" style={{ margin: "4px 0 0 0" }}>
                      Your permanent, secure repository of verified and authorized college documents.
                      Protected by cryptographic SHA-256 signatures and QR verification.
                    </p>
                  </div>
                  <div>
                    <span className="badge badge-accent font-mono" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                      {vaultItems.length} Authorized Document{vaultItems.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>

              {loadingVault ? (
                <div className="card loading-state">
                  <div className="spinner"></div>
                  <p>Unlocking your academic vault...</p>
                </div>
              ) : vaultItems.length === 0 ? (
                <div className="empty-state-card">
                  <FolderLock size={48} className="empty-icon text-muted" />
                  <h3>Your Document Vault is Empty</h3>
                  <p className="text-muted">
                    Once your document requests are approved and finalized by the administration,
                    they will automatically appear in this permanent locker for 1-click access anytime.
                  </p>
                  <button className="btn btn-primary mt-3" onClick={() => setActiveTab("new-request")}>
                    <PlusCircle size={16} /> Request a Document
                  </button>
                </div>
              ) : (
                <div className="vault-grid">
                  {vaultItems.map((item) => (
                    <div key={item.id} className="vault-card glass-card">
                      <div className="vault-card-header">
                        <div>
                          <span className="badge badge-accent mb-1" style={{ fontSize: "0.7rem" }}>
                            <ShieldCheck size={12} style={{ display: "inline", marginRight: "4px" }} /> Authorized Copy
                          </span>
                          <h3 className="vault-doc-type" style={{ margin: "4px 0 2px 0" }}>{item.document_type}</h3>
                          <span className="vault-ref">Ref: {item.request_id}</span>
                        </div>
                        <span className="status-badge status-ready">
                          <CheckCircle2 size={13} /> Active
                        </span>
                      </div>

                      <div className="vault-card-body">
                        <div className="vault-meta-row">
                          <span>Purpose:</span>
                          <span className="font-semibold text-dark" style={{ textAlign: "right" }}>{item.purpose}</span>
                        </div>
                        <div className="vault-meta-row">
                          <span>Issued Date:</span>
                          <span className="font-medium">
                            {new Date(item.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        {item.scan_count !== undefined && (
                          <div className="vault-meta-row">
                            <span>Verifications:</span>
                            <span className="font-semibold text-primary">{item.scan_count || 0} scan(s)</span>
                          </div>
                        )}

                        {item.verification_hash && (
                          <div style={{ marginTop: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                              <span>SHA-256 Fingerprint:</span>
                              <button
                                type="button"
                                className="btn-link text-xs"
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: 0 }}
                                onClick={() => handleCopyHash(item.verification_hash)}
                              >
                                {copiedHash === item.verification_hash ? (
                                  <span className="text-success" style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                    <Check size={11} /> Copied
                                  </span>
                                ) : (
                                  <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                    <Copy size={11} /> Copy Hash
                                  </span>
                                )}
                              </button>
                            </div>
                            <div className="vault-hash-strip">
                              {item.verification_hash}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="vault-card-actions">
                        <button
                          className="btn btn-success btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => handleDirectDownload(item)}
                        >
                          <Download size={14} /> Download PDF
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setPreviewRequest(item)}
                          title="Preview Certificate"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => openReRequestModal(item)}
                          title="Re-request for next semester"
                        >
                          <RotateCcw size={14} /> Re-Request
                        </button>
                        <a
                          href={`/verify/${item.request_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm text-primary"
                          title="Public Verification"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
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

      {/* 1-CLICK RE-REQUEST MODAL */}
      {reRequestTarget && (
        <div className="modal-backdrop" onClick={() => setReRequestTarget(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="badge badge-accent">1-Click Semester Renewal</span>
                <h3>Re-Request Document</h3>
                <p className="text-muted text-xs font-mono">{reRequestTarget.request_id}</p>
              </div>
              <button className="btn-close" onClick={() => setReRequestTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReRequest}>
              <div className="modal-body">
                {reRequestFeedback && (
                  <div className={`portal-alert alert-${reRequestFeedback.type}`}>
                    {reRequestFeedback.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <span>{reRequestFeedback.text}</span>
                  </div>
                )}

                <div className="applicant-summary-box" style={{ marginTop: 0, marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Document Type to Re-issue
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary-navy)", marginTop: "4px" }}>
                    {reRequestTarget.document_type}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Issuing to: {student?.name} ({student?.register_no}) &bull; {student?.department}
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="rereq-purpose">
                    Purpose for New Semester / Period *
                  </label>
                  <input
                    id="rereq-purpose"
                    type="text"
                    className="form-control"
                    value={reRequestPurpose}
                    onChange={(e) => setReRequestPurpose(e.target.value)}
                    placeholder="e.g. Next Semester Fee Loan, Passport Renewal, etc."
                    required
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="rereq-date">
                    Target Date Required *
                  </label>
                  <div className="input-with-icon">
                    <Calendar size={18} className="input-icon" />
                    <input
                      id="rereq-date"
                      type="date"
                      className="form-control"
                      min={getMinDate()}
                      value={reRequestDate}
                      onChange={(e) => setReRequestDate(e.target.value)}
                      required
                    />
                  </div>
                  <span className="field-hint">
                    Standard college processing requires a 5-day lead time.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReRequestTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingReRequest}>
                  {submittingReRequest ? "Submitting..." : "Submit Re-Request"}
                  <RotateCcw size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLARIFICATION CHAT MODAL */}
      {chatRequest && (
        <div className="modal-backdrop" onClick={() => setChatRequest(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="badge badge-accent">Direct Query Thread</span>
                <h3>Office Clarification Chat</h3>
                <p className="text-muted text-xs font-mono">
                  {chatRequest.document_type} &bull; {chatRequest.request_id}
                </p>
              </div>
              <button className="btn-close" onClick={() => setChatRequest(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {loadingChat ? (
                <div className="loading-state" style={{ padding: "40px 0" }}>
                  <div className="spinner"></div>
                  <p className="text-xs text-muted" style={{ marginTop: "10px" }}>Loading query thread...</p>
                </div>
              ) : (
                <div className="chat-thread-container">
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                      <MessageSquare size={36} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
                      <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>No messages yet on this request.</p>
                      <p style={{ fontSize: "0.78rem" }}>
                        Have questions or corrections from the college administration? Send a message below.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((m) => {
                      const isStudent = m.sender_role === "student";
                      return (
                        <div
                          key={m.id}
                          className={`chat-msg ${isStudent ? "msg-student" : "msg-admin"}`}
                        >
                          <span className="chat-msg-sender">
                            {isStudent ? "You" : m.sender_name || "Administration"}
                          </span>
                          <div>{m.message}</div>
                          <span className="chat-msg-time">
                            {new Date(m.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <form onSubmit={handleSendChatMessage} className="chat-input-row">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type your message or clarification here..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={sendingChat}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sendingChat || !chatInput.trim()}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: "44px" }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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