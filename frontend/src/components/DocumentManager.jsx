import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Edit2,
  Download,
  Search,
  X,
} from "lucide-react";
import "./DocumentManager.css";
import api from "../api";

const DocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");
  const [editingDoc, setEditingDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const API_URL = "http://localhost:5000";

  const getToken = () => localStorage.getItem("accessToken");

  useEffect(() => {
    fetchDocuments();
  }, [pagination.page]);

const fetchDocuments = async () => {
  setLoading(true);

  const token = localStorage.getItem("accessToken");
  console.log("Full Token:", token);
  console.log("Token length:", token?.length);
  console.log("Token parts:", token?.split(".").length); // Should be 3 for valid JWT

  try {
    const response = await api.get(
      `/documents?page=${pagination.page}&limit=${pagination.limit}`
    );
    setDocuments(response.data.documents);
    setPagination((prev) => ({ ...prev, ...response.data.pagination }));
  } catch (err) {
    setError(err.response?.data?.error || err.message);
    console.error("Fetch error:", err.response?.data);
  } finally {
    setLoading(false);
  }
};

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }
    setSelectedFile(file);
    setError("");
  };

const handleUpload = async (e) => {
  e.preventDefault();
  if (!selectedFile) {
    setError("Please select a file");
    return;
  }

  setLoading(true);
  const formData = new FormData();
  formData.append("document", selectedFile);
  formData.append("description", description);

  try {
    const response = await api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    // Axios automatically attaches the Authorization header via interceptor
    // Data is in response.data for axios
    setSuccess("Document uploaded successfully!");
    setSelectedFile(null);
    setDescription("");
    document.getElementById("fileInput").value = "";
    fetchDocuments();
  } catch (err) {
    setError(err.response?.data?.error || err.message);
  } finally {
    setLoading(false);
  }
};

 const handleUpdate = async (docId) => {
   if (!editingDoc) return;
   setLoading(true);
   try {
     const response = await api.put(`/documents/${docId}`, {
       description: editingDoc.description,
       originalName: editingDoc.originalName,
     });
     setSuccess("Document updated successfully!");
     setEditingDoc(null);
     fetchDocuments();
   } catch (err) {
     setError(err.response?.data?.error || err.message);
   } finally {
     setLoading(false);
   }
 };

 const handleDelete = async (docId) => {
   if (!window.confirm("Are you sure you want to delete this document?"))
     return;
   setLoading(true);
   try {
     await api.delete(`/documents/${docId}`);
     setSuccess("Document deleted successfully!");
     fetchDocuments();
   } catch (err) {
     setError(err.response?.data?.error || err.message);
   } finally {
     setLoading(false);
   }
 };

 const handleDownload = async (docId, fileName) => {
   try {
     const response = await api.get(`/documents/${docId}/download`, {
       responseType: "blob", // Important for file downloads
     });
     const blob = response.data;
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = fileName;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     window.URL.revokeObjectURL(url); // Clean up
   } catch (err) {
     setError(err.response?.data?.error || err.message);
   }
 };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description &&
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="dm-container">
      <h1 className="dm-title">Document Manager</h1>

      {error && (
        <div className="dm-alert dm-error">
          <p>{error}</p>
          <button onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      {success && (
        <div className="dm-alert dm-success">
          <p>{success}</p>
          <button onClick={() => setSuccess("")}>
            <X size={18} />
          </button>
        </div>
      )}

      <form onSubmit={handleUpload} className="dm-upload-form">
        <label>Select File (Max 10MB)</label>
        <input
          id="fileInput"
          type="file"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
        />
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add description..."
        />
        <button type="submit" disabled={loading || !selectedFile}>
          <Upload size={18} /> {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <div className="dm-search">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && documents.length === 0 ? (
        <p className="dm-loader">Loading documents...</p>
      ) : filteredDocuments.length === 0 ? (
        <p className="dm-empty">No documents found</p>
      ) : (
        <div className="dm-list">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="dm-item">
              {editingDoc?.id === doc.id ? (
                <div>
                  <input
                    type="text"
                    value={editingDoc.originalName}
                    onChange={(e) =>
                      setEditingDoc({
                        ...editingDoc,
                        originalName: e.target.value,
                      })
                    }
                  />
                  <textarea
                    value={editingDoc.description || ""}
                    onChange={(e) =>
                      setEditingDoc({
                        ...editingDoc,
                        description: e.target.value,
                      })
                    }
                  />
                  <div className="dm-actions">
                    <button onClick={() => handleUpdate(doc.id)}>Save</button>
                    <button onClick={() => setEditingDoc(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3>{doc.originalName}</h3>
                    <p>{doc.description}</p>
                    <small>
                      {formatFileSize(doc.fileSize)} | {doc.mimeType} |{" "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <div className="dm-buttons">
                    <button
                      onClick={() => handleDownload(doc.id, doc.originalName)}
                    >
                      <Download size={18} />
                    </button>
                    <button onClick={() => setEditingDoc(doc)}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(doc.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <p className="pagination-info">
            Showing {documents.length} of {pagination.total} documents
          </p>
          <div className="pagination-controls">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="pagination-button"
            >
              Previous
            </button>
            <span className="pagination-page">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
