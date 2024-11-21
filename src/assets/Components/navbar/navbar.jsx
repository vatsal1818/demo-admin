import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../navbar/navbar.css";
import { POST_LOGOUT } from "../../Helper/url_helpers.jsx";

const Navbar = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL + POST_LOGOUT;

  const isLoggedIn = () => {
    return Boolean(
      localStorage.getItem("accessToken") &&
        localStorage.getItem("refreshToken")
    );
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        navigate("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">Logo</Link>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/chat">Chat</Link>
        </li>
        <li>
          <Link to="/users">Users</Link>
        </li>
        <li>
          <Link to="/allusers-trade">All User's Trade</Link>
        </li>
        <li>
          <Link to="/allusers-trade-by-user">All User's Trade by user</Link>
        </li>
        <li>
          <Link to="/yourcourse">Your Course</Link>
        </li>
        {isLoggedIn() ? (
          <li>
            <button onClick={handleLogout}>Logout</button>
          </li>
        ) : (
          <li>
            <Link to="/login">Login</Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
