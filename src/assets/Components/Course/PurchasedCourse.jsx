import React, { useState, useEffect } from "react";
import axios from "axios";
import "./PurchasedCourses.css";
import { PURCHASED_COURSE } from "../../Helper/Api_helpers";

const AdminPurchasedCourses = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("purchaseDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statusMessage, setStatusMessage] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const admin = "66a87c2125b2b6bad889fb56";

  useEffect(() => {
    fetchPurchases();
  }, [sortBy, sortOrder, searchTerm]);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get(
        `${PURCHASED_COURSE}?page=1&limit=10&sortBy=${sortBy}&sortOrder=${sortOrder}${
          searchTerm ? `&username=${searchTerm}&courseName=${searchTerm}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${admin}`,
          },
        }
      );

      const updatedPurchases = response.data.data.map((purchase) => ({
        ...purchase,
        course: {
          ...purchase.course,
          isActive: purchase.course?.isActive ?? true,
        },
      }));

      setPurchases(updatedPurchases);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch purchases");
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseStatus = async (courseId, currentStatus) => {
    try {
      await axios.patch(
        `${PURCHASED_COURSE}/${courseId}/toggle-status`,
        {
          isActive: !currentStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${admin}`,
          },
        }
      );

      setPurchases((prevPurchases) =>
        prevPurchases.map((purchase) => {
          if (purchase.course._id === courseId) {
            return {
              ...purchase,
              course: {
                ...purchase.course,
                isActive: !currentStatus,
              },
            };
          }
          return purchase;
        })
      );

      setStatusMessage({
        type: "success",
        message: `Course ${
          !currentStatus ? "activated" : "deactivated"
        } successfully`,
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage({
        type: "error",
        message:
          err.response?.data?.message || "Failed to update course status",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const toggleAllCoursesStatus = async (status) => {
    try {
      await axios.patch(
        `${PURCHASED_COURSE}/toggle-all-status`,
        {
          isActive: status,
        },
        {
          headers: {
            Authorization: `Bearer ${admin}`,
          },
        }
      );

      setPurchases((prevPurchases) =>
        prevPurchases.map((purchase) => ({
          ...purchase,
          course: {
            ...purchase.course,
            isActive: status,
          },
        }))
      );

      setStatusMessage({
        type: "success",
        message: `All courses ${
          status ? "activated" : "deactivated"
        } successfully`,
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage({
        type: "error",
        message:
          err.response?.data?.message || "Failed to update courses status",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatValidityPeriod = (validityPeriod) => {
    if (!validityPeriod) return "N/A";
    return `${validityPeriod.duration} ${validityPeriod.unit}`;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Function to check if all courses are active
  const areAllCoursesActive = () => {
    return purchases.every((purchase) => purchase.course?.isActive);
  };

  // Function to check if all courses are inactive
  const areAllCoursesInactive = () => {
    return purchases.every((purchase) => !purchase.course?.isActive);
  };

  const handleConfirmDialog = (action) => {
    setConfirmAction(() => action); // Use a function to set confirmAction
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction(); // Make sure confirmAction is properly invoked
    }
    setShowConfirmDialog(false);
  };

  const filteredAndSortedPurchases = purchases
    .filter(
      (purchase) =>
        purchase.user?.username
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        purchase.course?.courseName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let compareA = a[sortBy];
      let compareB = b[sortBy];

      if (sortBy === "user") {
        compareA = a.user?.username;
        compareB = b.user?.username;
      } else if (sortBy === "course") {
        compareA = a.course?.courseName;
        compareB = b.course?.courseName;
      } else if (sortBy === "expiryDate") {
        compareA = new Date(a.course?.expiryDate || 0);
        compareB = new Date(b.course?.expiryDate || 0);
      }

      if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
      if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  if (loading) {
    return <div className="admin-loader">Loading...</div>;
  }

  if (error) {
    return <div className="admin-error">Error loading purchases: {error}</div>;
  }

  return (
    <div className="admin-purchased-courses">
      <div className="admin-header">
        <h1>All Purchased Courses</h1>
        <div className="admin-controls">
          <input
            type="text"
            placeholder="Search by user or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="bulk-actions">
            {areAllCoursesActive() ? (
              <button
                className="btn-danger"
                onClick={() =>
                  handleConfirmDialog(() => toggleAllCoursesStatus(false))
                }
              >
                Deactivate All Courses
              </button>
            ) : (
              <button
                className="btn-success"
                onClick={() =>
                  handleConfirmDialog(() => toggleAllCoursesStatus(true))
                }
              >
                Activate All Courses
              </button>
            )}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.message}
        </div>
      )}

      {showConfirmDialog && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h2>Confirm Action</h2>
            <p>Are you sure you want to proceed with this action?</p>
            <div className="confirm-dialog-actions">
              <button onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </button>
              <button onClick={handleConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("user")}>
                Username
                {sortBy === "user" && (
                  <span className="sort-arrow">
                    {sortOrder === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort("course")}>
                Course Name
                {sortBy === "course" && (
                  <span className="sort-arrow">
                    {sortOrder === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort("purchaseDate")}>
                Purchase Date
                {sortBy === "purchaseDate" && (
                  <span className="sort-arrow">
                    {sortOrder === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th>Validity Period</th>
              <th onClick={() => handleSort("validityExpiryDate")}>
                Access Until
                {sortBy === "validityExpiryDate" && (
                  <span className="sort-arrow">
                    {sortOrder === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort("price")}>
                Price
                {sortBy === "price" && (
                  <span className="sort-arrow">
                    {sortOrder === "asc" ? " ↑" : " ↓"}
                  </span>
                )}
              </th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPurchases.map((purchase) => (
              <tr key={purchase._id}>
                <td>{purchase.user?.username}</td>
                <td>{purchase.course?.courseName}</td>
                <td>{formatDate(purchase.purchaseDate)}</td>
                <td>{formatValidityPeriod(purchase.course?.validityPeriod)}</td>
                <td>
                  <span
                    className={`expiry-date ${
                      isExpired(purchase.validityExpiryDate) ? "expired" : ""
                    }`}
                  >
                    {formatDate(purchase.validityExpiryDate)}
                  </span>
                </td>
                <td>${purchase.course?.price}</td>
                <td>
                  <span
                    className={`status-badge ${
                      purchase.course?.isActive ? "active" : "inactive"
                    }`}
                  >
                    {purchase.course?.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button
                    className={`toggle-btn ${
                      purchase.course?.isActive ? "btn-danger" : "btn-success"
                    }`}
                    onClick={() =>
                      toggleCourseStatus(
                        purchase.course?._id,
                        purchase.course?.isActive
                      )
                    }
                  >
                    {purchase.course?.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedPurchases.length === 0 && (
        <div className="no-results">
          No purchases found matching your search.
        </div>
      )}
    </div>
  );
};

export default AdminPurchasedCourses;
