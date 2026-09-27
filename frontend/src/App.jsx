import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import StudentRegister from "./pages/StudentRegister";
import VerifyOTP from "./pages/VerifyOTP";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import VerifyDocument from "./pages/VerifyDocument";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication & Onboarding */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<StudentRegister />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />

        {/* Student Portal Interface */}
        <Route path="/student-dashboard" element={<StudentDashboard />} />

        {/* Staff & Admin Interface */}
        <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Public Digital Document QR Verification Page */}
        <Route path="/verify/:requestId" element={<VerifyDocument />} />
        <Route path="/verify-document/:requestId" element={<VerifyDocument />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}