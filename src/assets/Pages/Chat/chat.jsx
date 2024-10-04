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
          console.log(
            `Sending ICE candidate to user ${userId}`,
            event.candidate
          );
          socket.emit("ice-candidate", {
            to: userId,
            candidate: event.candidate,
          });
        }
      };

      peerConnectionsRef.current[userId].ontrack = (event) => {
        console.log(`Received track from user ${userId}`, event.streams[0]);
        setRemoteStreams((prev) => ({
          ...prev,
          [userId]: event.streams[0],
        }));
      };

      peerConnectionsRef.current[userId].onconnectionstatechange = () => {
        console.log(
          `Connection state change for user ${userId}:`,
          peerConnectionsRef.current[userId].connectionState
        );
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

  const startCall = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      setLocalStream(stream);
      setCallType(type);
      setInCall(true);

      Object.keys(users).forEach(async (userId) => {
        stream.getTracks().forEach((track) => {
          peerConnectionsRef.current[userId].addTrack(track, stream);
        });

        const offer = await createOffer(peerConnectionsRef.current[userId]);
        socket.emit("call-offer", { to: userId, offer, type });
      });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const handleCallAnswer = async ({ from, answer }) => {
    console.log(`Received answer from user ${from}`, answer);
    try {
      if (peerConnectionsRef.current[from]) {
        await handleRemoteDescription(
          peerConnectionsRef.current[from],
          new RTCSessionDescription(answer)
        );
        console.log(`Set remote description for user ${from}`);

        // Process queued ICE candidates
        if (iceCandidatesQueue.current[from]) {
          while (iceCandidatesQueue.current[from].length) {
            const candidate = iceCandidatesQueue.current[from].shift();
            await addIceCandidate(peerConnectionsRef.current[from], candidate);
            console.log(`Processed queued ICE candidate for user ${from}`);
          }
        }
      }
    } catch (error) {
      console.error("Admin error setting remote description:", error);
    }
  };

  const handleIceCandidate = async ({ from, candidate }) => {
    console.log(`Received ICE candidate from user ${from}`, candidate);
    try {
      const peerConnection = peerConnectionsRef.current[from];
      if (peerConnection) {
        if (
          peerConnection.remoteDescription &&
          peerConnection.remoteDescription.type
        ) {
          await addIceCandidate(peerConnection, new RTCIceCandidate(candidate));
          console.log(`Added ICE candidate for user ${from}`);
        } else {
          // Queue the candidate
          iceCandidatesQueue.current[from].push(new RTCIceCandidate(candidate));
          console.log(`Queued ICE candidate for user ${from}`);
        }
      }
    } catch (error) {
      console.error("Admin error handling ICE candidate:", error);
    }
  };

  const handleEndCall = (userId = null) => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

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
    } else {
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      setRemoteStreams({});
    }

    if (Object.keys(remoteStreams).length === 0) {
      setInCall(false);
      setCallType(null);
    }

    socket.emit("end-call", { to: userId || Object.keys(users) });
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
          <button onClick={() => startCall("audio")}>Start Voice Call</button>
          <button onClick={() => startCall("video")}>Start Video Call</button>
        </div>
      )}

      {inCall && (
        <div className="call-container">
          <h3>
            {callType === "audio" ? "Voice Call" : "Video Call"} in progress
          </h3>
          {callType === "video" && (
            <div className="video-streams">
              <div className="local-stream">
                <h4>You (Admin)</h4>
                <video ref={localVideoRef} autoPlay muted playsInline />
              </div>
              {Object.entries(remoteStreams).map(([userId, stream]) => (
                <div key={userId} className="remote-stream">
                  <h4>{users[userId] || "User"}</h4>
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el) {
                        el.srcObject = stream;
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          {callType === "audio" && (
            <div className="audio-streams">
              {Object.entries(remoteStreams).map(([userId, stream]) => (
                <div key={userId}>
                  <h4>{users[userId] || "User"}</h4>
                  <audio
                    autoPlay
                    controls
                    ref={(el) => {
                      if (el) {
                        el.srcObject = stream;
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <button onClick={() => handleEndCall()}>End Call</button>
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
