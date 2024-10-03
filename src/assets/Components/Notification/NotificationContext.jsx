import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import { useSocket } from "../Socket/SocketContext";

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { socket } = useSocket();

  const addOrUpdateNotification = useCallback((newNotification) => {
    setNotifications((prevNotifications) => {
      const existingIndex = prevNotifications.findIndex(
        (n) => n.userId === newNotification.userId
      );
      if (existingIndex !== -1) {
        // Replace existing notification for this user
        const updatedNotifications = [...prevNotifications];
        updatedNotifications[existingIndex] = {
          ...newNotification,
          id: Date.now(), // Update the id to trigger a re-render
        };
        return updatedNotifications;
      } else {
        // Add new notification
        return [...prevNotifications, { ...newNotification, id: Date.now() }];
      }
    });
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notification) => notification.id !== id)
    );
  }, []);

  useEffect(() => {
    if (socket) {
      const handleUserToAdmin = (data) => {
        addOrUpdateNotification({
          userId: data.sender,
          username: data.username,
          text: data.text,
        });
      };

      socket.on("user-to-admin", handleUserToAdmin);

      return () => {
        socket.off("user-to-admin", handleUserToAdmin);
      };
    }
  }, [socket, addOrUpdateNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        clearNotification,
        addOrUpdateNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
