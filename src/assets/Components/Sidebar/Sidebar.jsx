import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <Link to="users" style={{ textDecoration: "none" }}>
        <div className="sidebar-item">
          <p>Users</p>
        </div>
      </Link>
      <Link to="chat" style={{ textDecoration: "none" }}>
        <div className="sidebar-item">
          <p>Chat</p>
        </div>
      </Link>
      <Link to="allusers-trade" style={{ textDecoration: "none" }}>
        <div className="sidebar-item">
          <p>All User's Trade</p>
        </div>
      </Link>
      <Link to="allusers-trade-by-user" style={{ textDecoration: "none" }}>
        <div className="sidebar-item">
          <p>All User's Trade by User</p>
        </div>
      </Link>
      <Link to="admin/course" style={{ textDecoration: "none" }}>
        <div className="sidebar-item">
          <p>Your Course</p>
        </div>
      </Link>
      <Link to="course-list" style={{ textDecoration: "none" }}>
        <div className="sidebar-item">
          <p>Course List</p>
        </div>
      </Link>
    </div>
  );
};

export default Sidebar;
