import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Yourcourse.css";
import { DEFAULT_THUMBNAIL } from "../../Helper/Api_helpers";

const DefaultThumbnailSection = () => {
  const [defaultThumbnail, setDefaultThumbnail] = useState(null);
  const [defaultThumbnailUrl, setDefaultThumbnailUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateStats, setUpdateStats] = useState(null);

  useEffect(() => {
    fetchDefaultThumbnail();
  }, []);

  const fetchDefaultThumbnail = async () => {
    try {
      const response = await axios.get(DEFAULT_THUMBNAIL, {
        withCredentials: true,
      });
      setDefaultThumbnailUrl(response.data.data.defaultThumbnailUrl);
    } catch (error) {
      console.error("Error fetching default thumbnail:", error);
    }
  };

  const handleDefaultThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDefaultThumbnail(file);
      setError(null);
      setUpdateStats(null);
    }
  };

  const handleDefaultThumbnailSubmit = async (e) => {
    e.preventDefault();
    if (!defaultThumbnail) return;

    setIsLoading(true);
    setError(null);
    setUpdateStatus("Updating thumbnail and existing courses...");
    setUpdateStats(null);

    try {
      const formData = new FormData();
      formData.append("thumbnail", defaultThumbnail);

      const response = await axios.post(DEFAULT_THUMBNAIL, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setDefaultThumbnailUrl(response.data.data.defaultThumbnailUrl);
      setDefaultThumbnail(null);
      setUpdateStats(response.data.data.coursesUpdated);
      setUpdateStatus("Default thumbnail updated successfully!");

      // Reset file input
      const fileInput = document.getElementById("default-thumbnail-input");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to upload default thumbnail"
      );
      setUpdateStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="default-thumbnail-section">
      <h3 className="section-title">Default Course Thumbnail</h3>

      {error && <div className="error-message">{error}</div>}

      {updateStatus && (
        <div className="status-message success">{updateStatus}</div>
      )}

      {updateStats && (
        <div className="status-message info">
          <p>
            Updated {updateStats.modified} out of {updateStats.total} courses
            using the default thumbnail
          </p>
        </div>
      )}

      {defaultThumbnailUrl && (
        <div className="current-thumbnail">
          <h4 className="thumbnail-title">Current Default Thumbnail:</h4>
          <img
            src={defaultThumbnailUrl}
            alt="Default thumbnail"
            className="thumbnail-preview"
          />
        </div>
      )}

      <form onSubmit={handleDefaultThumbnailSubmit} className="thumbnail-form">
        <div className="form-group">
          <input
            type="file"
            id="default-thumbnail-input"
            accept="image/*"
            onChange={handleDefaultThumbnailChange}
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !defaultThumbnail}
          className={`form-button ${isLoading ? "loading" : ""}`}
        >
          {isLoading ? "Updating..." : "Update Default Thumbnail"}
        </button>
      </form>
    </div>
  );
};

export default DefaultThumbnailSection;
