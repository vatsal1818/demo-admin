import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ADMIN_SOCIAL_STATS,
  INSTA_COUNT,
  TELEGRAM_COUNT,
  YOUTUBE_COUNT,
} from "../../Helper/Api_helpers";
import "./SocialStats.css";

const SocialStats = () => {
  const [platforms, setPlatforms] = useState({
    youtube: {
      title: "YouTube Subscribers",
      channelId: "",
    },
    instagram: {
      title: "Instagram Followers",
      username: "",
    },
    telegram: {
      title: "Telegram Subscribers",
      channelId: "",
    },
    playstore: {
      title: "Play Store Downloads",
      count: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchExistingStats();
  }, []);

  const fetchExistingStats = async () => {
    try {
      const response = await axios.get(ADMIN_SOCIAL_STATS);
      setPlatforms(response.data);
    } catch (error) {
      setMessage("Failed to load current social stats");
    }
  };

  const testPlatformCredentials = async (platform, identifier) => {
    if (!identifier) {
      setMessage(`Please enter a ${platform} identifier first`);
      return;
    }

    try {
      let response;
      switch (platform) {
        case "youtube":
          response = await axios.get(`${YOUTUBE_COUNT}/${identifier}`);
          setMessage(`YouTube channel ID is valid!`);
          break;
        case "instagram":
          response = await axios.get(`${INSTA_COUNT}/${identifier}`);
          setMessage(`Instagram username is valid!`);
          break;
        case "telegram":
          response = await axios.get(`${TELEGRAM_COUNT}/${identifier}`);
          setMessage(`Telegram channel ID is valid!`);
          break;
      }
    } catch (error) {
      setMessage(
        `Invalid ${platform} credentials: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(ADMIN_SOCIAL_STATS, platforms);

      if (response.data.status === "success") {
        setMessage("Social platform configurations updated successfully!");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to update configurations"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Social Stats Configuration</h1>

      <form onSubmit={handleSubmit} className="admin-form">
        {/* YouTube Section */}
        <div className="form-group">
          <label>YouTube Title</label>
          <input
            type="text"
            value={platforms.youtube.title}
            onChange={(e) =>
              setPlatforms((prev) => ({
                ...prev,
                youtube: { ...prev.youtube, title: e.target.value },
              }))
            }
            placeholder="Enter YouTube stat title"
          />
          <label>YouTube Channel ID</label>
          <div className="input-with-button">
            <input
              type="text"
              value={platforms.youtube.channelId}
              onChange={(e) =>
                setPlatforms((prev) => ({
                  ...prev,
                  youtube: { ...prev.youtube, channelId: e.target.value },
                }))
              }
              placeholder="Enter YouTube Channel ID (optional)"
            />
            <button
              type="button"
              onClick={() =>
                testPlatformCredentials("youtube", platforms.youtube.channelId)
              }
              className="fetch-button"
              disabled={!platforms.youtube.channelId}
            >
              Test ID
            </button>
          </div>
        </div>

        {/* Instagram Section */}
        <div className="form-group">
          <label>Instagram Title</label>
          <input
            type="text"
            value={platforms.instagram.title}
            onChange={(e) =>
              setPlatforms((prev) => ({
                ...prev,
                instagram: { ...prev.instagram, title: e.target.value },
              }))
            }
            placeholder="Enter Instagram stat title"
          />
          <label>Instagram Username</label>
          <div className="input-with-button">
            <input
              type="text"
              value={platforms.instagram.username}
              onChange={(e) =>
                setPlatforms((prev) => ({
                  ...prev,
                  instagram: { ...prev.instagram, username: e.target.value },
                }))
              }
              placeholder="Enter Instagram Username (optional)"
            />
            <button
              type="button"
              onClick={() =>
                testPlatformCredentials(
                  "instagram",
                  platforms.instagram.username
                )
              }
              className="fetch-button"
              disabled={!platforms.instagram.username}
            >
              Test Username
            </button>
          </div>
        </div>

        {/* Telegram Section */}
        <div className="form-group">
          <label>Telegram Title</label>
          <input
            type="text"
            value={platforms.telegram.title}
            onChange={(e) =>
              setPlatforms((prev) => ({
                ...prev,
                telegram: { ...prev.telegram, title: e.target.value },
              }))
            }
            placeholder="Enter Telegram stat title"
          />
          <label>Telegram Channel ID</label>
          <div className="input-with-button">
            <input
              type="text"
              value={platforms.telegram.channelId}
              onChange={(e) =>
                setPlatforms((prev) => ({
                  ...prev,
                  telegram: { ...prev.telegram, channelId: e.target.value },
                }))
              }
              placeholder="Enter Telegram Channel ID (optional)"
            />
            <button
              type="button"
              onClick={() =>
                testPlatformCredentials(
                  "telegram",
                  platforms.telegram.channelId
                )
              }
              className="fetch-button"
              disabled={!platforms.telegram.channelId}
            >
              Test ID
            </button>
          </div>
        </div>

        {/* Play Store Section */}
        <div className="form-group">
          <label>Play Store Title</label>
          <input
            type="text"
            value={platforms.playstore.title}
            onChange={(e) =>
              setPlatforms((prev) => ({
                ...prev,
                playstore: { ...prev.playstore, title: e.target.value },
              }))
            }
            placeholder="Enter Play Store stat title"
          />
          <label>Play Store Downloads</label>
          <input
            type="number"
            value={platforms.playstore.count}
            onChange={(e) =>
              setPlatforms((prev) => ({
                ...prev,
                playstore: {
                  ...prev.playstore,
                  count: parseInt(e.target.value) || 0,
                },
              }))
            }
            placeholder="Enter download count (optional)"
          />
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? "Updating..." : "Save Configuration"}
        </button>
      </form>

      {message && (
        <div
          className={`message ${
            message.includes("Failed") || message.includes("Invalid")
              ? "error"
              : "success"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default SocialStats;
