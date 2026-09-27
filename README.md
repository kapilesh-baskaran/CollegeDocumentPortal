# College Document Portal 🎓📄

> A modern, paperless institutional web platform designed for students to request official college documents and staff to verify, approve, and issue digitally verified certificates with QR authentication.

---

## 🌟 Key Features

### Student Portal
* **Email & OTP Authentication**: Secure login via college email with automated 6-digit OTP delivery (powered by Nodemailer).
* **New Student Registration**: Comprehensive registration with academic details (Name, Register No, Department, Year, Section).
* **Document Requisitions**:
  * **Bonafide Certificate** (for bank accounts, passport, visa, scholarship, education loan)
  * **Fee Structure** (certified annual tuition & institutional fee schedule)
  * **Bus Fee Structure** (certified transport route & bus pass fee schedule)
  * **Hostel Fee Structure** (certified boarding, lodging & mess fee schedule)
* **Processing Policy**: Automated enforcement of the minimum 5 working days lead time.
* **Status Pipeline Tracking**: Live 4-stage visual progress: `Submitted` → `Under Verification` → `Approved` → `Document Ready`.
* **In-App Notifications**: Real-time updates with an unread badge indicator whenever administrative status changes.
* **Digital PDF Generation & Download**: Client-rendered, high-resolution official college certificates with digital signature seals.
* **QR Verification**: Every issued document includes a unique scannable QR code.

### Administrative Console
* **Staff Dashboard**: Secure administrative login (`ADMIN001`).
* **KPI Metrics**: Real-time counters for Total Requisitions, New Submissions, Under Verification, Approved, Document Ready, Needs Correction, and Rejected.
* **Search & Filters**: Instant search across student name, register number, request ID, and email; filter by document type or status.
* **Urgency Highlighting**: Automatic warning badges for deadlines due within 3 days or overdue requests.
* **Review & Workflow Actions**: Update request status, add official remarks/notes, request corrections from students, and mark documents as ready.

### Public QR Verification Portal
* **Verification URL**: `/verify/:requestId`
* Anyone scanning the document's QR code (banks, passport offices, embassies, universities) is directed to the public verification page showing the **GENUINE & OFFICIALLY VERIFIED** seal validated against the college database.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, Vite, React Router v7, Lucide Icons, jsPDF, QRCode
* **Backend**: Node.js, Express.js, PostgreSQL (Neon Serverless), JWT Authentication, Nodemailer, bcrypt
* **Styling**: Modern Institutional Theme (Academic Navy `#1e3a8a`, Slate Grays, Forest Emerald, Accent Gold)

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* PostgreSQL / Neon DB Account
* Gmail Account (with App Password enabled for sending OTPs)

### 1. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see `.env.example`):
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@domain.com
EMAIL_PASS=your_gmail_app_password
```

Start the backend server:
```bash
node server.js
# Runs on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 🔐 Default Access & Credentials

| Role | Access URL | Credentials |
| :--- | :--- | :--- |
| **Student** | `/login` (Student Tab) | Enter registered college email + OTP |
| **Staff / Admin** | `/login` (Staff Tab) | **ID**: `ADMIN001` <br> **Password**: `Admin@123` |
| **Public Verification** | `/verify/:requestId` | Example: `/verify/REQ-1790510613520` |

---

## 📜 License
Developed for academic submission and institutional deployment.
