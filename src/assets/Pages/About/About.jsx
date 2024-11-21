import React, { useState, useEffect } from "react";
import axios from "axios";
import { ADMIN_ABOUT_US, ADMIN_WHY_CHOOSE_US } from "../../Helper/Api_helpers";

const About = () => {
  const [title, setTitle] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [button, setButton] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [aboutMessage, setAboutMessage] = useState("");

  const [whyChooseTitle, setWhyChooseTitle] = useState("");
  const [reasons, setReasons] = useState([
    { title: "", description: "" },
    { title: "", description: "" },
    { title: "", description: "" },
  ]);
  const [whyChooseLoading, setWhyChooseLoading] = useState(false);
  const [whyChooseMessage, setWhyChooseMessage] = useState("");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Fetch About Us content
      const aboutResponse = await axios.get(ADMIN_ABOUT_US);
      setTitle(aboutResponse.data.title);
      setParagraph(aboutResponse.data.paragraph);
      setButton(aboutResponse.data.button);
      setPreview(aboutResponse.data.imageUrl);

      // Fetch Why Choose Us content
      const whyChooseResponse = await axios.get(ADMIN_WHY_CHOOSE_US);
      if (whyChooseResponse.data) {
        setWhyChooseTitle(whyChooseResponse.data.title);
        setReasons(
          whyChooseResponse.data.reasons || [
            { title: "", description: "" },
            { title: "", description: "" },
            { title: "", description: "" },
          ]
        );
      }
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

  const handleReasonChange = (index, field, value) => {
    const updatedReasons = [...reasons];
    updatedReasons[index] = {
      ...updatedReasons[index],
      [field]: value,
    };
    setReasons(updatedReasons);
  };

  const handleAboutSubmit = async (e) => {
    e.preventDefault();
    setAboutLoading(true);
    setAboutMessage("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("paragraph", paragraph);
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

  const handleWhyChooseSubmit = async (e) => {
    e.preventDefault();
    setWhyChooseLoading(true);
    setWhyChooseMessage("");

    try {
      const response = await axios.post(ADMIN_WHY_CHOOSE_US, {
        title: whyChooseTitle,
        reasons: reasons,
      });

      if (response.data.status === "success") {
        setWhyChooseMessage("Why Choose Us content updated successfully!");
      }
    } catch (error) {
      console.error("Error updating Why Choose Us content:", error);
      setWhyChooseMessage(
        error.response?.data?.message ||
          "Failed to update Why Choose Us content"
      );
    } finally {
      setWhyChooseLoading(false);
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
              className="file-input"
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

      <div className="section-container">
        <h2 className="section-title">Why Choose Us</h2>
        <form onSubmit={handleWhyChooseSubmit} className="admin-form">
          <div className="form-group">
            <label>Section Title</label>
            <input
              type="text"
              value={whyChooseTitle}
              onChange={(e) => setWhyChooseTitle(e.target.value)}
              required
              placeholder="Why Choose Us"
            />
          </div>

          {reasons.map((reason, index) => (
            <div key={index} className="reason-container">
              <h3>Reason {index + 1}</h3>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={reason.title}
                  onChange={(e) =>
                    handleReasonChange(index, "title", e.target.value)
                  }
                  required
                  placeholder={`Reason ${index + 1} Title`}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={reason.description}
                  onChange={(e) =>
                    handleReasonChange(index, "description", e.target.value)
                  }
                  required
                  rows={3}
                  placeholder={`Reason ${index + 1} Description`}
                />
              </div>
            </div>
          ))}

          {whyChooseMessage && (
            <div
              className={`message ${
                whyChooseMessage.includes("Failed") ? "error" : "success"
              }`}
            >
              {whyChooseMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={whyChooseLoading}
            className="submit-button"
          >
            {whyChooseLoading ? "Updating..." : "Update Why Choose Us"}
          </button>
        </form>
      </div>
    </div>
  );
};
export default About;
