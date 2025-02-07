import React, { useState, useEffect } from "react";
import axios from "axios";
import { COURSES, FEATURED_COURSES } from "../../Helper/Api_helpers";
import "./FeaturedCourses.css";

const FeaturedCoursesAdmin = () => {
  const [state, setState] = useState({
    title: "",
    titleSpan: "",
    courses: [],
    featuredCourses: [],
    selectedCourse: "",
    editingTitle: false,
    loading: {
      initial: true,
      addCourse: false,
      removeCourse: false,
      updateTitle: false,
    },
  });

  const [message, setMessage] = useState({ type: "", text: "" });
  const [tempTitle, setTempTitle] = useState({ title: "", titleSpan: "" });

  const maxFeaturedCourses = 6;

  const fetchData = async () => {
    try {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, initial: true },
      }));

      const [coursesResponse, featuredResponse] = await Promise.all([
        axios.get(COURSES),
        axios.get(FEATURED_COURSES),
      ]);

      const coursesData = coursesResponse.data.data || [];
      const featuredCoursesData = featuredResponse.data.data || {};

      console.log(coursesData);
      console.log(featuredCoursesData);

      // Add null checks and ensure courseId exists before accessing _id
      const featuredIds =
        featuredCoursesData.FeaturedCourses?.reduce((ids, fc) => {
          if (fc && fc.courseId && fc.courseId._id) {
            ids.push(fc.courseId._id);
          }
          return ids;
        }, []) || [];

      // Filter available courses, ensuring course._id exists
      const availableCourses = coursesData.filter(
        (course) => course && course._id && !featuredIds.includes(course._id)
      );

      setState((prev) => ({
        ...prev,
        courses: availableCourses,
        featuredCourses:
          featuredCoursesData.FeaturedCourses?.filter(
            (fc) => fc && fc.courseId
          ) || [],
        title: featuredCoursesData.title || "",
        titleSpan: featuredCoursesData.titleSpan || "",
        loading: { ...prev.loading, initial: false },
      }));
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({
        type: "error",
        text: "Failed to load content. Please try again.",
      });
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, initial: false },
      }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateTitle = async () => {
    try {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, updateTitle: true },
      }));

      const response = await axios.put(`${FEATURED_COURSES}/title`, {
        title: tempTitle.title,
        titleSpan: tempTitle.titleSpan,
      });

      if (response.data.status === "success") {
        setState((prev) => ({
          ...prev,
          title: tempTitle.title,
          titleSpan: tempTitle.titleSpan,
          editingTitle: false,
          loading: { ...prev.loading, updateTitle: false },
        }));
        setMessage({ type: "success", text: "Title updated successfully!" });
      }
    } catch (error) {
      console.error("Error updating title:", error);
      setMessage({
        type: "error",
        text: "Failed to update title. Please try again.",
      });
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, updateTitle: false },
      }));
    }
  };

  const handleAddFeatured = async (e) => {
    e.preventDefault();

    if (!state.selectedCourse) {
      setMessage({ type: "error", text: "Please select a course" });
      return;
    }

    if (state.featuredCourses.length >= maxFeaturedCourses) {
      setMessage({
        type: "error",
        text: `Maximum ${maxFeaturedCourses} featured courses allowed`,
      });
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, addCourse: true },
      }));

      const response = await axios.post(FEATURED_COURSES, {
        courseId: state.selectedCourse,
      });

      if (response.data.status === "success") {
        setMessage({
          type: "success",
          text: "Course added to featured successfully!",
        });
        setState((prev) => ({
          ...prev,
          selectedCourse: "",
        }));
        await fetchData();
      }
    } catch (error) {
      console.error("Error adding featured course:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to add featured course",
      });
    } finally {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, addCourse: false },
      }));
    }
  };

  const handleRemoveFeatured = async (courseId) => {
    try {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, removeCourse: true },
      }));

      const response = await axios.delete(`${FEATURED_COURSES}/${courseId}`);

      if (response.data.status === "success") {
        setMessage({
          type: "success",
          text: "Course removed from featured successfully!",
        });
        await fetchData();
      }
    } catch (error) {
      console.error("Error removing featured course:", error);
      setMessage({
        type: "error",
        text: "Failed to remove featured course",
      });
    } finally {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, removeCourse: false },
      }));
    }
  };

  if (state.loading.initial) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="featured-courses-admin">
      <h2>Featured Courses Management</h2>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="featured-courses-stats">
        <p>
          Featured Courses: {state.featuredCourses.length} /{" "}
          {maxFeaturedCourses}
        </p>
      </div>

      <div className="featured-courses-title-section">
        {!state.editingTitle ? (
          <div className="featured-courses-title">
            <h3>
              {state.title} <span>{state.titleSpan}</span>
            </h3>
            <button
              className="edit-title-button"
              onClick={() => {
                setTempTitle({
                  title: state.title,
                  titleSpan: state.titleSpan,
                });
                setState((prev) => ({ ...prev, editingTitle: true }));
              }}
            >
              Edit Title
            </button>
          </div>
        ) : (
          <div className="featured-courses-title-edit">
            <input
              value={tempTitle.title}
              onChange={(e) =>
                setTempTitle((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              placeholder="Main Title"
              className="title-input"
            />
            <input
              value={tempTitle.titleSpan}
              onChange={(e) =>
                setTempTitle((prev) => ({
                  ...prev,
                  titleSpan: e.target.value,
                }))
              }
              placeholder="Span Title"
              className="title-input"
            />
            <div className="title-edit-actions">
              <button
                onClick={handleUpdateTitle}
                disabled={state.loading.updateTitle}
                className="save-button"
              >
                {state.loading.updateTitle ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    editingTitle: false,
                  }))
                }
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleAddFeatured} className="featured-courses-form">
        <div className="form-group">
          <label>Select Course to Feature</label>
          <select
            value={state.selectedCourse}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                selectedCourse: e.target.value,
              }))
            }
            required
            className="course-select"
          >
            <option value="">Choose a course</option>
            {state.courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.courseName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={
            state.loading.addCourse ||
            state.featuredCourses.length >= maxFeaturedCourses
          }
          className="submit-button"
        >
          {state.loading.addCourse ? "Adding..." : "Add to Featured"}
        </button>
      </form>

      <div className="featured-courses-list">
        <h3>Current Featured Courses</h3>
        {state.featuredCourses.map((featured) => {
          const course = featured.courseId;
          return (
            <div key={featured._id} className="featured-course-item">
              <div className="course-info">
                {course.courseThumbnailUrl && (
                  <img
                    src={course.courseThumbnailUrl}
                    alt={course.courseName}
                    className="course-thumbnail"
                  />
                )}
                <div className="course-details">
                  <h4>{course.courseName}</h4>
                </div>
              </div>
              <button
                onClick={() => handleRemoveFeatured(course._id)}
                disabled={state.loading.removeCourse}
                className="remove-button"
              >
                {state.loading.removeCourse
                  ? "Removing..."
                  : "Remove from Featured"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturedCoursesAdmin;
