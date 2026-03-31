import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, FileText, Trash2, Download, File, Image, FileSpreadsheet, X, Loader } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import clsx from "clsx";
import type { AdventureDocument } from "../types";

interface FileIconEntry {
  icon: LucideIcon;
  color: string;
}

const FILE_ICONS: Record<string, FileIconEntry> = {
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface DocumentsProps {
  adventureId: number;
  isAdmin: boolean;
}

export default function Documents({ adventureId, isAdmin }: DocumentsProps) {
  const { theme, mode } = useTheme();
  const { addToast } = useToast();
  const [docs, setDocs] = useState<AdventureDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdventureDocument | null>(null);
  const [thumbErrors, setThumbErrors] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (file: File | undefined) => {
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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      await api.uploadDocument(adventureId, dataUrl, selectedFile.name, description);
      addToast("Document uploaded!", "success");
      setSelectedFile(null);
      setDescription("");
      setShowUpload(false);
      loadDocs();
    } catch (e: any) {
      addToast(e.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await api.deleteDocument(adventureId, docId);
      addToast("Document deleted", "success");
      setConfirmDelete(null);
      loadDocs();
    } catch (e: any) {
      addToast(e.message || "Delete failed", "error");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const getFileIcon = (mimeType: string): FileIconEntry => {
    const entry = FILE_ICONS[mimeType] || { icon: File, color: "#9E9E9E" };
    return entry;
  };

  if (loading) {
    return (
      <div className="text-center p-10 text-tl-text-dim font-body">
        Loading documents...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-tl-heading font-display m-0">
            Documents
          </h2>
          <p className="text-xs text-tl-text-dim mt-0.5 font-body">
            Share trek docs, training materials, and planning files
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowUpload(true); setSelectedFile(null); setDescription(""); }}
            className="flex items-center gap-1.5 py-2 px-4 rounded-[10px] border-none bg-tl-accent text-white text-[13px] font-bold cursor-pointer font-body"
          >
            <Upload size={14} /> Upload
          </button>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && isAdmin && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => { if (!uploading) { setShowUpload(false); setSelectedFile(null); } }}>
          <div
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-tl-card rounded-[16px] p-6 max-w-[440px] w-full border border-tl-border"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-tl-heading font-display m-0">
                Upload Document
              </h3>
              <button onClick={() => { if (!uploading) { setShowUpload(false); setSelectedFile(null); } }}
                className="bg-transparent border-none cursor-pointer text-tl-text-dim p-1">
                <X size={18} />
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "rounded-xl text-center cursor-pointer mb-3 transition-all duration-200",
                selectedFile ? "py-3 px-4" : "py-8 px-4"
              )}
              style={{
                border: `2px dashed ${dragOver ? theme.accent : theme.borderLight}`,
                background: dragOver ? theme.accentBg : (mode === "dark" ? "#1E2218" : "#FAFAF5"),
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileSelect(e.target.files?.[0])}
              />
              {selectedFile ? (
                <div className="flex items-center gap-2.5">
                  {(() => { const fi = getFileIcon(selectedFile.type); return <fi.icon size={20} color={fi.color} />; })()}
                  <div className="flex-1 text-left">
                    <div className="text-[13px] font-semibold text-tl-heading font-body">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-tl-text-dim">{formatFileSize(selectedFile.size)}</div>
                  </div>
                  <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="bg-transparent border-none cursor-pointer text-tl-text-dim p-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={28} color={theme.textDim} className="mb-2" />
                  <div className="text-[13px] font-semibold text-tl-heading font-body">
                    Drop a file here or click to browse
                  </div>
                  <div className="text-[11px] text-tl-text-dim mt-1">
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              maxLength={200}
              className="w-full py-2.5 px-3 rounded-btn border border-tl-border-light text-tl-text text-[13px] font-body outline-none box-border mb-3.5"
              style={{ background: mode === "dark" ? "#1E2218" : "#fff" }}
            />

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={clsx(
                "w-full py-2.5 rounded-[10px] border-none text-sm font-bold font-body flex items-center justify-center gap-1.5",
                !selectedFile || uploading
                  ? "bg-tl-border-light text-tl-text-dim cursor-default"
                  : "bg-tl-accent text-white cursor-pointer"
              )}
            >
              {uploading ? (<><Loader size={14} className="animate-spin" /> Uploading...</>) : "Upload Document"}
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="tl-card flex flex-col items-center text-center py-10 px-5">
          <FileText size={48} strokeWidth={1.2} className="text-tl-text-dimmer mb-3 opacity-40" />
          <div className="text-[15px] font-bold text-tl-heading font-display mb-1.5">No documents yet</div>
          <div className="text-[12px] text-tl-text-dim leading-relaxed max-w-[280px] mb-4 font-body">
            {isAdmin
              ? "Upload trek documents, training materials, medical forms, or planning files. Keep everything your crew needs in one place."
              : "Your crew leader hasn't uploaded any documents yet. Check back as your departure approaches."}
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold font-body text-white px-4 py-2 rounded-badge border-none cursor-pointer bg-tl-accent"
            >
              <Upload size={14} strokeWidth={2.5} />
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map(doc => {
            const fi = getFileIcon(doc.mime_type);
            const IconComp = fi.icon;
            const isImage = doc.mime_type?.startsWith("image/");
            return (
              <div key={doc.id} className="bg-tl-card rounded-xl border border-tl-border py-3 px-3.5 flex items-center gap-3">
                {/* Icon / Thumbnail */}
                {isImage && !thumbErrors.has(doc.id) ? (
                  <img
                    src={api.getDocumentUrl(adventureId, doc.id)}
                    alt={doc.original_name}
                    className="w-12 h-12 object-cover rounded-lg shrink-0"
                    onError={() => setThumbErrors(prev => new Set(prev).add(doc.id))}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center"
                    style={{ background: mode === "dark" ? "#2A2E24" : "#F5F5F0" }}>
                    <IconComp size={20} color={fi.color} />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-tl-heading font-body truncate">
                    {doc.original_name}
                  </div>
                  <div className="text-[11px] text-tl-text-dim flex gap-2 mt-0.5">
                    <span>{formatFileSize(doc.size)}</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                  {doc.description && (
                    <div className="text-[11px] text-tl-text-dim mt-0.5 italic">
                      {doc.description}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <a
                    href={api.getDocumentUrl(adventureId, doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-[34px] h-[34px] rounded-btn border border-tl-border-light cursor-pointer no-underline"
                    style={{ background: mode === "dark" ? "#2A2E24" : "#F5F5F0" }}
                    title={isImage ? "View" : "Download"}
                  >
                    <Download size={14} className="text-tl-accent" />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmDelete(doc)}
                      className="flex items-center justify-center w-[34px] h-[34px] rounded-btn cursor-pointer"
                      style={{
                        background: mode === "dark" ? "#2E2020" : "#FFF5F5",
                        border: `1px solid ${mode === "dark" ? "#5C3030" : "#F5D5D5"}`,
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
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setConfirmDelete(null)}>
          <div onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-tl-card rounded-[14px] p-5 max-w-[360px] w-full border border-tl-border"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <h3 className="text-[15px] font-bold text-tl-heading font-display m-0 mb-2">
              Delete Document?
            </h3>
            <p className="text-[13px] text-tl-text-dim font-body m-0 mb-4">
              Are you sure you want to delete <strong>{confirmDelete.original_name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="py-2 px-4 rounded-btn border border-tl-border-light bg-tl-bg-alt text-tl-text text-[13px] font-semibold cursor-pointer font-body">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete.id)}
                className="py-2 px-4 rounded-btn border-none bg-[#E53935] text-white text-[13px] font-bold cursor-pointer font-body">
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
