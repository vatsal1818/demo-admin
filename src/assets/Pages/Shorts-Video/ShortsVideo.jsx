import React, { useState, useEffect } from "react";
import "./ShortsVideo.css";
import axios from "axios";
import {
  ADMIN_SHORTS_TITLE,
  ADMIN_SHORTS_VIDEO,
} from "../../Helper/Api_helpers";

const AdminShorts = () => {
  const [shortsUrl, setShortsUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [shortsData, setShortsData] = useState({
    title: "Our",
    titleSpan: "Shorts Video",
    shortsVideo: [], // Match backend structure
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState({ title: "", titleSpan: "" });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(ADMIN_SHORTS_VIDEO);
      setShortsData(response.data.data);
    } catch (error) {
      console.error("Error fetching shorts videos:", error);
      setError("Failed to load shorts videos");
    }
  };

  const validateShortsUrl = (url) => {
    try {
      const videoUrl = new URL(url);
      return (
        videoUrl.hostname.includes("youtube.com") &&
        videoUrl.pathname.includes("/shorts/")
      );
    } catch {
      return false;
    }
  };

  const handleUpdateTitle = async () => {
    try {
      const response = await axios.put(ADMIN_SHORTS_TITLE, {
        title: tempTitle.title,
        titleSpan: tempTitle.titleSpan,
      });

      if (response.data.status === "success") {
        setShortsData(response.data.data);
        setEditingTitle(false);
        setSuccessMessage("Title updated successfully!");
      }
    } catch (error) {
      console.error("Error updating title:", error);
      setError("Failed to update title");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    if (!validateShortsUrl(shortsUrl)) {
      setError("Please enter a valid YouTube Shorts URL");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(ADMIN_SHORTS_VIDEO, {
        url: shortsUrl,
      });

      if (response.data.status === "success") {
        setShortsUrl("");
        setSuccessMessage("Video added successfully!");
        setShortsData(response.data.data);
      }
    } catch (error) {
      console.error("Error adding video:", error);
      setError(error.response?.data?.error || "Failed to add video");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShorts = async (index) => {
    try {
      const response = await axios.delete(`${ADMIN_SHORTS_VIDEO}/${index}`);

      if (response.data.status === "success") {
        setSuccessMessage("shorts deleted successfully!");
        fetchVideos();
      }
    } catch (error) {
      console.error("Error deleting shorts:", error);
      setError("Failed to delete shorts");
    }
  };

  return (
    <div className="admin-form">
      <h2>Add YouTube Shorts</h2>

      <div className="shorts-title-section">
        {!editingTitle ? (
          <div
            className="shorts-title"
            onClick={() => {
              setTempTitle({
                title: shortsData.title,
                titleSpan: shortsData.titleSpan,
              });
              setEditingTitle(true);
            }}
          >
            <h3>
              {shortsData.title} <span>{shortsData.titleSpan}</span>
            </h3>
            <button className="edit-title-button">Edit Title</button>
          </div>
        ) : (
          <div className="shorts-title-edit">
            <input
              value={tempTitle.title}
              onChange={(e) =>
                setTempTitle({ ...tempTitle, title: e.target.value })
              }
              placeholder="Main Title"
            />
            <input
              value={tempTitle.titleSpan}
              onChange={(e) =>
                setTempTitle({ ...tempTitle, titleSpan: e.target.value })
              }
              placeholder="Span Title"
            />
            <div className="title-edit-actions">
              <button onClick={handleUpdateTitle}>Save</button>
              <button onClick={() => setEditingTitle(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="shorts-form">
        <div className="input-group">
          <input
            type="url"
            value={shortsUrl}
            onChange={(e) => setShortsUrl(e.target.value)}
            placeholder="Paste YouTube Shorts URL (e.g., https://youtube.com/shorts/...)"
            className="url-input"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Short"}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
      </form>

      <div className="video-list">
        <h3>Existing Shorts ({shortsData.shortsVideo.length})</h3>
        {shortsData.shortsVideo.length === 0 ? (
          <div className="no-videos">No videos added yet</div>
        ) : (
          <div className="videos-grid">
            {shortsData.shortsVideo.map((video, index) => (
              <div key={index} className="video-item">
                <div className="video-container">
                  <div dangerouslySetInnerHTML={{ __html: video.embedCode }} />
                </div>
                <div className="video-actions">
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteShorts(index)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminShorts;
