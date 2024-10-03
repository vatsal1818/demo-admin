import React, { useState } from "react";
import "./PopupNotification.css";

const PopupNotification = ({ message, onClick, onCancel }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClick = () => {
    setIsVisible(false);
    onClick();
  };

  const handleCancel = () => {
    setIsVisible(false);
    onCancel(); // Call the onCancel function to clear the notification
  };

  if (!isVisible) return null;

  return (
    <div className="popup-notification">
      <button className="cancel-button" onClick={handleCancel}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="24"
          height="24"
        >
          <path
            fill="#ff4d4d"
            d="M12 10.585l4.95-4.95 1.415 1.414L13.414 12l4.95 4.95-1.414 1.415L12 13.414l-4.95 4.95-1.415-1.414L10.586 12l-4.95-4.95 1.414-1.415L12 10.586z"
          />
        </svg>
      </button>
      <div onClick={handleClick} className="popup-message">
        <p>New message from {message.username}</p>
        <p>{message.text}</p>
      </div>
    </div>
  );
};

export default PopupNotification;
