const jwt = require("jsonwebtoken");

function studentAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Student authorization token required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "student") {
      return res.status(403).json({
        message: "Student access required"
      });
    }

    req.student = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired student token"
    });
  }
}

module.exports = studentAuthMiddleware;