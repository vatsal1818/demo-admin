import React, { useState, useEffect } from "react";
import { COURSES } from "../../Helper/Api_helpers";
import "./CourseUpdate.css";

const CourseUpdate = ({ course, onBack }) => {
  const [courseData, setCourseData] = useState({
    courseName: course?.courseName || "",
    courseDescription: course?.courseDescription || "",
    price: course?.price || 0,
    offerPrice: course?.offerPrice || 0,
    expiryDate: course?.expiryDate
      ? new Date(course.expiryDate).toISOString().split("T")[0]
      : "",
    validityPeriod: {
      duration: course?.validityPeriod?.duration || "",
      unit: course?.validityPeriod?.unit || "days",
    },
    thumbnail: null,
    video: null,
  });
  const [contentItems, setContentItems] = useState(course?.content || []);
  const [newContent, setNewContent] = useState({
    title: "",
    description: "",
    thumbnail: null,
    video: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({
    thumbnail: null,
    video: null,
    courseThumbnail: null,
  });

  const handleInputChange = (e, type) => {
    const { name, value } = e.target;
    if (type === "course") {
      if (name === "validityDuration" || name === "validityUnit") {
        setCourseData((prev) => ({
          ...prev,
          validityPeriod: {
            ...prev.validityPeriod,
            [name === "validityDuration" ? "duration" : "unit"]: value,
          },
        }));
      } else {
        setCourseData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setNewContent((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (field === "thumbnail") {
        setCourseData((prev) => ({ ...prev, thumbnail: file }));
        setSelectedFiles((prev) => ({
          ...prev,
          courseThumbnailUrl: file.name,
        }));
      } else if (field === "video") {
        setCourseData((prev) => ({ ...prev, video: file }));
        setSelectedFiles((prev) => ({
          ...prev,
          courseVideoUrl: file.name,
        }));
      } else {
        setNewContent((prev) => ({ ...prev, [field]: file }));
        setSelectedFiles((prev) => ({
          ...prev,
          [field]: file.name,
        }));
      }
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("courseName", courseData.courseName);
      formData.append("courseDescription", courseData.courseDescription);
      formData.append("price", courseData.price);
      formData.append("offerPrice", courseData.offerPrice);
      formData.append("expiryDate", courseData.expiryDate);
      formData.append(
        "validityPeriod[duration]",
        courseData.validityPeriod.duration
      );
      formData.append("validityPeriod[unit]", courseData.validityPeriod.unit);

      // Append thumbnail if a new file is selected
      if (courseData.thumbnail) {
        formData.append("thumbnail", courseData.thumbnail);
      }

      if (courseData.video) {
        formData.append("video", courseData.video);
      }

      const response = await fetch(`${COURSES}/${course._id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update course");
      }

      const data = await response.json();
      alert("Course updated successfully!");

      // Optional: Update the local state with the new course data
      // This assumes the backend returns the updated course object
      // If the backend returns the updated course, you can update the parent component's state
      // onCourseUpdate(data.data);
    } catch (error) {
      setError(error.message);
      console.error("Error updating course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate required files
    if (!newContent.thumbnail || !newContent.video) {
      setError("Both thumbnail and video files are required");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("title", newContent.title);
    formData.append("description", newContent.description);
    formData.append("thumbnail", newContent.thumbnail);
    formData.append("video", newContent.video);

    try {
      const response = await fetch(`${COURSES}/${course._id}/content`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add content");
      }

      const data = await response.json();
      setContentItems((prev) => [...prev, data.data]);
      setNewContent({
        title: "",
        description: "",
        thumbnail: null,
        video: null,
      });
      setSelectedFiles({
        thumbnail: null,
        video: null,
      });
      alert("Content added successfully!");
    } catch (error) {
      setError(error.message);
      console.error("Error adding content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="course-update-container">
      <button onClick={onBack} className="back-button">
        ← Back to Courses
      </button>

      <div className="course-header">
        <h2>Update Course: {course?.courseName}</h2>
        {error && <div className="error-message">{error}</div>}
      </div>

      <form onSubmit={handleUpdateCourse} className="update-form">
        <div className="form-group">
          <label>Course Name</label>
          <input
            type="text"
            name="courseName"
            value={courseData.courseName}
            onChange={(e) => handleInputChange(e, "course")}
            required
          />
        </div>
        <div className="form-group">
          <label>Course Thumbnail</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, "thumbnail")}
          />
          {selectedFiles.courseThumbnail && (
            <span className="file-name">{selectedFiles.courseThumbnail}</span>
          )}
          {course.courseThumbnailUrl && (
            <div className="current-thumbnail">
              <p>Current Thumbnail:</p>
              <img
                src={course.courseThumbnailUrl}
                alt="Current Course Thumbnail"
                style={{
                  maxWidth: "200px",
                  maxHeight: "200px",
                  marginTop: "10px",
                }}
              />
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Course video</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange(e, "video", "course")}
            className="form-input"
          />
          {selectedFiles.coursVideoUrl && (
            <span className="file-name">{selectedFiles.courseVideoUrl}</span>
          )}
          {course.courseVideoUrl && (
            <div className="current-thumbnail">
              <p>Current Thumbnail:</p>
              <img
                src={course.courseThumbnailUrl}
                alt="Current Course Thumbnail"
                style={{
                  maxWidth: "200px",
                  maxHeight: "200px",
                  marginTop: "10px",
                }}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Course Description</label>
          <input
            type="text"
            name="courseDescription"
            value={courseData.courseDescription}
            onChange={(e) => handleInputChange(e, "course")}
            required
          />
        </div>
        <div className="form-group">
          <label>Price</label>
          <input
            type="number"
            name="price"
            value={courseData.price}
            onChange={(e) => handleInputChange(e, "course")}
            required
          />
        </div>

        <div className="form-group">
          <label>Offer Price</label>
          <input
            type="number"
            name="offerPrice"
            value={courseData.offerPrice}
            onChange={(e) => handleInputChange(e, "course")}
          />
        </div>

        <div className="form-group">
          <label>Expiry Date</label>
          <input
            type="date"
            name="expiryDate"
            value={courseData.expiryDate}
            onChange={(e) => handleInputChange(e, "course")}
            required
          />
        </div>
        <div className="form-group validity-period">
          <label>Validity Period</label>
          <div className="validity-inputs">
            <input
              type="number"
              name="validityDuration"
              value={courseData.validityPeriod.duration}
              onChange={(e) => handleInputChange(e, "course")}
              min="1"
              required
              className="validity-duration"
            />
            <select
              name="validityUnit"
              value={courseData.validityPeriod.unit}
              onChange={(e) => handleInputChange(e, "course")}
              className="validity-unit"
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className={isLoading ? "loading" : ""}
          disabled={isLoading}
        >
          {isLoading ? "Updating..." : "Update Course Details"}
        </button>
      </form>

      <div className="content-section">
        <div className="add-content-section">
          <h3>Add New Content</h3>
          <form onSubmit={handleAddContent} className="add-content-form">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={newContent.title}
                onChange={(e) => handleInputChange(e, "content")}
                required
              />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={newContent.description}
                onChange={(e) => handleInputChange(e, "content")}
                required
              />
            </div>
            <div className="form-group">
              <label>
                Thumbnail *{" "}
                {!newContent.thumbnail && (
                  <span className="required-field">Required</span>
                )}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "thumbnail")}
                required
              />
              {selectedFiles.thumbnail && (
                <span className="file-name">{selectedFiles.thumbnail}</span>
              )}
            </div>
            <div className="form-group">
              <label>
                Video *{" "}
                {!newContent.video && (
                  <span className="required-field">Required</span>
                )}
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e, "video")}
                required
              />
              {selectedFiles.video && (
                <span className="file-name">{selectedFiles.video}</span>
              )}
            </div>
            {error && <div className="error-message">{error}</div>}
            <button
              type="submit"
              className={isLoading ? "loading" : ""}
              disabled={isLoading || !newContent.thumbnail || !newContent.video}
            >
              {isLoading ? "Adding..." : "Add Content"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CourseUpdate;
