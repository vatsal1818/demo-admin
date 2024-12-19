import React, { useState } from "react";
import { Upload, X } from "lucide-react";
import { COURSES } from "../../Helper/Api_helpers";
import "./ContentAttachment.css";

const ContentAttachments = ({
  courseId,
  contentId,
  attachments,
  onAttachmentsUpdate,
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setError(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select files to upload");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("attachments", file);
    });

    try {
      const response = await fetch(
        `${COURSES}/${courseId}/content/${contentId}/attachments`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload attachments");
      }

      const data = await response.json();
      onAttachmentsUpdate(data.data.attachments);
      setFiles([]);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    try {
      const response = await fetch(
        `${COURSES}/${courseId}/content/${contentId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete attachment");
      }

      onAttachmentsUpdate(attachments.filter((a) => a._id !== attachmentId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="attachments-section">
      <h5>Attachments</h5>

      <div className="upload-section">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="file-input"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="file-upload-label">
          <Upload size={20} />
          Choose Files
        </label>
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="upload-button"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="selected-files">
        {files.map((file, index) => (
          <div key={index} className="file-item">
            <span>{file.name}</span>
            <button
              onClick={() => setFiles(files.filter((_, i) => i !== index))}
              className="remove-file"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="attachments-list">
        {attachments?.map((attachment) => (
          <div key={attachment._id} className="attachment-item">
            <a
              href={attachment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="attachment-link"
            >
              {attachment.fileName}
            </a>
            <button
              onClick={() => handleDelete(attachment._id)}
              className="delete-attachment"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentAttachments;
