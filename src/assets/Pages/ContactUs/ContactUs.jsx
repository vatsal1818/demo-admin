import React, { useState, useEffect } from "react";
import axios from "axios";
import { ADMIN_CONTACT_US } from "../../Helper/Api_helpers";

const ContactUs = () => {
  const [content, setContent] = useState({
    title: "",
    titleSpan: "",
    paragraph: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await axios.get(ADMIN_CONTACT_US);
      if (response.data) {
        setContent(response.data);
      }
    } catch (error) {
      console.error("Error fetching contact content:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(ADMIN_CONTACT_US, content);

      if (response.data.status === "success") {
        setMessage("Contact Us content updated successfully!");
      }
    } catch (error) {
      console.error("Error updating Contact Us content:", error);
      setMessage(
        error.response?.data?.message || "Failed to update Contact Us content"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContent((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="section-container">
        <h2 className="section-title">Contact Us Content</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={content.title}
              onChange={handleChange}
              required
              placeholder="Main Title"
            />
          </div>

          <div className="form-group">
            <label>Title Span (Highlighted Part)</label>
            <input
              type="text"
              name="titleSpan"
              value={content.titleSpan}
              onChange={handleChange}
              required
              placeholder="Highlighted part of the title"
            />
          </div>

          <div className="form-group">
            <label>Paragraph</label>
            <textarea
              name="paragraph"
              value={content.paragraph}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Contact Us description"
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={content.email}
              onChange={handleChange}
              required
              placeholder="contact@example.com"
            />
          </div>

          {message && (
            <div
              className={`message ${
                message.includes("Failed") ? "error" : "success"
              }`}
            >
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? "Updating..." : "Update Contact Us"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactUs;
