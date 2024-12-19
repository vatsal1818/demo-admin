import React, { useState, useEffect } from "react";
import axios from "axios";
import "./HomePage2.css";
import { HOME_PAGE_2 } from "../../Helper/Api_helpers";

const HomePage2 = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [sections, setSections] = useState([
    {
      iconImage: null,
      iconPreview: null,
      sectionTitle: "",
      sectionParagraph: "",
    },
    {
      iconImage: null,
      iconPreview: null,
      sectionTitle: "",
      sectionParagraph: "",
    },
    {
      iconImage: null,
      iconPreview: null,
      sectionTitle: "",
      sectionParagraph: "",
    },
    {
      iconImage: null,
      iconPreview: null,
      sectionTitle: "",
      sectionParagraph: "",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchContent();
    return () => {
      // Cleanup any Object URLs
      if (preview) URL.revokeObjectURL(preview);
      sections.forEach((section) => {
        if (section.iconPreview) URL.revokeObjectURL(section.iconPreview);
      });
    };
  }, []);

  const fetchContent = async () => {
    try {
      const response = await axios.get(HOME_PAGE_2);
      const data = response.data;

      setImage(null);
      setPreview(data.imageUrl || "");
      setTitle(data.title || "");
      setParagraph(data.paragraph || "");

      const fetchedSections = data.sections || [];
      const updatedSections = fetchedSections.map((section) => ({
        iconImage: null,
        iconPreview: section.iconImage || null,
        sectionTitle: section.sectionTitle || "",
        sectionParagraph: section.sectionParagraph || "",
      }));
      setSections(updatedSections);
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

  const handleSectionChange = (index, field, value) => {
    const updatedSections = [...sections];
    updatedSections[index][field] = value;
    setSections(updatedSections);
  };

  const handleSectionIconChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const updatedSections = [...sections];
      updatedSections[index].iconPreview = URL.createObjectURL(file);
      updatedSections[index].iconImage = file;
      setSections(updatedSections);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      if (image) formData.append("image", image); // Add the main image
      formData.append("title", title);
      formData.append("paragraph", paragraph);

      const updatedSections = sections.map((section, index) => {
        formData.append(
          `sections[${index}].iconImage`,
          section.iconImage || ""
        );
        return {
          sectionTitle: section.sectionTitle,
          sectionParagraph: section.sectionParagraph,
        };
      });

      formData.append("sections", JSON.stringify(updatedSections));

      const response = await axios.post(HOME_PAGE_2, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.status === "success") {
        setMessage("Content updated successfully!");
        fetchContent();
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
      <h1 className="admin-title">Admin Dashboard - Page 2</h1>
      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Upload Image</label>
          <input type="file" onChange={handleImageChange} accept="image/*" />
        </div>

        {preview && (
          <div className="preview-container">
            <h3>Preview</h3>
            <img src={preview} alt="Preview" className="preview-image" />
          </div>
        )}

        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Paragraph</label>
          <textarea
            value={paragraph}
            onChange={(e) => setParagraph(e.target.value)}
            required
          />
        </div>

        {sections.map((section, index) => (
          <div key={index} className="section-container">
            <div className="form-group">
              <label>Icon Image</label>
              <input
                type="file"
                onChange={(e) => handleSectionIconChange(index, e)}
                accept="image/*"
              />
            </div>

            {section.iconPreview && (
              <div className="preview-container">
                <img
                  src={section.iconPreview}
                  alt={`Section ${index} Icon`}
                  className="preview-image"
                />
              </div>
            )}

            <div className="form-group">
              <label>Section Title</label>
              <input
                type="text"
                value={section.sectionTitle}
                onChange={(e) =>
                  handleSectionChange(index, "sectionTitle", e.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Section Paragraph</label>
              <textarea
                value={section.sectionParagraph}
                onChange={(e) =>
                  handleSectionChange(index, "sectionParagraph", e.target.value)
                }
                required
              />
            </div>
          </div>
        ))}

        <button type="submit" disabled={loading}>
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
    </div>
  );
};

export default HomePage2;
