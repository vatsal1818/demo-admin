import React, { useState, useEffect } from "react";
import axios from "axios";
import "./YoutubeCourse.css";
import { ADMIN_UPLOADS } from "../../Helper/Api_helpers";
import SocialStats from "../../Pages/SocialStats/SocialStats";

const YoutubeCourse = () => {
  const [title, setTitle] = useState("");
  const [upperTitle, setUpperTitle] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [button, setButton] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await axios.get(ADMIN_UPLOADS);
      setTitle(response.data.title);
      setUpperTitle(response.data.upperTitle);
      setParagraph(response.data.paragraph);
      setButton(response.data.button);
      setPreview(response.data.imageUrl);
    } catch (error) {
      console.error("Error fetching content:", error);
      setMessage("Failed to load current content");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("upperTitle", upperTitle);
      formData.append("paragraph", paragraph);
      formData.append("button", button);
      if (image) {
        formData.append("image", image);
      }

      const response = await axios.post(ADMIN_UPLOADS, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        setMessage("Content updated successfully!");
        setPreview(response.data.data.imageUrl);
      }
    } catch (error) {
      console.error("Error updating content:", error);
      setMessage(error.response?.data?.message || "Failed to update content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Website Upper Title</label>
          <input
            type="text"
            value={upperTitle}
            onChange={(e) => setUpperTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Website Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Website Paragraph</label>
          <input
            type="text"
            value={paragraph}
            onChange={(e) => setParagraph(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Button Text</label>
          <input
            type="text"
            value={button}
            onChange={(e) => setButton(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Upload Image</label>
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="form-input"
          />
        </div>

        {preview && (
          <div className="preview-container">
            <h3>Preview</h3>
            <img src={preview} alt="Preview" className="preview-image" />
          </div>
        )}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? "Updating..." : "Update Content"}
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
      <SocialStats />
    </div>
  );
};

export default YoutubeCourse;
