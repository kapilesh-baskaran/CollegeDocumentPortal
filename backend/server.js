const express = require("express");
const cors = require("cors");
const pool = require("./database");
const initDB = require("./initDb");
const studentRoutes = require("./routes/studentRoutes");
const documentRoutes = require("./routes/documentRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/students", studentRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "College Document Portal Backend is running!"
  });
});

app.get("/verify/:requestId", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  res.redirect(`${frontendUrl}/verify/${req.params.requestId}`);
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );

    res.json({
      message: "Neon PostgreSQL connected successfully!",
      time: result.rows[0].now,
      tables: tablesRes.rows.map((r) => r.table_name)
    });
  } catch (error) {
    console.error("Database connection test error:", error);

    res.status(500).json({
      message: "Database connection failed",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize database tables and initial records
  await initDB();
});