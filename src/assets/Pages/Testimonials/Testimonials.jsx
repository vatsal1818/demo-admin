import React, { useState, useEffect } from "react";
import axios from "axios";
import { ADMIN_TESTIMONIALS } from "../../Helper/Api_helpers";
import "./Testimonials.css";

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [newTestimonial, setNewTestimonial] = useState({
    name: "",
    comment: "",
  });
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchContent();
  }, [page]);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${ADMIN_TESTIMONIALS}?page=${page}`);
      setTestimonials(response.data.data.testimonials || []);
      setTotalPages(response.data.data.totalPages);
    } catch (error) {
      console.error("Error fetching content:", error);
      setMessage({
        type: "error",
        text: "Failed to load current content",
      });
    }
  };

  const handleTestimonialChange = (e) => {
    const { name, value } = e.target;
    if (editingTestimonial) {
      setEditingTestimonial((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setNewTestimonial((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTestimonialSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("name", newTestimonial.name);
      formData.append("comment", newTestimonial.comment);

      const response = await axios.post(ADMIN_TESTIMONIALS, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        setMessage({
          type: "success",
          text: "Testimonial added successfully!",
        });
        fetchContent();
        setNewTestimonial({
          name: "",
          comment: "",
        });
      }
    } catch (error) {
      console.error("Error adding testimonial:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to add testimonial",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this testimonial?")) {
      try {
        await axios.delete(`${ADMIN_TESTIMONIALS}/${id}`);
        setMessage({
          type: "success",
          text: "Testimonial deleted successfully!",
        });
        fetchContent();
      } catch (error) {
        console.error("Error deleting testimonial:", error);
        setMessage({
          type: "error",
          text: "Failed to delete testimonial",
        });
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingTestimonial) return;

    try {
      const response = await axios.put(
        `${ADMIN_TESTIMONIALS}/${editingTestimonial._id}`,
        editingTestimonial
      );

      if (response.data.status === "success") {
        setMessage({
          type: "success",
          text: "Testimonial updated successfully!",
        });
        setEditingTestimonial(null);
        fetchContent();
      }
    } catch (error) {
      console.error("Error updating testimonial:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update testimonial",
      });
    }
  };

  return (
    <div className="testimonials-container">
      <h2 className="testimonials-title">Testimonials Manager</h2>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <form
        className="testimonial-form"
        onSubmit={editingTestimonial ? handleUpdate : handleTestimonialSubmit}
      >
        <h3 className="form-title">
          {editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
        </h3>

        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={
              editingTestimonial ? editingTestimonial.name : newTestimonial.name
            }
            onChange={handleTestimonialChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Comment</label>
          <textarea
            name="comment"
            value={
              editingTestimonial
                ? editingTestimonial.comment
                : newTestimonial.comment
            }
            onChange={handleTestimonialChange}
            required
          />
        </div>

        <div className="button-group">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Processing..." : editingTestimonial ? "Update" : "Add"}{" "}
            Testimonial
          </button>

          {editingTestimonial && (
            <button
              type="button"
              onClick={() => setEditingTestimonial(null)}
              className="btn btn-secondary"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="testimonials-list">
        {testimonials.map((testimonial) => (
          <div key={testimonial._id} className="testimonial-item">
            <div className="testimonial-header">
              <h4 className="testimonial-name">{testimonial.name}</h4>
              <div className="testimonial-actions">
                <button
                  onClick={() => setEditingTestimonial(testimonial)}
                  className="action-btn edit"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(testimonial._id)}
                  className="action-btn delete"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="testimonial-comment">{testimonial.comment}</p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Testimonials;
