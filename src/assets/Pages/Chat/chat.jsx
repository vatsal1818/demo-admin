import React, { useEffect, useState } from "react";
import axios from "axios";
import "./chat.css";
import { useSocket } from "../../Components/Socket/SocketContext.jsx";
import {
  API_URL,
  BROADCAST_CHAT_HISTORY,
  FILE_UPLOAD_URL,
  USER_INFO_URL,
} from "../../Helper/Api_helpers.jsx";

const AdminChat = () => {
  const { socket } = useSocket();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [file, setFile] = useState(null);

  const adminId = "66a87c2125b2b6bad889fb56";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim()) {
      const newMessage = { text: message, sender: adminId, broadcast: true };
      socket.emit("admin-message", newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");

      try {
        await axios.post(API_URL, {
          sender: adminId,
          receiver: null,
          text: message,
          messageType: "broadcast",
        });
      } catch (error) {
        console.error("Error saving message:", error);
      }
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete the chat history?"
    );
    if (confirmDelete) {
      try {
        await axios.delete(
          `${process.env.REACT_APP_API_URL}/api/chat-history/broadcast`
        );
        setMessages([]);
      } catch (error) {
        console.error("Error deleting chat history:", error);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("attachment", file);

      try {
        const response = await axios.post(FILE_UPLOAD_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const fileUrl = response.data.fileUrl;

        const newMessage = { fileUrl, sender: adminId, broadcast: true };
        socket.emit("admin-message", newMessage);
        setMessages((prevMessages) => [...prevMessages, newMessage]);

        await axios.post(API_URL, {
          sender: adminId,
          receiver: null,
          fileUrl,
          messageType: "broadcast",
        });
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const [broadcastResponse, usersResponse] = await Promise.all([
          axios.get(BROADCAST_CHAT_HISTORY),
          axios.get(USER_INFO_URL),
        ]);
        setMessages(broadcastResponse.data);
        const usersArray = usersResponse.data.data;
        const usersData = usersArray.reduce((acc, user) => {
          acc[user._id] = user.username;
          return acc;
        }, {});
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchMessages();

    if (socket) {
      socket.emit("register-admin");

      return () => {
        socket.off("register-admin");
      };
    }
  }, [socket]);

  return (
    <div className="chat-container">
      <nav className="deletechat">
        <h1>Admin</h1>
        <button className="delete-button" onClick={handleDelete}>
          Delete Chat
        </button>
      </nav>
      <div className="message-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === adminId ? "admin" : "user"}`}
          >
            {msg.sender === adminId
              ? "You: "
              : `${users[msg.sender] || "User"}: `}
            {msg.text && <p>{msg.text}</p>}
            {msg.fileUrl && (
              <div>
                {msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img
                    src={`${process.env.REACT_APP_API_URL}${msg.fileUrl}`}
                    alt="attachment"
                    style={{
                      width: "300px",
                      height: "auto",
                      objectFit: "cover",
                    }}
                  />
                ) : msg.fileUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video
                    controls
                    style={{
                      width: "300px",
                      height: "auto",
                      objectFit: "cover",
                    }}
                  >
                    <source
                      src={`${process.env.REACT_APP_API_URL}${msg.fileUrl}`}
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                ) : msg.fileUrl.match(/\.(pdf)$/i) ? (
                  <iframe
                    src={`${process.env.REACT_APP_API_URL}${msg.fileUrl}`}
                    style={{ width: "300px", height: "auto", border: "none" }}
                    title="PDF Attachment"
                  />
                ) : (
                  <p>
                    <a
                      href={`${process.env.REACT_APP_API_URL}${msg.fileUrl}`}
                      rel="noopener noreferrer"
                    >
                      Download Attachment
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="send-container" onSubmit={handleSubmit}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          type="text"
          placeholder="Type a message..."
        />
        <input type="file" onChange={handleFileUpload} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default AdminChat;
