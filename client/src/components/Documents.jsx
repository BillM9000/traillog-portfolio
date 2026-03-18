import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, FileText, Trash2, Download, File, Image, FileSpreadsheet, X, Loader } from "lucide-react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { fontBody, fontDisplay } from "../utils/theme";

const FILE_ICONS = {
  "application/pdf": { icon: FileText, color: "#E53935" },
  "image/jpeg": { icon: Image, color: "#43A047" },
  "image/png": { icon: Image, color: "#43A047" },
  "image/webp": { icon: Image, color: "#43A047" },
  "image/gif": { icon: Image, color: "#43A047" },
  "application/msword": { icon: FileText, color: "#2196F3" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: FileText, color: "#2196F3" },
  "application/vnd.ms-excel": { icon: FileSpreadsheet, color: "#4CAF50" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { icon: FileSpreadsheet, color: "#4CAF50" },
  "text/plain": { icon: File, color: "#9E9E9E" },
  "text/csv": { icon: FileSpreadsheet, color: "#4CAF50" },
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Documents({ adventureId, isAdmin }) {
  const { theme, mode } = useTheme();
  const { addToast } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);

  const loadDocs = useCallback(async () => {
    try {
      const data = await api.getDocuments(adventureId);
      setDocs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [adventureId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast("File too large (max 5MB)", "error");
      return;
    }
    setSelectedFile(file);
    setShowUpload(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      await api.uploadDocument(adventureId, dataUrl, selectedFile.name, description);
      addToast("Document uploaded!", "success");
      setSelectedFile(null);
      setDescription("");
      setShowUpload(false);
      loadDocs();
    } catch (e) {
      addToast(e.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await api.deleteDocument(adventureId, docId);
      addToast("Document deleted", "success");
      setConfirmDelete(null);
      loadDocs();
    } catch (e) {
      addToast(e.message || "Delete failed", "error");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const getFileIcon = (mimeType) => {
    const entry = FILE_ICONS[mimeType] || { icon: File, color: "#9E9E9E" };
    return entry;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: theme.textDim, fontFamily: fontBody }}>
        Loading documents...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay, margin: 0 }}>
            Documents
          </h2>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0", fontFamily: fontBody }}>
            Share trek docs, training materials, and planning files
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowUpload(true); setSelectedFile(null); setDescription(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10, border: "none",
              background: theme.accent, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: fontBody,
            }}
          >
            <Upload size={14} /> Upload
          </button>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && isAdmin && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => { if (!uploading) { setShowUpload(false); setSelectedFile(null); } }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.bgCard, borderRadius: 16, padding: 24, maxWidth: 440, width: "100%",
              border: `1px solid ${theme.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay, margin: 0 }}>
                Upload Document
              </h3>
              <button onClick={() => { if (!uploading) { setShowUpload(false); setSelectedFile(null); } }} style={{
                background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 4,
              }}>
                <X size={18} />
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? theme.accent : theme.borderLight}`,
                borderRadius: 12, padding: selectedFile ? "12px 16px" : "32px 16px",
                textAlign: "center", cursor: "pointer",
                background: dragOver ? theme.accentBg : (mode === "dark" ? "#1E2218" : "#FAFAF5"),
                transition: "all 0.2s ease", marginBottom: 12,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                style={{ display: "none" }}
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />
              {selectedFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {(() => { const fi = getFileIcon(selectedFile.type); return <fi.icon size={20} color={fi.color} />; })()}
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.heading, fontFamily: fontBody }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textDim }}>{formatFileSize(selectedFile.size)}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} style={{
                    background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 4,
                  }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={28} color={theme.textDim} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.heading, fontFamily: fontBody }}>
                    Drop a file here or click to browse
                  </div>
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>
                    PDF, images, Word, Excel, CSV, TXT — max 5MB
                  </div>
                </>
              )}
            </div>

            {/* Description field */}
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: `1px solid ${theme.borderLight}`, background: mode === "dark" ? "#1E2218" : "#fff",
                color: theme.text, fontSize: 13, fontFamily: fontBody, outline: "none",
                boxSizing: "border-box", marginBottom: 14,
              }}
            />

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                background: !selectedFile || uploading ? theme.borderLight : theme.accent,
                color: !selectedFile || uploading ? theme.textDim : "#fff",
                fontSize: 14, fontWeight: 700, cursor: !selectedFile || uploading ? "default" : "pointer",
                fontFamily: fontBody, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {uploading ? (<><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> Uploading...</>) : "Upload Document"}
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <div style={{
          background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`,
          padding: "40px 20px", textAlign: "center",
        }}>
          <FileText size={36} color={theme.textDim} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.textDim, fontFamily: fontBody }}>
            No documents yet
          </div>
          <div style={{ fontSize: 12, color: theme.textDimmer, marginTop: 4, fontFamily: fontBody }}>
            {isAdmin ? "Upload trek documents, training materials, or planning files." : "Your troop leader hasn't uploaded any documents yet."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map(doc => {
            const fi = getFileIcon(doc.mime_type);
            const IconComp = fi.icon;
            const isImage = doc.mime_type?.startsWith("image/");
            return (
              <div key={doc.id} style={{
                background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`,
                padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
              }}>
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: mode === "dark" ? "#2A2E24" : "#F5F5F0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <IconComp size={20} color={fi.color} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontBody,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {doc.original_name}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textDim, display: "flex", gap: 8, marginTop: 2 }}>
                    <span>{formatFileSize(doc.size)}</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                  {doc.description && (
                    <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2, fontStyle: "italic" }}>
                      {doc.description}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <a
                    href={api.getDocumentUrl(adventureId, doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 34, height: 34, borderRadius: 8,
                      background: mode === "dark" ? "#2A2E24" : "#F5F5F0",
                      border: `1px solid ${theme.borderLight}`, cursor: "pointer",
                      textDecoration: "none",
                    }}
                    title={isImage ? "View" : "Download"}
                  >
                    <Download size={14} color={theme.accent} />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmDelete(doc)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 34, height: 34, borderRadius: 8,
                        background: mode === "dark" ? "#2E2020" : "#FFF5F5",
                        border: `1px solid ${mode === "dark" ? "#5C3030" : "#F5D5D5"}`,
                        cursor: "pointer",
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} color="#E53935" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: theme.bgCard, borderRadius: 14, padding: 20, maxWidth: 360, width: "100%",
            border: `1px solid ${theme.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.heading, fontFamily: fontDisplay, margin: "0 0 8px" }}>
              Delete Document?
            </h3>
            <p style={{ fontSize: 13, color: theme.textDim, fontFamily: fontBody, margin: "0 0 16px" }}>
              Are you sure you want to delete <strong>{confirmDelete.original_name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${theme.borderLight}`,
                background: theme.bgAlt, color: theme.text, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: fontBody,
              }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: "#E53935", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: fontBody,
              }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
