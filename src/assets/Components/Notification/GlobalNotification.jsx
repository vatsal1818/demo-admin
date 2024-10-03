import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "./NotificationContext";
import PopupNotification from "../PopUP/PopUpNotification.jsx";

const MAX_VISIBLE_NOTIFICATIONS = 5;

const GlobalNotification = () => {
  const { notifications, clearNotification } = useNotification();
  const navigate = useNavigate();
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  useEffect(() => {
    // Sort notifications by id (which is a timestamp) to show the latest first
    const sortedNotifications = [...notifications].sort((a, b) => b.id - a.id);
    setVisibleNotifications(
      sortedNotifications.slice(0, MAX_VISIBLE_NOTIFICATIONS)
    );
  }, [notifications]);

  const handleClick = (notification) => {
    navigate("/users", {
      state: { openChatUserId: notification.userId },
      replace: true,
    });
    clearNotification(notification.id);
  };

  const handleCancel = (notification) => {
    clearNotification(notification.id);
  };

  return (
    <div className="popup-notification-container">
      {visibleNotifications.map((notification) => (
        <PopupNotification
          key={notification.id}
          message={notification}
          onClick={() => handleClick(notification)}
          onCancel={() => handleCancel(notification)}
        />
      ))}
    </div>
  );
};

export default GlobalNotification;
