const express = require("express");
const cors = require("cors");
const pool = require("./database");
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

    res.json({
      message: "Neon PostgreSQL connected successfully!",
      time: result.rows[0].now
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed"
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});