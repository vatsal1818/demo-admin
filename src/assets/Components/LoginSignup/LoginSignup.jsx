import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Register from "../../Pages/Register/Register.jsx";
import Login from "../../Pages/Login/login.jsx";
import "./LoginSignup.css";

const LoginSignUp = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const navigate = useNavigate();

  const handleSuccessfulRegister = () => {
    setIsRegistered(true);
  };

  const handleSuccessfulLogin = (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    navigate("/");
  };

  return (
    <div className="login-signup-container">
      {isRegistered ? (
        <Login onSuccessfulLogin={handleSuccessfulLogin} />
      ) : (
        <>
          <Register onSuccessfulRegister={handleSuccessfulRegister} />
          <p className="login-option">
            Already have an account?
            <button
              className="login-button"
              onClick={() => setIsRegistered(true)}
            >
              Go to Login
            </button>
          </p>
        </>
      )}
    </div>
  );
};

export default LoginSignUp;
