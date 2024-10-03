import React, { useState } from "react";
import { POST_REGISTER } from "../../Helper/url_helpers";
import "./Register.css";

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const signUp = async (userData) => {
    const API_URL = process.env.REACT_APP_API_URL + POST_REGISTER;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Signup failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const result = await signUp(formData);
      console.log("Signup successful:", result);
      setSuccess("Signup successful!");
      // Handle successful signup (e.g., redirect user)
    } catch (error) {
      console.error("Signup failed:", error.message);
      setError(error.message);
    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
      <form onSubmit={handleSubmit} className="register-form">
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          required
        />
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Username"
          required
        />
        <input
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="Phone Number"
          required
        />
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm Password"
          required
        />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default Register;
