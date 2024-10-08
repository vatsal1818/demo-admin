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
  const [broadcastCall, setBroadcastCall] = useState(false);
  const [broadcastStreams, setBroadcastStreams] = useState({});
  const broadcastPeerConnectionsRef = useRef({});

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
      setBroadcastCall(true);

      // Initialize peer connections for all users
      Object.keys(users).forEach((userId) => {
        const peerConnection = createPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // Add all tracks from the local stream to the peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        // Set up ice candidate handling
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("broadcast-ice-candidate", {
              to: userId,
              candidate: event.candidate,
            });
          }
        };

        // Store the peer connection
        broadcastPeerConnectionsRef.current[userId] = peerConnection;

        // Create and send offer
        createOffer(peerConnection).then((offer) => {
          socket.emit("broadcast-call-offer", {
            to: userId,
            offer,
            type,
            isBroadcast: true,
          });
        });
      });
    } catch (error) {
      console.error("Error starting broadcast call:", error);
    }
  };

  const handleBroadcastCallAnswer = async ({ from, answer }) => {
    console.log("Admin received call answer from:", from, "Answer:", answer);
    logPeerConnections();
    try {
      const peerConnection = broadcastPeerConnectionsRef.current[from];

      if (!peerConnection) {
        console.error(`No peer connection found for user ${from}`);
        return;
      }

      console.log("Found peer connection:", peerConnection);

      await handleRemoteDescription(
        peerConnection,
        new RTCSessionDescription(answer)
      );

      console.log("Admin successfully set remote description for user:", from);
    } catch (error) {
      console.error("Error handling broadcast call answer:", error);
    }
    logPeerConnections();
  };

  // Add this utility function to help with debugging
  const logPeerConnections = () => {
    console.log("Current peer connections:");
    Object.entries(broadcastPeerConnectionsRef.current).forEach(
      ([userId, pc]) => {
        console.log(`User ${userId}:`, pc.connectionState);
      }
    );
  };

  const handleCallRejection = ({ from }) => {
    // Remove user from pending list when they reject
    setPendingUsers((prev) => prev.filter((userId) => userId !== from));
    handleEndCall(from);
  };

  const handleBroadcastIceCandidate = async ({ from, candidate }) => {
    try {
      const peerConnection = broadcastPeerConnectionsRef.current[from];
      if (peerConnection) {
        await addIceCandidate(peerConnection, new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling broadcast ICE candidate:", error);
    }
  };

  const endBroadcastCall = () => {
    socket.emit("end-broadcast-call");
    Object.values(broadcastPeerConnectionsRef.current).forEach((pc) =>
      pc.close()
    );
    broadcastPeerConnectionsRef.current = {};
    setBroadcastStreams({});
    setBroadcastCall(false);
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setCallType(null);
  };

  useEffect(() => {
    if (socket) {
      socket.on("broadcast-call-answer", handleBroadcastCallAnswer);
      socket.on("broadcast-ice-candidate", handleBroadcastIceCandidate);
      socket.on("user-left-broadcast-call", ({ userId }) => {
        if (broadcastPeerConnectionsRef.current[userId]) {
          broadcastPeerConnectionsRef.current[userId].close();
          delete broadcastPeerConnectionsRef.current[userId];
        }
        setBroadcastStreams((prev) => {
          const newStreams = { ...prev };
          delete newStreams[userId];
          return newStreams;
        });
      });

      return () => {
        socket.off("broadcast-call-answer");
        socket.off("broadcast-ice-candidate");
        socket.off("user-left-broadcast-call");
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
      socket.on("broadcast-call-answer", handleBroadcastCallAnswer);
      socket.on("broadcast-ice-candidate", handleBroadcastIceCandidate);
      socket.on("user-left-broadcast-call");

      return () => {
        socket.off("register-admin");
        socket.off("broadcast-call-answer");
        socket.off("broadcast-ice-candidate");
        socket.off("user-left-broadcast-call");
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

      {!inCall && !broadcastCall && (
        <div className="call-buttons">
          <button onClick={() => startBroadcastCall("audio")}>
            Start Broadcast Voice Call
          </button>
          <button onClick={() => startBroadcastCall("video")}>
            Start Broadcast Video Call
          </button>
        </div>
      )}

      {broadcastCall && (
        <div className="broadcast-call-container">
          <h3>
            Broadcast {callType === "audio" ? "Voice" : "Video"} Call in
            progress
          </h3>
          <div className="streams-container">
            <div className="local-stream">
              <h4>You (Admin)</h4>
              {callType === "video" && (
                <video ref={localVideoRef} autoPlay muted playsInline />
              )}
            </div>
            <div className="remote-streams">
              {Object.entries(broadcastStreams).map(([userId, stream]) => (
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
                </div>
              ))}
            </div>
          </div>
          <button onClick={endBroadcastCall}>End Broadcast Call</button>
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
