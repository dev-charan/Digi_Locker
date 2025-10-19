// src/routes/document.routes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken, authenticateToken } from "../middleware/token.js";
import {
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
} from "../controllers/document.controller.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/documents";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "text/plain",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, DOC, DOCX, JPG, PNG, and TXT are allowed."
        )
      );
    }
  },
});

// All routes require authentication
router.use(authenticateToken);

// Upload document
router.post("/upload", upload.single("document"), uploadDocument);

// Get all documents for logged-in user
router.get("/", getAllDocuments);

// Get single document by ID
router.get("/:id", getDocumentById);

// Update document metadata
router.put("/:id", updateDocument);

// Delete document
router.delete("/:id", deleteDocument);

// Download document
router.get("/:id/download", downloadDocument);

export default router;
