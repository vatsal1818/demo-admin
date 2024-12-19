import React, { useState, useEffect } from "react";
import axios from "axios";
import { ADMIN_ABOUT_US_2 } from "../../Helper/Api_helpers";

const About2 = () => {
  const [title, setTitle] = useState("");
  const [titleSpan, setTitleSpan] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [button, setButton] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [aboutMessage, setAboutMessage] = useState("");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Fetch About Us content
      const aboutResponse = await axios.get(ADMIN_ABOUT_US_2);
      setTitle(aboutResponse.data.title);
      setTitleSpan(aboutResponse.data.titleSpan);
      setParagraph(aboutResponse.data.paragraph);
      setButton(aboutResponse.data.button);
      setPreview(aboutResponse.data.imageUrl);
    } catch (error) {
      console.error("Error fetching content:", error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a preview URL for the selected image
      setPreview(URL.createObjectURL(file));
      setImage(file);
    }
  };

  const handleAboutSubmit = async (e) => {
    e.preventDefault();
    setAboutLoading(true);
    setAboutMessage("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("titleSpan", titleSpan);
      formData.append("paragraph", paragraph);
      formData.append("button", button);
      if (image) {
        formData.append("image", image);
      }

      const response = await axios.post(ADMIN_ABOUT_US_2, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        setAboutMessage("About Us 2 content updated successfully!");
        setPreview(response.data.data.imageUrl);
      }
    } catch (error) {
      console.error("Error updating About Us content:", error);
      setAboutMessage(
        error.response?.data?.message || "Failed to update About Us content"
      );
    } finally {
      setAboutLoading(false);
    }
  };

  return (
    <div className="section-container">
      <h2 className="section-title">About Us Content 2</h2>
      <form onSubmit={handleAboutSubmit} className="admin-form">
        <div className="form-group">
          <label>About Us Title 2</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>About Us Title Span 2</label>
          <input
            type="text"
            value={titleSpan}
            onChange={(e) => setTitleSpan(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>About Us Paragraph 2</label>
          <textarea
            value={paragraph}
            onChange={(e) => setParagraph(e.target.value)}
            required
            rows={4}
          />
        </div>
        <div className="form-group">
          <label>Button Text 2</label>
          <input
            type="text"
            value={button}
            onChange={(e) => setButton(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Upload Image 2</label>
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="form-input"
          />
        </div>

        {preview && (
          <div className="preview-container">
            <h3>Preview 2</h3>
            <img src={preview} alt="Preview" className="preview-image" />
          </div>
        )}

        {aboutMessage && (
          <div
            className={`message ${
              aboutMessage.includes("Failed") ? "error" : "success"
            }`}
          >
            {aboutMessage}
          </div>
        )}

        <button type="submit" disabled={aboutLoading} className="submit-button">
          {aboutLoading ? "Updating... 2" : "Update About Us 2"}
        </button>
      </form>
    </div>
  );
};
export default About2;
