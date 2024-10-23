import React, { useState, useEffect } from "react";
import { COURSES } from "../../Helper/Api_helpers";
import "./CourseList.css";
import CourseUpdate from "./CourseUpdate";

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(COURSES, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }

      const data = await response.json();
      setCourses(data.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${COURSES}/${courseId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch course details");
      }

      const data = await response.json();
      setSelectedCourse(data.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this course? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch(`${COURSES}/${courseId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to delete course");
        }

        // Remove the deleted course from state
        setCourses(courses.filter((course) => course._id !== courseId));
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleDeleteContent = async (courseId, contentId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this content? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch(
          `${COURSES}/${courseId}/content/${contentId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete content");
        }

        // Refresh course details
        fetchCourseDetails(courseId);
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleViewCourse = (courseId) => {
    fetchCourseDetails(courseId);
  };

  const handleUpdateCourse = (course) => {
    setSelectedCourse(course);
    setIsUpdating(true);
  };

  const handleBack = () => {
    setSelectedCourse(null);
    setIsUpdating(false);
    fetchCourses();
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (isUpdating) {
    return <CourseUpdate course={selectedCourse} onBack={handleBack} />;
  }

  if (selectedCourse) {
    return (
      <div className="course-details">
        <button onClick={handleBack} className="back-button">
          Back to Courses
        </button>
        <h2>{selectedCourse.courseName}</h2>
        <p className="course-price">Price: ${selectedCourse.price}</p>
        <h3>Course Content:</h3>
        {selectedCourse.content.map((item, index) => (
          <div key={index} className="content-item">
            <div className="content-header">
              <h4>{item.title}</h4>
              <button
                onClick={() =>
                  handleDeleteContent(selectedCourse._id, item._id)
                }
                className="delete-content-btn"
              >
                Delete Content
              </button>
            </div>
            {item.thumbnailUrl && (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="content-thumbnail"
              />
            )}
            <p className="content-description">{item.description}</p>
            {item.videoUrl && (
              <video src={item.videoUrl} controls className="content-video" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="course-list-container">
      <h2 className="course-list-title">Available Courses</h2>
      <div className="course-grid">
        {courses.map((course) => (
          <div key={course._id} className="course-card">
            <h3 className="course-name">{course.courseName}</h3>
            <p className="course-price">${course.price}</p>
            <p className="course-status">Status: {course.status}</p>
            <div className="course-actions">
              <button
                onClick={() => handleViewCourse(course._id)}
                className="view-course-btn"
              >
                View Course
              </button>
              <button
                onClick={() => handleUpdateCourse(course)}
                className="update-course-btn"
              >
                Update Course
              </button>
              <button
                onClick={() => handleDeleteCourse(course._id)}
                className="delete-course-btn"
              >
                Delete Course
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseList;
