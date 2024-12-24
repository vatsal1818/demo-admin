import React, { useState, useEffect } from "react";
import axios from "axios";
import { ADMIN_PODCASTS } from "../../Helper/Api_helpers";
import "./PodcastUpload.css";

const PodcastUpload = () => {
  const [podcastData, setPodcastData] = useState({
    title: "Our",
    titleSpan: "Podcasts",
    podcasts: [],
  });
  const [embedCodes, setEmbedCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState({ title: "", titleSpan: "" });

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      const response = await axios.get(ADMIN_PODCASTS);
      setPodcastData(response.data.data);
    } catch (error) {
      console.error("Error fetching podcast embed codes:", error);
      setMessage("Failed to load podcast embed codes");
    }
  };

  const handleAddPodcastInput = () => {
    setEmbedCodes([...embedCodes, ""]);
  };

  const handleEmbedCodeChange = (index, value) => {
    const newEmbedCodes = [...embedCodes];
    newEmbedCodes[index] = value;
    setEmbedCodes(newEmbedCodes);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (embedCodes.length === 0 || embedCodes.every((code) => !code.trim())) {
      setMessage("Please enter at least one podcast embed code");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(ADMIN_PODCASTS, { embedCodes });

      if (response.data.status === "success") {
        setMessage("Podcast embed codes uploaded successfully!");
        fetchPodcasts();
        setEmbedCodes([]);
      }
    } catch (error) {
      console.error("Error uploading podcast embed codes:", error);
      setMessage(
        error.response?.data?.message || "Failed to upload podcast embed codes"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTitle = async () => {
    try {
      const response = await axios.put(`${ADMIN_PODCASTS}/title`, {
        title: tempTitle.title,
        titleSpan: tempTitle.titleSpan,
      });

      if (response.data.status === "success") {
        setPodcastData(response.data.data);
        setEditingTitle(false);
        setMessage("Title updated successfully!");
      }
    } catch (error) {
      console.error("Error updating title:", error);
      setMessage("Failed to update title");
    }
  };

  const handleDeletePodcast = async (index) => {
    try {
      const response = await axios.delete(`${ADMIN_PODCASTS}/${index}`);

      if (response.data.status === "success") {
        setMessage("Podcast embed code deleted successfully!");
        fetchPodcasts();
      }
    } catch (error) {
      console.error("Error deleting podcast embed code:", error);
      setMessage("Failed to delete podcast embed code");
    }
  };

  return (
    <div className="podcast-upload-container">
      <h2>Podcast Embed Code Management</h2>

      {/* Title Section */}
      <div className="podcast-title-section">
        {!editingTitle ? (
          <div
            className="podcast-title"
            onClick={() => {
              setTempTitle({
                title: podcastData.title,
                titleSpan: podcastData.titleSpan,
              });
              setEditingTitle(true);
            }}
          >
            <h3>
              {podcastData.title} <span>{podcastData.titleSpan}</span>
            </h3>
            <button className="edit-title-button">Edit Title</button>
          </div>
        ) : (
          <div className="podcast-title-edit">
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

      <div className="podcast-info">
        <p>Current Podcast Embed Codes: {podcastData.podcasts.length}</p>
      </div>

      <form onSubmit={handleUpload} className="podcast-upload-form">
        <div className="form-group">
          <label>Upload Podcast Embed Codes</label>
          {embedCodes.map((code, index) => (
            <div key={index} className="podcast-input-group">
              <textarea
                placeholder="Paste Podcast Embed Code (Iframe)"
                value={code}
                onChange={(e) => handleEmbedCodeChange(index, e.target.value)}
                className="podcast-embed-input"
                rows="4"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const newEmbedCodes = [...embedCodes];
                  newEmbedCodes.splice(index, 1);
                  setEmbedCodes(newEmbedCodes);
                }}
                className="remove-podcast-button"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddPodcastInput}
            className="add-podcast-button"
          >
            Add Another Podcast Embed Code
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || embedCodes.length === 0}
          className="upload-button"
        >
          {loading ? "Uploading..." : "Upload Podcast Embed Codes"}
        </button>
      </form>

      {message && (
        <div
          className={`message ${
            message.includes("Failed") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

      <div className="podcast-list">
        <h3>Current Podcast Embed Codes</h3>
        {podcastData.podcasts.length === 0 ? (
          <p>No podcast embed codes uploaded yet</p>
        ) : (
          <div className="podcasts-grid">
            {podcastData.podcasts.map((podcast, index) => (
              <div key={index} className="podcast-item">
                <div
                  className="podcast-embed"
                  dangerouslySetInnerHTML={{ __html: podcast.embedCode }}
                />
                <div className="podcast-actions">
                  <button
                    onClick={() => handleDeletePodcast(index)}
                    className="delete-podcast-button"
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

export default PodcastUpload;
