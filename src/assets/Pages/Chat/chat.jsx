import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import "./chat.css";
import { useSocket } from "../../Components/Socket/SocketContext.jsx";
import {
  API_URL,
  BROADCAST_CHAT_HISTORY,
  FILE_UPLOAD_URL,
  USER_INFO_URL,
} from "../../Helper/Api_helpers.jsx";
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  addIceCandidate,
  handleRemoteDescription,
} from "../../Components/WebRTC/WebRTC.jsx";

const AdminChat = () => {
  const { socket } = useSocket();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [file, setFile] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const peerConnectionsRef = useRef({});
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const iceCandidatesQueue = useRef({});
  const [pendingUsers, setPendingUsers] = useState([]);

  const adminId = "66a87c2125b2b6bad889fb56";

  const initializePeerConnections = useCallback(() => {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    Object.keys(users).forEach((userId) => {
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
      }

      peerConnectionsRef.current[userId] = createPeerConnection(configuration);

      peerConnectionsRef.current[userId].onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("ice-candidate", {
            to: userId,
            candidate: event.candidate,
          });
        }
      };

      peerConnectionsRef.current[userId].ontrack = (event) => {
        setRemoteStreams((prev) => ({
          ...prev,
          [userId]: event.streams[0],
        }));
      };

      peerConnectionsRef.current[userId].onconnectionstatechange = () => {
        if (
          peerConnectionsRef.current[userId].connectionState ===
            "disconnected" ||
          peerConnectionsRef.current[userId].connectionState === "failed" ||
          peerConnectionsRef.current[userId].connectionState === "closed"
        ) {
          handleEndCall(userId);
        }
      };

      iceCandidatesQueue.current[userId] = [];
    });
  }, [users, socket]);

  useEffect(() => {
    initializePeerConnections();
    return () => {
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    };
  }, [initializePeerConnections]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRefs.current && remoteStreams) {
      remoteVideoRefs.current.srcObject = remoteStreams;
    }
  }, [remoteStreams]);

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

  const startBroadcastCall = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      setLocalStream(stream);
      setCallType(type);
      setInCall(true);

      // Set all users as pending
      setPendingUsers(Object.keys(users));

      Object.keys(users).forEach(async (userId) => {
        // Create a new peer connection for each user
        const peerConnection = createPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peerConnectionsRef.current[userId] = peerConnection;

        // Set up event handlers for this peer connection
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              to: userId,
              candidate: event.candidate,
            });
          }
        };

        peerConnection.ontrack = (event) => {
          console.log(`Received track from user ${userId}`, event.streams[0]);
          setRemoteStreams((prev) => ({
            ...prev,
            [userId]: event.streams[0],
          }));
        };

        // Add local stream tracks to the peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        // Create and send offer
        const offer = await createOffer(peerConnection);
        socket.emit("call-offer", { to: userId, offer, type });
      });
    } catch (error) {
      console.error("Error starting broadcast call:", error);
    }
  };

  const handleCallAnswer = async ({ from, answer }) => {
    try {
      if (peerConnectionsRef.current[from]) {
        await handleRemoteDescription(
          peerConnectionsRef.current[from],
          new RTCSessionDescription(answer)
        );

        // After setting remote description, process any queued ICE candidates
        if (iceCandidatesQueue.current[from]) {
          const candidates = iceCandidatesQueue.current[from];
          for (const candidate of candidates) {
            await addIceCandidate(peerConnectionsRef.current[from], candidate);
          }
          iceCandidatesQueue.current[from] = [];
        }

        // Remove user from pending list when they answer
        setPendingUsers((prev) => prev.filter((userId) => userId !== from));
      }
    } catch (error) {
      console.error("Admin error setting remote description:", error);
    }
  };

  const handleCallRejection = ({ from }) => {
    // Remove user from pending list when they reject
    setPendingUsers((prev) => prev.filter((userId) => userId !== from));
    handleEndCall(from);
  };

  const handleIceCandidate = async ({ from, candidate }) => {
    try {
      const peerConnection = peerConnectionsRef.current[from];
      if (!peerConnection) {
        console.error(`No peer connection found for user ${from}`);
        return;
      }

      if (peerConnection.remoteDescription) {
        await addIceCandidate(peerConnection, new RTCIceCandidate(candidate));
      } else {
        // Queue the candidate if remote description is not set yet
        if (!iceCandidatesQueue.current[from]) {
          iceCandidatesQueue.current[from] = [];
        }
        iceCandidatesQueue.current[from].push(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Admin error handling ICE candidate:", error);
    }
  };

  const handleEndCall = (userId = null) => {
    if (userId) {
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
      }
      setRemoteStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
      setPendingUsers((prev) => prev.filter((id) => id !== userId));
    } else {
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      setRemoteStreams({});
      setPendingUsers([]);
    }

    if (!userId || Object.keys(remoteStreams).length === 1) {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      setInCall(false);
      setCallType(null);
    }

    socket.emit("end-call", { to: userId || Object.keys(users) });
  };

  useEffect(() => {
    if (socket) {
      socket.on("call-answer", handleCallAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("call-rejected", handleCallRejection);

      return () => {
        socket.off("call-answer");
        socket.off("ice-candidate");
        socket.off("call-rejected");
      };
    }
  }, [socket]);

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
      socket.on("call-answer", handleCallAnswer);
      socket.on("ice-candidate", handleIceCandidate);

      return () => {
        socket.off("register-admin");
        socket.off("call-answer");
        socket.off("ice-candidate");
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

      {!inCall && (
        <div className="call-buttons">
          <button onClick={() => startBroadcastCall("audio")}>
            Start Broadcast Voice Call
          </button>
          <button onClick={() => startBroadcastCall("video")}>
            Start Broadcast Video Call
          </button>
        </div>
      )}

      {inCall && (
        <div className="call-container">
          <h3>{callType === "audio" ? "Voice" : "Video"} Call in progress</h3>
          <div className="streams-container">
            <div className="local-stream">
              <h4>You (Admin)</h4>
              {callType === "video" && (
                <video ref={localVideoRef} autoPlay muted playsInline />
              )}
            </div>
            <div className="remote-streams">
              {Object.entries(remoteStreams).map(([userId, stream]) => (
                <div key={userId} className="remote-stream">
                  <h4>{users[userId] || "Unknown User"}</h4>
                  {callType === "video" ? (
                    <video
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el) el.srcObject = stream;
                      }}
                    />
                  ) : (
                    <audio
                      autoPlay
                      ref={(el) => {
                        if (el) el.srcObject = stream;
                      }}
                    />
                  )}
                  <button onClick={() => handleEndCall(userId)}>
                    Remove {users[userId]}
                  </button>
                </div>
              ))}
            </div>
            {pendingUsers.length > 0 && (
              <div className="pending-users">
                <h4>Waiting for response:</h4>
                <ul>
                  {pendingUsers.map((userId) => (
                    <li key={userId}>{users[userId]}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button onClick={() => handleEndCall()}>End Call For All</button>
        </div>
      )}

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
