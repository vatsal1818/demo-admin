import React, { useState, useEffect } from "react";
import { ADMIN_CHECK, COURSES } from "../../Helper/Api_helpers";
import { Trash2 } from "lucide-react";
import "./CourseList.css";
import CourseUpdate from "./CourseUpdate";
import ContentAttachments from "./ContentAttachment";

const CourseListExample = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState([]); // State for comments
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminReplyText, setAdminReplyText] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

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

  useEffect(() => {
    // Check if the user is an admin
    const checkAdminStatus = async () => {
      try {
        const response = await fetch(ADMIN_CHECK, {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };

    checkAdminStatus();
  }, []);

  const handleAdminReply = async (courseId, contentId, commentId) => {
    try {
      console.log(courseId, contentId, commentId);

      // Ensure all parameters are defined
      if (!courseId || !contentId || !commentId) {
        console.error("Missing required parameters for admin reply");
        return;
      }

      const replyContent = adminReplyText[commentId];

      // Validate reply content
      if (!replyContent || replyContent.trim() === "") {
        console.error("Reply content cannot be empty");
        return;
      }

      const response = await fetch(
        `${COURSES}/${courseId}/content/${contentId}/comments/${commentId}/reply`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({
            content: replyContent,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send admin reply");
      }

      const data = await response.json();

      // Update comments state to include the admin reply
      setComments((prev) => ({
        ...prev,
        [contentId]: prev[contentId].map((comment) =>
          comment._id === commentId ? data.data : comment
        ),
      }));

      // Clear the reply text
      setAdminReplyText((prev) => ({
        ...prev,
        [commentId]: "",
      }));
    } catch (error) {
      console.error("Error sending admin reply:", error);
      // Optionally show an error message to the user
    }
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

      // Fetch comments for each content item
      const contentComments = {};
      for (const content of data.data.content) {
        const commentsResponse = await fetch(
          `${COURSES}/${courseId}/content/${content._id}/comments`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!commentsResponse.ok) {
          throw new Error(
            `Failed to fetch comments for content ${content._id}`
          );
        }

        const commentsData = await commentsResponse.json();
        contentComments[content._id] = commentsData.data;
      }

      setComments(contentComments);
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

  const handleDeleteComment = async (contentId, commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      const response = await fetch(
        `${COURSES}/${selectedCourse._id}/content/${contentId}/comments/${commentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      // Update comments state by removing the deleted comment
      setComments((prevComments) => ({
        ...prevComments,
        [contentId]: prevComments[contentId].filter(
          (comment) => comment._id !== commentId
        ),
      }));
    } catch (error) {
      console.error("Error deleting comment:", error);
      // Optionally show an error message to the user
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
              <p className="course-price">Price: ${course.price}</p>
              <p className="course-price">Offer Price: ${course.offerPrice}</p>
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
          <p className="course-price">
            Offer Price: ${selectedCourse.offerPrice}
          </p>
          <p className={`expiry-date ${expiryStatus.className}`}>
            Expiry Date: {formatDate(selectedCourse.expiryDate)}
            <span className="remaining-days">
              ({getRemainingDays(selectedCourse.expiryDate)})
            </span>
          </p>
        </div>
        <h3>Course Content:</h3>
        {selectedCourse?.content.map((content) => (
          <div key={content._id} className="content-item">
            <div className="content-header">
              <h4>{content.title}</h4>
              <button
                onClick={() =>
                  handleDeleteContent(selectedCourse._id, content._id)
                }
                className="delete-content-btn"
              >
                Delete Content
              </button>
            </div>
            {content.thumbnailUrl && (
              <img
                src={content.thumbnailUrl}
                alt={content.title}
                className="content-thumbnail"
              />
            )}
            <p className="content-description">{content.description}</p>
            {content.videoUrl && (
              <video
                src={content.videoUrl}
                controls
                className="content-video"
              />
            )}
            <ContentAttachments
              courseId={selectedCourse._id}
              contentId={content._id}
              attachments={content.attachments}
              onAttachmentsUpdate={(newAttachments) => {
                const updatedContent = {
                  ...content,
                  attachments: newAttachments,
                };
                setSelectedCourse((prev) => ({
                  ...prev,
                  content: prev.content.map((c) =>
                    c._id === content._id ? updatedContent : c
                  ),
                }));
              }}
            />
            <div className="comments-section">
              <h5>Comments</h5>
              {comments[content._id] && comments[content._id].length > 0 ? (
                comments[content._id].map((comment) => (
                  <div key={comment._id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">
                        {comment.user?.username || "Unknown User"}
                      </span>
                      <span className="comment-date">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="comment-content">{comment.content}</p>

                    {/* Check if admin reply exists */}
                    {comment.adminReply && (
                      <div className="admin-reply">
                        <p className="reply-header">
                          <strong>Admin Reply:</strong>
                          {comment.adminReply.repliedBy?.username
                            ? ` by ${comment.adminReply.repliedBy.username}`
                            : ""}
                          <span className="reply-date">
                            {new Date(
                              comment.adminReply.repliedAt
                            ).toLocaleDateString()}
                          </span>
                        </p>
                        <p className="reply-content">
                          {comment.adminReply.content}
                        </p>
                      </div>
                    )}

                    {/* Admin reply form (if admin) */}
                    {isAdmin && (
                      <div className="admin-reply-container">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAdminReply(
                              selectedCourse._id,
                              content._id,
                              comment._id
                            );
                          }}
                          className="admin-reply-form"
                        >
                          <textarea
                            value={adminReplyText[comment._id] || ""}
                            onChange={(e) =>
                              setAdminReplyText((prev) => ({
                                ...prev,
                                [comment._id]: e.target.value,
                              }))
                            }
                            placeholder="Reply to this comment..."
                            required
                            maxLength={1000}
                          />
                          <button type="submit" className="admin-reply-submit">
                            Send Admin Reply
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>No comments for this content</p>
              )}
            </div>
          </div>
        ))}
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

export default CourseListExample;
