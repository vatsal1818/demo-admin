import React, { useState, useEffect } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import "./CouponCode.css";
import { ADMIN_COUPON, COURSES } from "../../Helper/Api_helpers";

const CouponSystem = () => {
  // State for both generator and management
  const [coupons, setCoupons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("generate"); // 'generate' or 'manage'

  // Generator Form State
  const [generatorForm, setGeneratorForm] = useState({
    discountType: "percentage",
    discount: 10,
    expiryDays: 30,
    usageLimit: "",
    courseId: "all", // Default to All Courses
  });

  // Management States
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    discountType: "",
    discount: "",
    expiryDays: "",
    usageLimit: "",
    courseId: "all", // Default to All Courses
    isActive: true,
  });

  useEffect(() => {
    fetchCoupons();
    fetchCourses();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch(ADMIN_COUPON);
      if (!response.ok) throw new Error("Failed to fetch coupons");
      const data = await response.json();
      setCoupons(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(COURSES);
      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      setCourses(data.data || []); // Adjust based on your API response structure
    } catch (err) {
      setError(err.message);
    }
  };

  // Generator Functions
  const handleGeneratorChange = (e) => {
    const { name, value } = e.target;
    setGeneratorForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDiscountTypeChange = (e) => {
    const newType = e.target.value;
    setGeneratorForm((prev) => ({
      ...prev,
      discountType: newType,
      discount: newType === "percentage" ? 10 : 50,
    }));
  };

  const handleGenerateCoupon = async (e) => {
    e.preventDefault();
    try {
      // Validate course selection
      if (!generatorForm.courseId) {
        setError("Please select a course");
        return;
      }

      console.log("Sending form data:", {
        ...generatorForm,
        courseId:
          generatorForm.courseId === "all" ? null : generatorForm.courseId,
      });

      const response = await fetch(ADMIN_COUPON, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...generatorForm,
          courseId:
            generatorForm.courseId === "all" ? null : generatorForm.courseId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate coupon");

      const newCoupon = await response.json();
      setCoupons((prev) => [...prev, newCoupon]);
      setActiveTab("manage"); // Switch to management view after generation
      setError(""); // Clear any previous errors
    } catch (err) {
      setError(err.message);
    }
  };

  // Management Functions
  const handleDelete = async (couponId) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const response = await fetch(`${ADMIN_COUPON}/${couponId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete coupon");
      setCoupons(coupons.filter((coupon) => coupon._id !== couponId));
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (coupon) => {
    setEditingCoupon(coupon);
    setEditForm({
      discountType: coupon.discountType,
      discount: coupon.discount,
      expiryDays: Math.ceil(
        (new Date(coupon.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      ),
      usageLimit: coupon.usageLimit || "",
      isActive: coupon.isActive,
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${ADMIN_COUPON}/${editingCoupon._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Failed to update coupon");

      const updatedCoupon = await response.json();
      setCoupons(
        coupons.map((coupon) =>
          coupon._id === editingCoupon._id ? updatedCoupon : coupon
        )
      );

      setShowEditModal(false);
      setEditingCoupon(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const renderCourseDropdown = (value, onChange, formType) => (
    <div className="form-group">
      <label htmlFor={`${formType}CourseId`}>Select Course</label>
      <select
        id={`${formType}CourseId`}
        name="courseId"
        value={value}
        onChange={onChange}
        required
      >
        <option value="all">All Courses</option>
        {courses.map((course) => (
          <option key={course._id} value={course._id}>
            {course.courseName}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="coupon-system">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "generate" ? "active" : ""}`}
          onClick={() => setActiveTab("generate")}
        >
          Generate Coupon
        </button>
        <button
          className={`tab ${activeTab === "manage" ? "active" : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          Manage Coupons
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {activeTab === "generate" && (
        <div className="generator-container">
          <h2>Generate New Coupon</h2>
          <form onSubmit={handleGenerateCoupon} className="generator-form">
            {/* Course Selection Dropdown */}
            {renderCourseDropdown(
              generatorForm.courseId,
              handleGeneratorChange,
              "generator"
            )}
            <div className="form-group">
              <label htmlFor="discountType">Discount Type</label>
              <select
                id="discountType"
                name="discountType"
                value={generatorForm.discountType}
                onChange={handleDiscountTypeChange}
              >
                <option value="percentage">Percentage Discount</option>
                <option value="fixed">Fixed Price Discount</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discount">
                {generatorForm.discountType === "percentage"
                  ? "Discount Percentage"
                  : "Discount Amount"}
              </label>
              <input
                type="number"
                id="discount"
                name="discount"
                min="0"
                max={
                  generatorForm.discountType === "percentage"
                    ? "100"
                    : undefined
                }
                required
                value={generatorForm.discount}
                onChange={handleGeneratorChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="expiryDays">Expiry Days</label>
              <input
                type="number"
                id="expiryDays"
                name="expiryDays"
                min="1"
                required
                value={generatorForm.expiryDays}
                onChange={handleGeneratorChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="usageLimit">Usage Limit</label>
              <input
                type="number"
                id="usageLimit"
                name="usageLimit"
                min="1"
                value={generatorForm.usageLimit}
                onChange={handleGeneratorChange}
              />
            </div>

            <button type="submit" className="generate-btn">
              Generate Coupon
            </button>
          </form>
        </div>
      )}

      {activeTab === "manage" && (
        <div className="management-container">
          <h2>Manage Coupons</h2>
          {loading ? (
            <div className="loading">Loading coupons...</div>
          ) : (
            <div className="coupon-list">
              {coupons.map((coupon) => (
                <div key={coupon._id} className="coupon-item">
                  <div className="coupon-code">{coupon.code}</div>
                  <div className="coupon-details">
                    <p>
                      <span>Discount:</span>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discount}%`
                        : `$${coupon.discount}`}
                    </p>
                    <p>
                      <span>Expires:</span>
                      {new Date(coupon.expiryDate).toLocaleDateString()}
                    </p>
                    {coupon.usageLimit && (
                      <p>
                        <span>Usage:</span> {coupon.usageCount || 0}/
                        {coupon.usageLimit}(
                        {coupon.usageLimit - (coupon.usageCount || 0)}{" "}
                        remaining)
                      </p>
                    )}
                    {/* Display course name if available */}
                    {coupon.courseId && (
                      <p>
                        <span>Course:</span>{" "}
                        {coupon.courseId === "all"
                          ? "All Courses"
                          : courses.find((c) => c._id === coupon.courseId)
                              ?.courseName || "Unknown Course"}
                      </p>
                    )}
                    <p
                      className={`status ${
                        coupon.isActive ? "active" : "inactive"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="coupon-actions">
                    <button
                      className="edit-btn"
                      onClick={() => startEdit(coupon)}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(coupon._id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showEditModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Coupon</h3>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="edit-form">
              <div className="form-group">
                {renderCourseDropdown(
                  editForm.courseId,
                  handleEditChange,
                  "edit"
                )}
              </div>

              <div className="form-group">
                <label htmlFor="editDiscountType">Discount Type</label>
                <select
                  id="editDiscountType"
                  name="discountType"
                  value={editForm.discountType}
                  onChange={handleEditChange}
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed">Fixed Price Discount</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editDiscount">Discount</label>
                <input
                  type="number"
                  id="editDiscount"
                  name="discount"
                  value={editForm.discount}
                  onChange={handleEditChange}
                  min="0"
                  max={
                    editForm.discountType === "percentage" ? "100" : undefined
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="editExpiryDays">Expiry Days</label>
                <input
                  type="number"
                  id="editExpiryDays"
                  name="expiryDays"
                  value={editForm.expiryDays}
                  onChange={handleEditChange}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="editUsageLimit">Usage Limit</label>
                <input
                  type="number"
                  id="editUsageLimit"
                  name="usageLimit"
                  value={editForm.usageLimit}
                  onChange={handleEditChange}
                  min="1"
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={editForm.isActive}
                    onChange={handleEditChange}
                  />
                  Active
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponSystem;
