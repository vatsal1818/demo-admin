import React, { useState, useEffect } from "react";
import "./ShortsVideo.css";
import { ADMIN_SHORTS_VIDEO } from "../../Helper/Api_helpers";

const AdminShorts = () => {
  const [shortsUrl, setShortsUrl] = useState("");
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch(ADMIN_SHORTS_VIDEO);
      if (!response.ok) throw new Error("Failed to fetch videos");
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError("Failed to fetch videos");
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
      const response = await fetch(ADMIN_SHORTS_VIDEO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: shortsUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add video");
      }

      setShortsUrl("");
      setSuccessMessage("Video added successfully!");
      fetchVideos();
    } catch (error) {
      console.error("Error adding video:", error);
      setError(error.message || "Failed to add video");
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video?")) {
      return;
    }

    setError("");
    try {
      const response = await fetch(`${ADMIN_SHORTS_VIDEO}/${videoId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete video");

      setSuccessMessage("Video deleted successfully");
      fetchVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      setError("Failed to delete video");
    }
  };

  return (
    <div className="admin-form">
      <h2>Add YouTube Shorts</h2>

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
        <h3>Existing Shorts ({videos.length})</h3>
        {videos.length === 0 ? (
          <div className="no-videos">No videos added yet</div>
        ) : (
          <div className="videos-grid">
            {videos.map((video) => (
              <div key={video._id} className="video-item">
                <div className="video-container">
                  <div dangerouslySetInnerHTML={{ __html: video.embedCode }} />
                </div>
                <div className="video-actions">
                  <button
                    className="delete-button"
                    onClick={() => deleteVideo(video._id)}
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
