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
  const userToSocketMap = useRef({});
  const socketToUserMap = useRef({});
  const iceCandidateQueues = useRef({});

  const adminId = "66a87c2125b2b6bad889fb56";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersResponse = await axios.get(USER_INFO_URL);
        const usersArray = usersResponse.data.data;
        const usersData = usersArray.reduce((acc, user) => {
          acc[user._id] = user.username;
          return acc;
        }, {});
        setUsers(usersData);

        // Request socket IDs for all users
        if (socket) {
          socket.emit("request-user-socket-ids", Object.keys(usersData));
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [socket]);

  const requestSocketIds = useCallback(() => {
    if (socket && Object.keys(users).length > 0) {
      console.log("Requesting socket IDs for users:", Object.keys(users));
      socket.emit("request-user-socket-ids", Object.keys(users));
    }
  }, [socket, users]);

  useEffect(() => {
    if (socket) {
      socket.on("user-socket-ids", (socketIds) => {
        console.log("Received socket IDs:", socketIds);
        userToSocketMap.current = socketIds;
        Object.entries(socketIds).forEach(([userId, socketId]) => {
          socketToUserMap.current[socketId] = userId;
        });
      });

      return () => {
        socket.off("user-socket-ids");
      };
    }
  }, [socket]);

  const initializeBroadcastPeerConnections = useCallback(() => {
    console.log("Initializing broadcast peer connections");

    iceCandidateQueues.current = {};

    if (!users || Object.keys(users).length === 0) {
      console.log("No users available to initialize connections");
      return;
    }

    // Close all existing connections
    Object.values(broadcastPeerConnectionsRef.current).forEach((pc) => {
      pc.close();
    });
    broadcastPeerConnectionsRef.current = {};
    setBroadcastStreams({}); // Clear existing streams

    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    Object.keys(users).forEach((userId) => {
      const socketId = userToSocketMap.current[userId];
      if (!socketId) {
        console.log(
          `No socket ID found for user ${userId}, skipping connection setup`
        );
        return;
      }

      console.log(
        `Setting up peer connection for user ${userId} with socket ${socketId}`
      );

      // Initialize ICE candidate queue for this user
      iceCandidateQueues.current[userId] = [];

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          // Add TURN server if available
        ],
      });

      broadcastPeerConnectionsRef.current[userId] = peerConnection;

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log(`Sending ICE candidate to user ${userId}`);
          socket.emit("broadcast-ice-candidate", {
            to: socketId,
            candidate: event.candidate,
          });
        }
      };

      peerConnection.ontrack = (event) => {
        console.log(`Received track from user ${userId}:`, event.streams[0]);
        setBroadcastStreams((prev) => ({
          ...prev,
          [userId]: event.streams[0],
        }));
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(
          `Connection state changed for user ${userId}:`,
          peerConnection.connectionState
        );
        if (
          peerConnection.connectionState === "disconnected" ||
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "closed"
        ) {
          setBroadcastStreams((prev) => {
            const newStreams = { ...prev };
            delete newStreams[userId];
            return newStreams;
          });
        }
      };
    });
  }, [users, socket]);

  useEffect(() => {
    initializeBroadcastPeerConnections();
  }, [initializeBroadcastPeerConnections]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
      console.log("Starting broadcast call of type:", type);

      // Request fresh socket IDs
      if (socket) {
        socket.emit("request-user-socket-ids", Object.keys(users));
      }

      // Wait for socket IDs to be updated
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      setLocalStream(stream);
      setCallType(type);
      setBroadcastCall(true);

      // Initialize peer connections
      initializeBroadcastPeerConnections();

      // Wait for peer connections to be initialized
      await new Promise((resolve) => setTimeout(resolve, 500));

      Object.keys(users).forEach((userId) => {
        const socketId = userToSocketMap.current[userId];
        const peerConnection = broadcastPeerConnectionsRef.current[userId];

        if (!peerConnection || !socketId) {
          console.error(
            `Missing peer connection or socket ID for user ${userId}`
          );
          return;
        }

        // Add local stream tracks to peer connection
        stream.getTracks().forEach((track) => {
          console.log(
            `Adding track to peer connection for user ${userId}`,
            track
          );
          peerConnection.addTrack(track, stream);
        });

        peerConnection
          .createOffer()
          .then((offer) => {
            console.log(`Created offer for user ${userId}`, offer);
            return peerConnection.setLocalDescription(offer);
          })
          .then(() => {
            console.log(`Set local description for user ${userId}`);
            socket.emit("broadcast-call-offer", {
              to: socketId,
              offer: peerConnection.localDescription,
              type,
              isBroadcast: true,
            });
          })
          .catch((error) => {
            console.error(`Error creating offer for user ${userId}:`, error);
          });
      });
    } catch (error) {
      console.error("Error starting broadcast call:", error);
    }
  };

  const handleBroadcastCallAnswer = async ({ from, answer }) => {
    console.log("Received broadcast call answer from:", from);

    const userId = Object.keys(userToSocketMap.current).find(
      (id) => userToSocketMap.current[id] === from
    );

    if (!userId) {
      console.error(`No userId found for socketId: ${from}`);
      return;
    }

    const peerConnection = broadcastPeerConnectionsRef.current[userId];

    if (!peerConnection) {
      console.error(`No peer connection found for user ${userId}`);
      return;
    }

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log(`Set remote description for user ${userId}`);

      // Process queued ICE candidates after setting remote description
      const queuedCandidates = iceCandidateQueues.current[userId] || [];
      console.log(
        `Processing ${queuedCandidates.length} queued ICE candidates for user ${userId}`
      );

      for (const candidate of queuedCandidates) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`Added queued ICE candidate for user ${userId}`);
        } catch (error) {
          console.error(
            `Error adding queued ICE candidate for user ${userId}:`,
            error
          );
        }
      }

      // Clear the queue
      iceCandidateQueues.current[userId] = [];
    } catch (error) {
      console.error(
        `Error setting remote description for user ${userId}:`,
        error
      );
    }
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
    const userId = Object.keys(userToSocketMap.current).find(
      (id) => userToSocketMap.current[id] === from
    );

    if (!userId) {
      console.error(`No userId found for socketId: ${from}`);
      return;
    }

    const peerConnection = broadcastPeerConnectionsRef.current[userId];

    if (!peerConnection) {
      console.error(`No peer connection found for user ${userId}`);
      return;
    }

    if (
      peerConnection.remoteDescription &&
      peerConnection.remoteDescription.type
    ) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`Added ICE candidate for user ${userId}`);
      } catch (error) {
        console.error(`Error adding ICE candidate for user ${userId}:`, error);
      }
    } else {
      // Queue the ICE candidate
      if (!iceCandidateQueues.current[userId]) {
        iceCandidateQueues.current[userId] = [];
      }
      console.log(`Queueing ICE candidate for user ${userId}`);
      iceCandidateQueues.current[userId].push(candidate);
    }
  };

  const endBroadcastCall = () => {
    socket.emit("end-broadcast-call");
    Object.values(broadcastPeerConnectionsRef.current).forEach((pc) =>
      pc.close()
    );
    broadcastPeerConnectionsRef.current = {};
    iceCandidateQueues.current = {}; // Clear ICE candidate queues
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
      socket.on("user-connected", (connectedUser) => {
        const { socketId, userId, username } = connectedUser;

        setUsers((prevUsers) => ({
          ...prevUsers,
          [userId]: username,
        }));

        userToSocketMap.current[userId] = socketId;
        socketToUserMap.current[socketId] = userId;

        console.log(
          `User connected - userId: ${userId}, socketId: ${socketId}`
        );

        if (broadcastCall) {
          // If a broadcast call is ongoing, set up a new peer connection for this user
          const peerConnection = createPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          broadcastPeerConnectionsRef.current[userId] = peerConnection;

          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("broadcast-ice-candidate", {
                to: socketId,
                candidate: event.candidate,
              });
            }
          };

          if (localStream) {
            localStream.getTracks().forEach((track) => {
              peerConnection.addTrack(track, localStream);
            });
          }

          createOffer(peerConnection).then((offer) => {
            socket.emit("broadcast-call-offer", {
              to: socketId,
              offer,
              type: callType,
              isBroadcast: true,
            });
          });
        }
      });

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
      socket.on("user-socket-ids", (socketIds) => {
        console.log("Received updated socket IDs:", socketIds);
        userToSocketMap.current = socketIds;
        Object.entries(socketIds).forEach(([userId, socketId]) => {
          socketToUserMap.current[socketId] = userId;
        });
      });

      return () => {
        socket.off("broadcast-call-answer");
        socket.off("broadcast-ice-candidate");
        socket.off("user-left-broadcast-call");
        socket.off("user-socket-ids");
      };
    }
  }, [socket, broadcastCall, localStream, callType]);

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

  const renderRemoteStreams = () => {
    return Object.entries(broadcastStreams).map(([userId, stream]) => (
      <div key={userId} className="remote-stream">
        <h4>{users[userId] || "Unknown User"}</h4>
        {callType === "video" ? (
          <video
            autoPlay
            playsInline
            ref={(el) => {
              if (el && stream) {
                el.srcObject = stream;
              }
            }}
          />
        ) : (
          <audio
            autoPlay
            ref={(el) => {
              if (el && stream) {
                el.srcObject = stream;
              }
            }}
          />
        )}
      </div>
    ));
  };

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
            <div className="remote-streams">{renderRemoteStreams()}</div>
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
