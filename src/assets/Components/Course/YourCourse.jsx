import React, { useState } from "react";
import "./Yourcourse.css";
import { COURSES } from "../../Helper/Api_helpers";

const AdminCourseCreation = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [courseData, setCourseData] = useState({
    courseName: "",
    price: "",
    expiryDate: "",
    validityPeriod: {
      duration: "",
      unit: "months",
    },
  });
  const [contentItems, setContentItems] = useState([]);
  const [currentContent, setCurrentContent] = useState({
    title: "",
    description: "",
    thumbnail: null,
    video: null,
  });

  const resetForm = () => {
    setCourseData({
      courseName: "",
      price: "",
      expiryDate: "",
      validityPeriod: {
        duration: "",
        unit: "months",
      },
    });
    setContentItems([]);
    setCurrentContent({
      title: "",
      description: "",
      thumbnail: null,
      video: null,
    });
    setCourseId(null);
    setStep(1);
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(COURSES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create course");
      }

      const data = await response.json();
      setCourseId(data.courseId);
      setStep(2);
      alert("Course created successfully! Now add content items.");
    } catch (error) {
      setError(error.message);
      console.error("Error creating course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("title", currentContent.title);
    formData.append("description", currentContent.description);
    if (currentContent.thumbnail)
      formData.append("thumbnail", currentContent.thumbnail);
    if (currentContent.video) formData.append("video", currentContent.video);

    try {
      const response = await fetch(`${COURSES}/${courseId}/content`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add course content");
      }

      const newContentItem = { ...currentContent, id: Date.now() };
      setContentItems([...contentItems, newContentItem]);
      setCurrentContent({
        title: "",
        description: "",
        thumbnail: null,
        video: null,
      });
      alert("Content item added successfully!");
    } catch (error) {
      setError(error.message);
      console.error("Error adding course content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setCurrentContent((prev) => ({ ...prev, [field]: file }));
    }
  };

  const handleInputChange = (e, type) => {
    const { name, value } = e.target;

    if (type === "validity") {
      setCourseData((prev) => ({
        ...prev,
        validityPeriod: {
          ...prev.validityPeriod,
          [name]: value,
        },
      }));
    } else if (type === "course") {
      setCourseData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setCurrentContent((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFinish = () => {
    alert("Course creation completed!");
    resetForm();
  };

  return (
    <div className="course-container">
      <div className="course-card">
        <h2 className="course-title">
          {step === 1 ? "Create New Course" : "Add Course Content"}
        </h2>

        {error && <div className="error-message">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleInitialSubmit} className="course-form">
            <div className="form-group">
              <label className="form-label">Course Name</label>
              <input
                type="text"
                name="courseName"
                value={courseData.courseName}
                onChange={(e) => handleInputChange(e, "course")}
                placeholder="Enter course name"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price</label>
              <input
                type="number"
                name="price"
                value={courseData.price}
                onChange={(e) => handleInputChange(e, "course")}
                placeholder="Enter price"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Course Validity Period</label>
              <div className="validity-inputs">
                <input
                  type="number"
                  name="duration"
                  value={courseData.validityPeriod.duration}
                  onChange={(e) => handleInputChange(e, "validity")}
                  placeholder="Duration"
                  required
                  min="1"
                  className="form-input duration-input"
                />
                <select
                  name="unit"
                  value={courseData.validityPeriod.unit}
                  onChange={(e) => handleInputChange(e, "validity")}
                  className="form-select unit-select"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={courseData.expiryDate}
                onChange={(e) => handleInputChange(e, "course")}
                min={new Date().toISOString().split("T")[0]}
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              className={`form-button ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              {isLoading && <span className="loading-spinner" />}
              Create Course
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleContentSubmit} className="course-form">
              <div className="form-group">
                <label className="form-label">Content Title</label>
                <input
                  type="text"
                  name="title"
                  value={currentContent.title}
                  onChange={(e) => handleInputChange(e, "content")}
                  placeholder="Enter content title"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Content Description</label>
                <textarea
                  name="description"
                  value={currentContent.description}
                  onChange={(e) => handleInputChange(e, "content")}
                  placeholder="Enter content description"
                  required
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thumbnail</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "thumbnail")}
                  className="file-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Video</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileChange(e, "video")}
                  className="file-input"
                />
              </div>

              <button
                type="submit"
                className={`form-button ${isLoading ? "loading" : ""}`}
                disabled={isLoading}
              >
                {isLoading && <span className="loading-spinner" />}
                Add Content Item
              </button>
            </form>

            <div className="content-list">
              <h3>Added Content Items:</h3>
              {contentItems.map((item, index) => (
                <div key={item.id} className="content-item">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>

            <button onClick={handleFinish} className="form-button">
              Finish Course Creation
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminCourseCreation;
