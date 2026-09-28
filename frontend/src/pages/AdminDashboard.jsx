import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileCheck,
  Eye,
  LogOut,
  Calendar,
  AlertCircle,
  X,
  Send,
  Layers,
  GraduationCap,
  Bus,
  Home,
  FileText,
  Download,
  Sun,
  Moon,
  Settings,
  MessageSquare,
  CheckSquare,
  Square
} from "lucide-react";
import api from "../services/api";
import DocumentModal from "../components/DocumentModal";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [admin] = useState(() => {
    return JSON.parse(localStorage.getItem("admin") || "null");
  });

  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    underVerification: 0,
    approved: 0,
    documentReady: 0,
    correctionRequired: 0,
    rejected: 0,
    urgent: 0,
    overdue: 0
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedDocType, setSelectedDocType] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("all"); // 'all' | 'urgent' | 'overdue'

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

  // Bulk Multi-Select Processing State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // CSV Export State
  const [exportingCsv, setExportingCsv] = useState(false);

  // Institutional Settings Modal (Signatory & Seal) State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    signatory_name: "Dr. D. Vasudevan, M.E., Ph.D.",
    signatory_designation: "Principal & Head of Institution",
    seal_title: "PSNA College of Engineering and Technology (Autonomous)"
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState(null);

  // Clarification Chat State
  const [chatRequest, setChatRequest] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);

  // Action Drawer / Modal
  const [activeRequest, setActiveRequest] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [updating, setUpdating] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = async (statusToSet) => {
    if (selectedIds.length === 0 || bulkProcessing) return;
    try {
      setBulkProcessing(true);
      await api.post("/admin/requests/bulk-status", {
        ids: selectedIds,
        status: statusToSet,
        remarks: `Bulk processed and authorized as ${statusToSet} by administrator.`
      });
      setSelectedIds([]);
      await fetchRequests();
      await fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to perform bulk update.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const params = {};
      if (selectedStatus !== "All") params.status = selectedStatus;
      if (selectedDocType !== "All") params.documentType = selectedDocType;
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/admin/requests/export-csv", {
        params,
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `PSNA_Document_Requests_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export CSV failed:", err);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setExportingCsv(false);
    }
  };

  const openSettings = async () => {
    setShowSettingsModal(true);
    setSettingsFeedback(null);
    try {
      const res = await api.get("/admin/settings");
      if (res.data?.settings) {
        setSettingsForm((prev) => ({ ...prev, ...res.data.settings }));
      }
    } catch (err) {
      console.warn("Failed to load settings:", err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsFeedback(null);
      await api.post("/admin/settings", { settings: settingsForm });
      setSettingsFeedback({ type: "success", text: "Institutional signature & seal settings saved!" });
      setTimeout(() => setShowSettingsModal(false), 1200);
    } catch (err) {
      setSettingsFeedback({ type: "error", text: err.response?.data?.message || "Failed to save settings." });
    } finally {
      setSavingSettings(false);
    }
  };

  const openAdminChat = async (req) => {
    setChatRequest(req);
    setChatMessages([]);
    setChatInput("");
    try {
      setLoadingChat(true);
      const res = await api.get(`/admin/requests/${req.id}/messages`);
      setChatMessages(res.data?.messages || []);
    } catch (err) {
      console.warn("Failed to load chat messages:", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendAdminChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatRequest || sendingChat) return;
    try {
      setSendingChat(true);
      const text = chatInput.trim();
      setChatInput("");
      const res = await api.post(`/admin/requests/${chatRequest.id}/messages`, {
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

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/admin/stats");
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.warn("Failed to fetch admin stats:", err.message);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== "All") params.status = selectedStatus;
      if (selectedDocType !== "All") params.documentType = selectedDocType;
      if (search.trim()) params.search = search.trim();
      if (urgencyFilter !== "all") params.urgency = urgencyFilter;

      const res = await api.get("/admin/requests", { params });
      setRequests(res.data?.requests || []);
    } catch (err) {
      console.error("Failed to fetch admin requests:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedDocType, search, urgencyFilter]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchStats();
    fetchRequests();
  }, [navigate, fetchStats, fetchRequests]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/login");
  };

  const openActionModal = (req) => {
    setActiveRequest(req);
    setNewStatus(req.status);
    setAdminRemarks(req.admin_remarks || "");
    setModalFeedback(null);
  };

  const handleStatusUpdate = async (statusToSet = newStatus, remarksToSet = adminRemarks) => {
    if (!activeRequest) return;

    if (
      (statusToSet === "Correction Required" || statusToSet === "Rejected") &&
      !remarksToSet.trim()
    ) {
      setModalFeedback({
        type: "error",
        text: `Please provide remarks explaining why this request is ${statusToSet}.`
      });
      return;
    }

    try {
      setUpdating(true);
      setModalFeedback(null);

      await api.put(`/admin/requests/${activeRequest.id}/status`, {
        status: statusToSet,
        remarks: remarksToSet.trim()
      });

      setModalFeedback({
        type: "success",
        text: `Status updated to "${statusToSet}" successfully! Student has been notified.`
      });

      await fetchRequests();
      await fetchStats();

      setTimeout(() => {
        setActiveRequest(null);
      }, 900);

    } catch (err) {
      setModalFeedback({
        type: "error",
        text: err.response?.data?.message || "Failed to update status."
      });
    } finally {
      setUpdating(false);
    }
  };

  const getUrgencyBadge = (requiredByDate, status) => {
    if (status === "Document Ready" || status === "Rejected") {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reqDate = new Date(requiredByDate);
    reqDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((reqDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="urgency-pill urgency-overdue">Overdue ({Math.abs(diffDays)}d ago)</span>;
    } else if (diffDays <= 2) {
      return <span className="urgency-pill urgency-critical">Due in {diffDays} {diffDays === 1 ? "day" : "days"}!</span>;
    } else if (diffDays <= 4) {
      return <span className="urgency-pill urgency-warning">Due in {diffDays} days</span>;
    }
    return <span className="urgency-pill urgency-normal">{diffDays} days left</span>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Document Ready":
        return <span className="status-badge status-ready"><CheckCircle size={12} /> Ready</span>;
      case "Approved":
        return <span className="status-badge status-approved"><FileCheck size={12} /> Approved</span>;
      case "Under Verification":
        return <span className="status-badge status-verifying"><Clock size={12} /> Verifying</span>;
      case "Correction Required":
        return <span className="status-badge status-correction"><AlertTriangle size={12} /> Correction</span>;
      case "Rejected":
        return <span className="status-badge status-rejected"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="status-badge status-submitted"><Clock size={12} /> Submitted</span>;
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

  return (
    <div className="portal-layout admin-layout">
      {/* Admin Navbar */}
      <header className="portal-navbar admin-navbar glass-navbar">
        <div className="navbar-left">
          <div className="navbar-logo-badge admin-logo-badge">
            <img src="/psna-logo.png" alt="PSNA College Logo" className="navbar-college-logo" />
          </div>
          <div>
            <h2 className="navbar-brand-title">College Document Portal</h2>
            <span className="navbar-brand-sub admin-badge-text">
              Staff &bull; Administrative Operations Console
            </span>
          </div>
        </div>

        <div className="navbar-right">
          {/* Dark / Light Mode Toggle */}
          <button
            className="btn-icon theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            style={{ marginRight: "4px" }}
          >
            {theme === "dark" ? <Sun size={18} className="text-amber" /> : <Moon size={18} />}
          </button>

          <div className="user-profile-chip admin-chip">
            <div className="avatar-initials admin-avatar">A</div>
            <div className="user-profile-meta">
              <span className="user-profile-name">{admin?.name || "System Admin"}</span>
              <span className="user-profile-sub font-mono">{admin?.uniqueId || "ADMIN001"}</span>
            </div>
          </div>

          <button className="btn btn-outline-white btn-sm" onClick={handleLogout} title="Sign Out">
            <LogOut size={15} />
            <span className="hide-mobile">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="portal-main">
        <div className="dashboard-container">
          {/* Dashboard Header Bar */}
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Document Requisitions Overview</h1>
              <p className="text-muted text-sm">
                Review, verify, and digitally authorize student document requests
              </p>
            </div>

            <div className="admin-header-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={handleExportCsv}
                disabled={exportingCsv}
                title="Export current registry records to standard CSV"
              >
                <Download size={14} /> {exportingCsv ? "Exporting..." : "Export CSV"}
              </button>

              <button
                className="btn btn-sm btn-outline"
                onClick={openSettings}
                title="Institutional Signatory Authority & Seal Customizer"
              >
                <Settings size={14} /> Seal &amp; Signature
              </button>

              <button
                className={`btn btn-sm ${urgencyFilter === "urgent" ? "btn-warning" : "btn-outline"}`}
                onClick={() => setUrgencyFilter(urgencyFilter === "urgent" ? "all" : "urgent")}
              >
                <AlertTriangle size={14} /> Urgent ({stats.urgent})
              </button>
            </div>
          </div>

          {/* KPI Metrics Strip */}
          <div className="admin-stats-grid">
            <div
              className={`admin-stat-card ${selectedStatus === "All" && urgencyFilter === "all" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("All"); setUrgencyFilter("all"); }}
            >
              <div className="stat-card-top">
                <span className="stat-num">{stats.total}</span>
                <Layers size={18} className="stat-icon text-muted" />
              </div>
              <span className="stat-title">Total Requests</span>
            </div>

            <div
              className={`admin-stat-card ${selectedStatus === "Submitted" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("Submitted"); setUrgencyFilter("all"); }}
            >
              <div className="stat-card-top">
                <span className="stat-num text-blue">{stats.submitted}</span>
                <Clock size={18} className="stat-icon text-blue" />
              </div>
              <span className="stat-title">New Submitted</span>
            </div>

            <div
              className={`admin-stat-card ${selectedStatus === "Under Verification" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("Under Verification"); setUrgencyFilter("all"); }}
            >
              <div className="stat-card-top">
                <span className="stat-num text-amber">{stats.underVerification}</span>
                <Clock size={18} className="stat-icon text-amber" />
              </div>
              <span className="stat-title">Under Verification</span>
            </div>

            <div
              className={`admin-stat-card ${selectedStatus === "Approved" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("Approved"); setUrgencyFilter("all"); }}
            >
              <div className="stat-card-top">
                <span className="stat-num text-primary">{stats.approved}</span>
                <FileCheck size={18} className="stat-icon text-primary" />
              </div>
              <span className="stat-title">Approved</span>
            </div>

            <div
              className={`admin-stat-card ${selectedStatus === "Document Ready" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("Document Ready"); setUrgencyFilter("all"); }}
            >
              <div className="stat-card-top">
                <span className="stat-num text-success">{stats.documentReady}</span>
                <CheckCircle size={18} className="stat-icon text-success" />
              </div>
              <span className="stat-title">Document Ready</span>
            </div>

            <div
              className={`admin-stat-card ${selectedStatus === "Correction Required" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("Correction Required"); setUrgencyFilter("all"); }}
            >
              <div className="stat-card-top">
                <span className="stat-num text-purple">{stats.correctionRequired}</span>
                <AlertTriangle size={18} className="stat-icon text-purple" />
              </div>
              <span className="stat-title">Needs Correction</span>
            </div>

            <div
              className={`admin-stat-card ${selectedStatus === "Rejected" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("Rejected"); setUrgencyFilter("all"); }}
            >
              <div className="stat-card-top">
                <span className="stat-num text-danger">{stats.rejected}</span>
                <XCircle size={18} className="stat-icon text-danger" />
              </div>
              <span className="stat-title">Rejected</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="admin-toolbar-card">
            <div className="toolbar-search-col">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search student name, register no, email, or request ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="toolbar-filters-col">
              <div className="filter-dropdown-group">
                <span className="filter-label">Doc Type:</span>
                <select
                  className="form-control form-select form-select-sm"
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                >
                  <option value="All">All Document Types</option>
                  <option value="Bonafide Certificate">Bonafide Certificate</option>
                  <option value="Fee Structure">Fee Structure</option>
                  <option value="Bus Fee Structure">Bus Fee Structure</option>
                  <option value="Hostel Fee Structure">Hostel Fee Structure</option>
                </select>
              </div>

              <div className="filter-dropdown-group">
                <span className="filter-label">Status:</span>
                <select
                  className="form-control form-select form-select-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Verification">Under Verification</option>
                  <option value="Approved">Approved</option>
                  <option value="Document Ready">Document Ready</option>
                  <option value="Correction Required">Correction Required</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {(search || selectedDocType !== "All" || selectedStatus !== "All" || urgencyFilter !== "all") && (
                <button
                  className="btn btn-ghost btn-sm text-danger"
                  onClick={() => {
                    setSearch("");
                    setSelectedDocType("All");
                    setSelectedStatus("All");
                    setUrgencyFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Requests Table */}
          <div className="card table-card">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading student requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="empty-state-card">
                <Filter size={40} className="text-muted empty-icon" />
                <h3>No Requests Found</h3>
                <p className="text-muted">
                  No student requests match your selected query criteria.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-requests-table">
                  <thead>
                    <tr>
                      <th style={{ width: "36px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={requests.length > 0 && selectedIds.length === requests.length}
                          onChange={toggleSelectAll}
                          title="Select all"
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      </th>
                      <th>Ref ID &amp; Date</th>
                      <th>Student Details</th>
                      <th>Document Type</th>
                      <th>Purpose</th>
                      <th>Required By / Deadline</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => {
                      const isReady = r.status === "Document Ready";
                      const isSelected = selectedIds.includes(r.id);

                      return (
                        <tr key={r.id} className={`${isReady ? "row-ready" : ""} ${isSelected ? "row-selected" : ""}`}>
                          {/* Row Checkbox */}
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(r.id)}
                              style={{ cursor: "pointer", width: "16px", height: "16px" }}
                            />
                          </td>

                          {/* Ref ID & Date */}
                          <td>
                            <div className="font-mono font-bold text-sm text-primary">
                              {r.request_id}
                            </div>
                            <span className="text-muted text-xs">
                              {new Date(r.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          </td>

                          {/* Student Details */}
                          <td>
                            <div className="student-cell">
                              <span className="student-name font-semibold">{r.name}</span>
                              <span className="student-reg font-mono text-xs text-muted">
                                {r.register_no}
                              </span>
                              <span className="student-dept text-xs">
                                {r.department} &bull; {getOrdinalYear(r.year)} Yr (Sec {r.section})
                              </span>
                            </div>
                          </td>

                          {/* Document Type */}
                          <td>
                            <div className="doc-type-cell">
                              <span className="doc-icon-mini">
                                {r.document_type === "Bonafide Certificate" && <GraduationCap size={15} />}
                                {r.document_type === "Fee Structure" && <FileText size={15} />}
                                {r.document_type === "Bus Fee Structure" && <Bus size={15} />}
                                {r.document_type === "Hostel Fee Structure" && <Home size={15} />}
                              </span>
                              <span className="doc-title-text font-medium">{r.document_type}</span>
                            </div>
                          </td>

                          {/* Purpose */}
                          <td className="purpose-cell" title={r.purpose}>
                            <span className="purpose-text">{r.purpose}</span>
                            {r.admin_remarks && (
                              <span className="remarks-tag" title={r.admin_remarks}>
                                Note: {r.admin_remarks.slice(0, 30)}...
                              </span>
                            )}
                          </td>

                          {/* Required By Date + Urgency */}
                          <td>
                            <div className="deadline-cell">
                              <span className="deadline-date font-medium">
                                <Calendar size={13} className="icon-inline text-muted" />{" "}
                                {new Date(r.required_by).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                              {getUrgencyBadge(r.required_by, r.status)}
                            </div>
                          </td>

                          {/* Status */}
                          <td>{getStatusBadge(r.status)}</td>

                          {/* Action Button */}
                          <td>
                            <div className="table-actions-cell" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => openActionModal(r)}
                              >
                                Manage
                              </button>

                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => openAdminChat(r)}
                                title="Clarification Query Thread with Student"
                              >
                                <MessageSquare size={15} />
                              </button>

                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setPreviewDoc(r)}
                                title="Preview Certificate"
                              >
                                <Eye size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MANAGE REQUEST MODAL / DRAWER */}
      {activeRequest && (
        <div className="modal-backdrop" onClick={() => setActiveRequest(null)}>
          <div
            className="modal-container admin-action-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="badge badge-accent">Administrative Workflow</span>
                <h3>Review &amp; Process Request</h3>
                <p className="text-muted text-xs font-mono">{activeRequest.request_id}</p>
              </div>
              <button
                className="btn-close"
                onClick={() => setActiveRequest(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {modalFeedback && (
                <div className={`portal-alert alert-${modalFeedback.type}`}>
                  {modalFeedback.type === "success" ? (
                    <CheckCircle size={18} className="alert-icon" />
                  ) : (
                    <AlertCircle size={18} className="alert-icon" />
                  )}
                  <span className="alert-text">{modalFeedback.text}</span>
                </div>
              )}

              {/* Student Overview Box */}
              <div className="applicant-profile-card">
                <div className="profile-row">
                  <div className="profile-col">
                    <span className="profile-lbl">Student Name</span>
                    <span className="profile-val font-semibold">{activeRequest.name}</span>
                  </div>
                  <div className="profile-col">
                    <span className="profile-lbl">Register Number</span>
                    <span className="profile-val font-mono">{activeRequest.register_no}</span>
                  </div>
                  <div className="profile-col">
                    <span className="profile-lbl">Email Address</span>
                    <span className="profile-val">{activeRequest.email}</span>
                  </div>
                </div>

                <div className="profile-row mt-2">
                  <div className="profile-col">
                    <span className="profile-lbl">Department &amp; Year</span>
                    <span className="profile-val">
                      {activeRequest.department} &bull; {getOrdinalYear(activeRequest.year)} Year (Sec {activeRequest.section})
                    </span>
                  </div>
                  <div className="profile-col">
                    <span className="profile-lbl">Document Requested</span>
                    <span className="profile-val font-bold text-primary">
                      {activeRequest.document_type}
                    </span>
                  </div>
                  <div className="profile-col">
                    <span className="profile-lbl">Deadline / Required By</span>
                    <span className="profile-val font-medium">
                      {new Date(activeRequest.required_by).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                </div>

                <div className="profile-row mt-2">
                  <div className="profile-col span-3">
                    <span className="profile-lbl">Student Purpose Statement</span>
                    <span className="profile-val italic-purpose">&ldquo;{activeRequest.purpose}&rdquo;</span>
                  </div>
                </div>
              </div>

              {/* Workflow Status Selection */}
              <div className="workflow-control-section mt-4">
                <label className="form-label font-bold">
                  Update Workflow Status *
                </label>
                <div className="status-button-grid">
                  {[
                    { key: "Submitted", label: "Submitted" },
                    { key: "Under Verification", label: "Under Verification" },
                    { key: "Approved", label: "Approved" },
                    { key: "Document Ready", label: "Mark Document Ready 🎓" },
                    { key: "Correction Required", label: "Correction Required ⚠️" },
                    { key: "Rejected", label: "Reject Request ❌" }
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`status-btn-choice ${newStatus === s.key ? "selected" : ""}`}
                      onClick={() => setNewStatus(s.key)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Remarks Input */}
              <div className="form-group mt-4">
                <label className="form-label" htmlFor="admin-remarks">
                  Administrative Remarks / Notes to Student{" "}
                  {(newStatus === "Correction Required" || newStatus === "Rejected") && (
                    <span className="text-danger font-bold">* (Required)</span>
                  )}
                </label>
                <textarea
                  id="admin-remarks"
                  className="form-control"
                  rows={3}
                  placeholder="e.g. Verified against college admission records. Document is approved and generated."
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                />
                <span className="field-hint">
                  These remarks will appear directly on the student&apos;s dashboard and notification alert.
                </span>
              </div>

              {/* Quick Action Shortcut Pills */}
              <div className="quick-actions-strip">
                <span className="text-xs text-muted font-semibold">Quick Actions:</span>
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => {
                    setNewStatus("Under Verification");
                    setAdminRemarks("Official records are being verified with the academic office.");
                  }}
                >
                  Verify
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-outline-primary"
                  onClick={() => {
                    setNewStatus("Approved");
                    setAdminRemarks("Requisition approved. Document queued for digital seal generation.");
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-outline-success font-semibold"
                  onClick={() => {
                    setNewStatus("Document Ready");
                    setAdminRemarks("Official document generated with QR code verification. Ready for download.");
                  }}
                >
                  Mark Ready
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPreviewDoc(activeRequest)}
              >
                <Eye size={15} /> Preview Certificate
              </button>

              <div className="modal-footer-right">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveRequest(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleStatusUpdate()}
                  disabled={updating}
                >
                  {updating ? "Saving Changes..." : "Save & Update Status"}
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Preview Modal */}
      {previewDoc && (
        <DocumentModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          request={previewDoc}
          student={{
            name: previewDoc.name,
            register_no: previewDoc.register_no,
            department: previewDoc.department,
            year: previewDoc.year,
            section: previewDoc.section
          }}
        />
      )}

      {/* Floating Bulk Processing Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-floating-bar">
          <span className="bulk-count-badge">
            {selectedIds.length} Selected
          </span>
          <div className="bulk-btn-group">
            <button
              className="btn btn-sm btn-success"
              onClick={() => handleBulkUpdate("Document Ready")}
              disabled={bulkProcessing}
            >
              <CheckCircle size={14} /> Mark Ready ({selectedIds.length})
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleBulkUpdate("Approved")}
              disabled={bulkProcessing}
            >
              <FileCheck size={14} /> Approve ({selectedIds.length})
            </button>
            <button
              className="btn btn-sm btn-warning"
              onClick={() => handleBulkUpdate("Under Verification")}
              disabled={bulkProcessing}
            >
              <Clock size={14} /> Verify ({selectedIds.length})
            </button>
            <button
              className="btn btn-sm btn-outline text-white"
              onClick={() => setSelectedIds([])}
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* INSTITUTIONAL SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="badge badge-accent">Institutional Customizer</span>
                <h3>Digital Signature &amp; Seal Configuration</h3>
                <p className="text-muted text-xs">Configure signatory authority details embedded onto generated PDF certificates.</p>
              </div>
              <button className="btn-close" onClick={() => setShowSettingsModal(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="modal-body">
                {settingsFeedback && (
                  <div className={`portal-alert alert-${settingsFeedback.type}`}>
                    {settingsFeedback.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{settingsFeedback.text}</span>
                  </div>
                )}

                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="sig-name">
                    Authorized Signatory Name *
                  </label>
                  <input
                    id="sig-name"
                    type="text"
                    className="form-control"
                    value={settingsForm.signatory_name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, signatory_name: e.target.value })}
                    placeholder="e.g. Dr. D. Vasudevan, M.E., Ph.D."
                    required
                  />
                  <span className="field-hint">Appears above the institutional signature line on certificates.</span>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="sig-desig">
                    Signatory Designation *
                  </label>
                  <input
                    id="sig-desig"
                    type="text"
                    className="form-control"
                    value={settingsForm.signatory_designation}
                    onChange={(e) => setSettingsForm({ ...settingsForm, signatory_designation: e.target.value })}
                    placeholder="e.g. Principal & Head of Institution"
                    required
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="seal-title">
                    Official College Seal Text *
                  </label>
                  <input
                    id="seal-title"
                    type="text"
                    className="form-control"
                    value={settingsForm.seal_title}
                    onChange={(e) => setSettingsForm({ ...settingsForm, seal_title: e.target.value })}
                    placeholder="e.g. PSNA College of Engineering and Technology (Autonomous)"
                    required
                  />
                  <span className="field-hint">Embedded into the round digital stamp and watermark footer.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettingsModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                  {savingSettings ? "Saving Settings..." : "Save Configuration"}
                  <Send size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN QUERY / CLARIFICATION CHAT MODAL */}
      {chatRequest && (
        <div className="modal-backdrop" onClick={() => setChatRequest(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="badge badge-accent">Direct Clarification</span>
                <h3>Student Query &amp; Requisition Chat</h3>
                <p className="text-muted text-xs font-mono">
                  {chatRequest.name} ({chatRequest.register_no}) &bull; {chatRequest.request_id}
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
                        Need clarification from the student regarding their application? Send a note below.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((m) => {
                      const isAdmin = m.sender_role === "admin";
                      return (
                        <div
                          key={m.id}
                          className={`chat-msg ${isAdmin ? "msg-student" : "msg-admin"}`}
                        >
                          <span className="chat-msg-sender">
                            {isAdmin ? "You (Administration)" : m.sender_name || "Student"}
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

              <form onSubmit={handleSendAdminChat} className="chat-input-row">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type an administrative message or instruction..."
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
    </div>
  );
}
