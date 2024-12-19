import React, { useState, useEffect } from "react";
import axios from "axios";
import "./SocialStats.css";
import { ADMIN_SOCIAL_STATS } from "../../Helper/Api_helpers";

const SocialStats = () => {
  // State for each social platform
  const [youtube, setYoutube] = useState({
    title: "YouTube Subscribers",
    count: 0,
  });
  const [instagram, setInstagram] = useState({
    title: "Instagram Followers",
    count: 0,
  });
  const [telegram, setTelegram] = useState({
    title: "Telegram Subscribers",
    count: 0,
  });
  const [playstore, setPlaystore] = useState({
    title: "Play Store Downloads",
    count: 0,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch existing stats on component mount
  useEffect(() => {
    fetchSocialStats();
  }, []);

  const fetchSocialStats = async () => {
    try {
      const response = await axios.get(ADMIN_SOCIAL_STATS);
      const { youtube, instagram, telegram, playstore } = response.data;

      setYoutube(youtube);
      setInstagram(instagram);
      setTelegram(telegram);
      setPlaystore(playstore);
    } catch (error) {
      console.error("Error fetching social stats:", error);
      setMessage("Failed to load current social stats");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(ADMIN_SOCIAL_STATS, {
        youtube,
        instagram,
        telegram,
        playstore,
      });

      if (response.data.status === "success") {
        setMessage("Social stats updated successfully!");
      }
    } catch (error) {
      console.error("Error updating social stats:", error);
      setMessage(
        error.response?.data?.message || "Failed to update social stats"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Social Stats Dashboard</h1>

      <form onSubmit={handleSubmit} className="admin-form">
        {/* YouTube Section */}
        <div className="form-group">
          <label>YouTube Title</label>
          <input
            type="text"
            value={youtube.title}
            onChange={(e) =>
              setYoutube((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            required
          />
          <label>YouTube Subscribers</label>
          <input
            type="number"
            value={youtube.count}
            onChange={(e) =>
              setYoutube((prev) => ({
                ...prev,
                count: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        {/* Instagram Section */}
        <div className="form-group">
          <label>Instagram Title</label>
          <input
            type="text"
            value={instagram.title}
            onChange={(e) =>
              setInstagram((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            required
          />
          <label>Instagram Followers</label>
          <input
            type="number"
            value={instagram.count}
            onChange={(e) =>
              setInstagram((prev) => ({
                ...prev,
                count: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        {/* Telegram Section */}
        <div className="form-group">
          <label>Telegram Title</label>
          <input
            type="text"
            value={telegram.title}
            onChange={(e) =>
              setTelegram((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            required
          />
          <label>Telegram Subscribers</label>
          <input
            type="number"
            value={telegram.count}
            onChange={(e) =>
              setTelegram((prev) => ({
                ...prev,
                count: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        {/* Play Store Section */}
        <div className="form-group">
          <label>Play Store Title</label>
          <input
            type="text"
            value={playstore.title}
            onChange={(e) =>
              setPlaystore((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            required
          />
          <label>Play Store Downloads</label>
          <input
            type="number"
            value={playstore.count}
            onChange={(e) =>
              setPlaystore((prev) => ({
                ...prev,
                count: parseInt(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? "Updating..." : "Update Social Stats"}
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
    </div>
  );
};

export default SocialStats;
