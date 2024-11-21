import React, { useState, useEffect } from "react";
import { COURSES } from "../../Helper/Api_helpers";
import { Trash2 } from "lucide-react";
import "./CourseList.css";
import CourseUpdate from "./CourseUpdate";

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [comments, setComments] = useState([]); // State for comments
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getExpiryStatus = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: "expired", className: "expired" };
    } else if (daysUntilExpiry <= 30) {
      return { status: "expiring-soon", className: "expiring-soon" };
    }
    return { status: "active", className: "active" };
  };

  const getRemainingDays = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return "Expired";
    } else if (daysRemaining === 0) {
      return "Expires today";
    } else if (daysRemaining === 1) {
      return "1 day remaining";
    }
    return `${daysRemaining} days remaining`;
  };

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

      // Fetch comments for the course
      const commentsResponse = await fetch(`${COURSES}/${courseId}/comments`, {
        method: "GET",
        credentials: "include",
      });

      if (!commentsResponse.ok) {
        throw new Error("Failed to fetch comments");
      }

      const commentsData = await commentsResponse.json();
      setComments(commentsData.data);
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

        fetchCourseDetails(courseId);
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleDeleteComment = async (commentId, courseId) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      const response = await fetch(
        `${COURSES}/${courseId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete comment");
      }

      setComments((prevComments) =>
        prevComments.filter((comment) => comment._id !== commentId)
      );
    } catch (err) {
      console.error("Error deleting comment:", err);
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
    setComments([]);
    fetchCourses();
  };

  // Separate active and expired courses
  const separateCourses = () => {
    const activeCourses = [];
    const expiredCourses = [];

    courses.forEach((course) => {
      const now = new Date();
      const expiry = new Date(course.expiryDate);
      if (expiry < now) {
        expiredCourses.push(course);
      } else {
        activeCourses.push(course);
      }
    });

    return { activeCourses, expiredCourses };
  };

  const renderCourseGrid = (coursesToRender) => {
    return (
      <div className="course-grid">
        {coursesToRender.map((course) => {
          const expiryStatus = getExpiryStatus(course.expiryDate);
          return (
            <div
              key={course._id}
              className={`course-card ${expiryStatus.className}`}
            >
              <h3 className="course-name">{course.courseName}</h3>
              <p className="course-price">${course.price}</p>
              <p className="course-status">Status: {course.status}</p>
              <p className={`expiry-status ${expiryStatus.className}`}>
                {getRemainingDays(course.expiryDate)}
              </p>
              <p className="expiry-date">
                Expires: {formatDate(course.expiryDate)}
              </p>
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
          );
        })}
      </div>
    );
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
    const expiryStatus = getExpiryStatus(selectedCourse.expiryDate);
    return (
      <div className="course-details">
        <button onClick={handleBack} className="back-button">
          Back to Courses
        </button>
        <h2>{selectedCourse.courseName}</h2>
        <div className="course-info">
          <p className="course-price">Price: ${selectedCourse.price}</p>
          <p className={`expiry-date ${expiryStatus.className}`}>
            Expiry Date: {formatDate(selectedCourse.expiryDate)}
            <span className="remaining-days">
              ({getRemainingDays(selectedCourse.expiryDate)})
            </span>
          </p>
        </div>
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
        <h3>Comments:</h3>
        {comments.length > 0 ? (
          <ul className="comment-list">
            {comments.map((comment) => (
              <li key={comment._id} className="comment-item">
                <p>
                  <strong>{comment.user.username}</strong>: {comment.content}
                </p>
                <p className="comment-date">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
                <button
                  onClick={() => handleDeleteComment(comment._id)}
                  className="delete-comment-btn"
                  title="Delete comment"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No comments available for this course.</p>
        )}
      </div>
    );
  }

  const { activeCourses, expiredCourses } = separateCourses();

  return (
    <div className="course-list-container">
      <h2 className="course-list-title">Available Courses</h2>
      {renderCourseGrid(activeCourses)}

      {expiredCourses.length > 0 && (
        <>
          <h2 className="course-list-title expired-title">Expired Courses</h2>
          {renderCourseGrid(expiredCourses)}
        </>
      )}
    </div>
  );
};

export default CourseList;
