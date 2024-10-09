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

  useEffect(() => {
    if (socket) {
      socket.on("user-socket-ids", (socketIds) => {
        Object.entries(socketIds).forEach(([userId, socketId]) => {
          userToSocketMap.current[userId] = socketId;
        });
        // After updating userToSocketMap, initialize peer connections
        initializeBroadcastPeerConnections();
      });

      return () => {
        socket.off("user-socket-ids");
      };
    }
  }, [socket]);

  const initializeBroadcastPeerConnections = useCallback(() => {
    console.log("Initializing broadcast peer connections");

    if (!users || Object.keys(users).length === 0) {
      console.log("No users available to initialize connections");
      return;
    }

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

      // Close existing connection if any
      if (broadcastPeerConnectionsRef.current[userId]) {
        broadcastPeerConnectionsRef.current[userId].close();
      }

      const peerConnection = createPeerConnection(configuration);
      broadcastPeerConnectionsRef.current[userId] = peerConnection;

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log(
            `ICE candidate generated for user ${userId}:`,
            event.candidate
          );
          socket.emit("broadcast-ice-candidate", {
            to: socketId,
            candidate: event.candidate,
          });
        }
      };

      // Update the ontrack handler
      peerConnection.ontrack = (event) => {
        console.log(
          `Received remote track from user ${userId}:`,
          event.streams[0]
        );
        setBroadcastStreams((prev) => ({
          ...prev,
          [userId]: event.streams[0],
        }));
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`Connection state changed for user ${userId}:`, state);
        if (["disconnected", "failed", "closed"].includes(state)) {
          // Remove the stream when connection is closed
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

  // useEffect(() => {
  //   if (socket) {
  //     // socket.on("user-connected", (connectedUser) => {
  //     //   setUsers((prevUsers) => ({
  //     //     ...prevUsers,
  //     //     [connectedUser.socketId]: connectedUser.username, // Store by socket.id
  //     //   }));
  //     // });
  //     socket.on("ice-candidate", (data) => {
  //       const { from, candidate } = data;

  //       if (peerConnectionsRef.current[from]) {
  //         // If peer connection exists, add ICE candidate
  //         peerConnectionsRef.current[from].addIceCandidate(
  //           new RTCIceCandidate(candidate)
  //         );
  //       } else {
  //         // If no peer connection found, queue the candidate
  //         console.log(
  //           `No peer connection found for user ${from}, queueing candidate`
  //         );
  //         iceCandidatesQueue.current[from] =
  //           iceCandidatesQueue.current[from] || [];
  //         iceCandidatesQueue.current[from].push(candidate);
  //       }
  //     });
  //     socket.on("broadcast-call-answer", handleBroadcastCallAnswer);
  //     socket.on("broadcast-ice-candidate", handleBroadcastIceCandidate);
  //     socket.on("user-left-broadcast-call", ({ userId }) => {
  //       if (broadcastPeerConnectionsRef.current[userId]) {
  //         broadcastPeerConnectionsRef.current[userId].close();
  //         delete broadcastPeerConnectionsRef.current[userId];
  //       }
  //       setBroadcastStreams((prev) => {
  //         const newStreams = { ...prev };
  //         delete newStreams[userId];
  //         return newStreams;
  //       });
  //     });

  //     return () => {
  //       socket.off("broadcast-call-answer");
  //       socket.off("broadcast-ice-candidate");
  //       socket.off("user-left-broadcast-call");
  //       socket.off("ice-candidate");
  //       // socket.off("user-connected");
  //     };
  //   }
  // }, [socket]);

  const startBroadcastCall = async (type) => {
    try {
      console.log("Starting broadcast call of type:", type);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      setLocalStream(stream);
      setCallType(type);
      setBroadcastCall(true);

      // Initialize peer connections before starting the call
      initializeBroadcastPeerConnections();

      Object.keys(users).forEach((userId) => {
        const socketId = userToSocketMap.current[userId];
        const peerConnection = broadcastPeerConnectionsRef.current[userId];

        if (!peerConnection) {
          console.error(`No peer connection found for user ${userId}`);
          return;
        }

        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        createOffer(peerConnection).then((offer) => {
          console.log(`Sending offer to user ${userId}`, offer);
          socket.emit("broadcast-call-offer", {
            to: socketId,
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
      await handleRemoteDescription(
        peerConnection,
        new RTCSessionDescription(answer)
      );
      console.log(
        "Admin successfully set remote description for user:",
        userId
      );
    } catch (error) {
      console.error("Error handling broadcast call answer:", error);
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

    if (peerConnection) {
      try {
        await addIceCandidate(peerConnection, new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error handling broadcast ICE candidate:", error);
      }
    } else {
      console.error(`No peer connection found for user ${userId}`);
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

      return () => {
        socket.off("broadcast-call-answer");
        socket.off("broadcast-ice-candidate");
        socket.off("user-left-broadcast-call");
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
                      ref={(el) => {
                        remoteVideoRefs.current[userId] = el; // Keep a reference to the video element
                        if (el && stream) {
                          el.srcObject = stream; // Set the stream
                          el.play().catch((e) =>
                            console.error("Error playing video:", e)
                          );
                        }
                      }}
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <audio
                      ref={(el) => {
                        if (el) {
                          el.srcObject = stream; // Set the audio stream
                          el.play().catch((e) =>
                            console.error("Error playing audio:", e)
                          );
                        }
                      }}
                      autoPlay
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
