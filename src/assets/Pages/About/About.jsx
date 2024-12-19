import React, { useState, useEffect } from "react";
import axios from "axios";
import { ADMIN_ABOUT_US } from "../../Helper/Api_helpers";
import About2 from "./About2";

const About = () => {
  const [title, setTitle] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [experience, setExperience] = useState("");
  const [experienceSpan, setExperienceSpan] = useState("");
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
      const aboutResponse = await axios.get(ADMIN_ABOUT_US);
      setTitle(aboutResponse.data.title);
      setParagraph(aboutResponse.data.paragraph);
      setExperience(aboutResponse.data.experience);
      setExperienceSpan(aboutResponse.data.experienceSpan);
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
      formData.append("paragraph", paragraph);
      formData.append("experience", experience);
      formData.append("experienceSpan", experienceSpan);
      formData.append("button", button);
      if (image) {
        formData.append("image", image);
      }

      const response = await axios.post(ADMIN_ABOUT_US, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        setAboutMessage("About Us content updated successfully!");
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
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="section-container">
        <h2 className="section-title">About Us Content</h2>
        <form onSubmit={handleAboutSubmit} className="admin-form">
          <div className="form-group">
            <label>About Us Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>About Us Paragraph</label>
            <textarea
              value={paragraph}
              onChange={(e) => setParagraph(e.target.value)}
              required
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Experience (highlighted part)</label>
            <input
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Experience Span</label>
            <input
              value={experienceSpan}
              onChange={(e) => setExperienceSpan(e.target.value)}
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

          {aboutMessage && (
            <div
              className={`message ${
                aboutMessage.includes("Failed") ? "error" : "success"
              }`}
            >
              {aboutMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={aboutLoading}
            className="submit-button"
          >
            {aboutLoading ? "Updating..." : "Update About Us"}
          </button>
        </form>
      </div>
      <About2 />
    </div>
  );
};
export default About;
