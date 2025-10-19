// src/index.js
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import authRoutes from "./routes/user.auth.routes.js";
import documentRoutes from "./routes/document.routes.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  })
);

// Routes
app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);

// CSRF token endpoint
app.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Error handling for CSRF
app.use((err, req, res, next) => {
  if (err && err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  // Handle multer errors
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }

  next(err);
});

app.get("/", (req, res) => res.json({ message: "Auth API running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
