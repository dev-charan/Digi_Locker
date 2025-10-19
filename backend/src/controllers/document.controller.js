// src/controllers/document.controller.js
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Upload document
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { description } = req.body;
    const userId = req.user.userId;

    const document = await prisma.document.create({
      data: {
        userId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
        description: description || null,
      },
    });

    res.status(201).json({
      message: "Document uploaded successfully",
      document: {
        id: document.id,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        description: document.description,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    // Delete uploaded file if database save fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload document" });
  }
};

// Get all documents for user
export const getAllDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: { userId },
        select: {
          id: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.document.count({ where: { userId } }),
    ]);

    res.json({
      documents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ error: "Failed to retrieve documents" });
  }
};

// Get single document
export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await prisma.document.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
      select: {
        id: true,
        originalName: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ document });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({ error: "Failed to retrieve document" });
  }
};

// Update document metadata
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { description, originalName } = req.body;

    // Check if document exists and belongs to user
    const existingDoc = await prisma.document.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!existingDoc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: parseInt(id) },
      data: {
        description:
          description !== undefined ? description : existingDoc.description,
        originalName: originalName || existingDoc.originalName,
      },
      select: {
        id: true,
        originalName: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: "Document updated successfully",
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Update document error:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await prisma.document.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
};

// Download document
export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await prisma.document.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    res.download(document.filePath, document.originalName);
  } catch (error) {
    console.error("Download document error:", error);
    res.status(500).json({ error: "Failed to download document" });
  }
};
