import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { GET_USERS, UPDATE_USER_STATUS } from "../../Helper/url_helpers.jsx";
import "../Users/Users.css";
import PrivateChat from "../Chat/PrivateChat.jsx";
import PopupNotification from "../../Components/PopUP/PopUpNotification.jsx";
import { useSocket } from "../../Components/Socket/SocketContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faUserTimes } from "@fortawesome/free-solid-svg-icons";
import { useNotification } from "../../Components/Notification/NotificationContext.jsx";
import GlobalNotification from "../../Components/Notification/GlobalNotification.jsx";

const Users = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const { socket, isConnected } = useSocket();
  const [allMessages, setAllMessages] = useState({});
  const [chatDeactivated, setChatDeactivated] = useState(false);
  const [userChatStatus, setUserChatStatus] = useState({});
  const { notifications, clearNotification } = useNotification();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pendingNotification, setPendingNotification] = useState(null);
  const { addOrUpdateNotification } = useNotification();

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(
        process.env.REACT_APP_API_URL + GET_USERS
      );
      setUsers(response.data.data);

      const initialChatStatus = {};
      response.data.data.forEach((user) => {
        initialChatStatus[user._id] =
          user.isChatActive !== undefined ? user.isChatActive : true;
      });
      setUserChatStatus(initialChatStatus);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    console.log("Notifications:", notifications);
    console.log("Is Chat Open:", isChatOpen);
  }, [notifications, isChatOpen]);

  const handleUserToAdmin = useCallback(
    (data) => {
      setUsers((prevUsers) => {
        const user = prevUsers.find((u) => u._id === data.sender);
        if (user) {
          if (isChatOpen && selectedUser && data.sender === selectedUser._id) {
            setSelectedUser((prevUser) => ({
              ...prevUser,
              messages: [...(prevUser.messages || []), data],
            }));
          } else if (!isChatOpen) {
            const notification = {
              id: Date.now(),
              userId: data.sender,
              username: user.username,
              text: data.text,
            };
            addOrUpdateNotification(notification);
          }
        }
        return prevUsers;
      });
    },
    [isChatOpen, selectedUser, addOrUpdateNotification]
  );

  useEffect(() => {
    if (pendingNotification) {
      addOrUpdateNotification(pendingNotification);
      setPendingNotification(null); // Reset the pending notification state
    }
  }, [pendingNotification, addOrUpdateNotification]);

  useEffect(() => {
    if (isConnected) {
      socket.emit("register-admin");
      socket.on("user-to-admin", handleUserToAdmin);

      return () => {
        socket.off("user-to-admin", handleUserToAdmin);
      };
    }
  }, [isConnected, socket, handleUserToAdmin]);

  useEffect(() => {
    if (location.state && location.state.openChatUserId) {
      const userToOpen = users.find(
        (u) => u._id === location.state.openChatUserId
      );
      if (userToOpen) {
        setSelectedUser({
          ...userToOpen,
          messages: allMessages[userToOpen._id] || [],
        });
        setIsChatOpen(true); // Set the chat as open
      } else {
        setIsChatOpen(false); // Ensure chat does not reopen if no user found
      }
    }
  }, [location.state, users, allMessages]);

  const toggleUserChatStatus = async (userId, currentStatus) => {
    try {
      const url = `${process.env.REACT_APP_API_URL}/api/toggle-user-chat/${userId}`;
      const response = await axios.put(
        url,
        { isChatActive: !currentStatus },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      setUserChatStatus((prevStatus) => ({
        ...prevStatus,
        [userId]: !currentStatus,
      }));

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, isChatActive: !currentStatus } : user
        )
      );

      setPopupMessage({
        text: response.data.message,
      });

      socket.emit("admin-toggle-user-chat", {
        userId,
        isChatActive: !currentStatus,
      });
    } catch (err) {
      console.error("Error updating user chat status:", err);
      setError("Failed to update user chat status");
    }
  };

  const handleChatClick = (user) => {
    setSelectedUser({
      ...user,
      messages: allMessages[user._id] || [],
    });
    setIsChatOpen(true); // Mark the chat as open
    setPopupMessage(null);
  };

  const handlePopupClick = (notification) => {
    const user = users.find((u) => u._id === notification.userId);
    if (user) {
      setSelectedUser({ ...user, messages: allMessages[user._id] || [] });
      setIsChatOpen(true);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const url = `${process.env.REACT_APP_API_URL}${UPDATE_USER_STATUS.replace(
        ":userId",
        userId
      )}`;
      await axios.put(
        url,
        { isActive: !currentStatus },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (currentStatus) {
        socket.emit("admin-force-logout", { userId });
      }

      await fetchUsers();
      setPopupMessage({
        text: currentStatus
          ? "User has been deactivated and logged out."
          : "User has been activated.",
      });
    } catch (err) {
      console.error("Error updating user status:", err);
      setError("Failed to update user status");
    }
  };

  const toggleAllChats = async (status) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/toggle-chats`, {
        isDeactivated: status,
      });

      setChatDeactivated(status);

      socket.emit("admin-toggle-chats", { isDeactivated: status });

      setPopupMessage({
        text: status
          ? "All chats have been deactivated."
          : "All chats have been reactivated.",
      });
    } catch (err) {
      console.error(
        "Error toggling chats:",
        err.response ? err.response.data : err.message
      );
      setError(
        status ? "Failed to deactivate chats" : "Failed to reactivate chats"
      );
    }
  };

  const handleCloseChat = useCallback(() => {
    setSelectedUser(null);
    setIsChatOpen(false);
    setPopupMessage(null);
    navigate("/users");
  }, [navigate]);

  useEffect(() => {
    if (!selectedUser) {
      setIsChatOpen(false);
    }
  }, [selectedUser]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <div className="users-page">
        <div className="users-container">
          <h2>Users</h2>
          {chatDeactivated ? (
            <button
              onClick={() => toggleAllChats(false)}
              className="activate-btn"
            >
              Activate All Chats
            </button>
          ) : (
            <button
              onClick={() => toggleAllChats(true)}
              className="deactivate-btn"
            >
              Deactivate All Chats
            </button>
          )}
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Action</th>
                <th>Chat</th>
                <th>Chat Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user._id}
                  className={user.isActive ? "" : "inactive-user"}
                >
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.phoneNumber}</td>
                  <td>{user.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <button
                      onClick={() => toggleUserStatus(user._id, user.isActive)}
                      className={
                        user.isActive ? "deactivate-btn" : "activate-btn"
                      }
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => handleChatClick(user)}>Chat</button>
                  </td>
                  <td>
                    <button
                      onClick={() =>
                        toggleUserChatStatus(user._id, userChatStatus[user._id])
                      }
                      className={
                        userChatStatus[user._id]
                          ? "deactivate-btn"
                          : "activate-btn"
                      }
                    >
                      <FontAwesomeIcon
                        icon={
                          userChatStatus[user._id] ? faComments : faUserTimes
                        }
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* <GlobalNotification
          notifications={notifications}
          onNotificationClick={handlePopupClick}
          isChatOpen={isChatOpen}
        /> */}
        {selectedUser && (
          <div className="chat-overlay">
            <PrivateChat
              user={selectedUser}
              onClose={handleCloseChat}
              isChatOpen={isChatOpen} // Pass the state to the PrivateChat
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
