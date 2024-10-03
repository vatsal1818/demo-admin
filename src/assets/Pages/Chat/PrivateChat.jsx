import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./privateChat.css";
import { useSocket } from "../../Components/Socket/SocketContext";
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  addIceCandidate,
  handleRemoteDescription,
} from "../../Components/WebRTC/WebRTC.jsx";
import {
  API_URL,
  FILE_UPLOAD_URL,
  CHAT_HISTORY_URL,
  USER_INFO_URL,
} from "../../Helper/Api_helpers.jsx";

const admin = "66a87c2125b2b6bad889fb56";

const PrivateChat = ({ user: propUser, onClose }) => {
  const { userId } = useParams();
  const [user, setUser] = useState(propUser);
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const { socket, isConnected } = useSocket();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const messageContainerRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const initializePeerConnection = useCallback(() => {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    peerConnectionRef.current = createPeerConnection(configuration);

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log("Sending ICE candidate", event.candidate);
        socket.emit("ice-candidate", {
          to: user._id,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      console.log("Received remote track", event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    // Add connection state change handler
    peerConnectionRef.current.onconnectionstatechange = (event) => {
      console.log(
        "Connection state changed:",
        peerConnectionRef.current.connectionState
      );
      if (
        peerConnectionRef.current.connectionState === "disconnected" ||
        peerConnectionRef.current.connectionState === "failed" ||
        peerConnectionRef.current.connectionState === "closed"
      ) {
        handleEndCall();
      }
    };
  }, [socket, user]);

  useEffect(() => {
    initializePeerConnection();

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [initializePeerConnection]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  };

  const startRecording = () => {
    if (!localStream) return;

    const mediaRecorder = new MediaRecorder(localStream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      const audioUrl = URL.createObjectURL(audioBlob);
      setRecordedAudio(audioUrl);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const downloadRecording = () => {
    if (recordedAudio) {
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = recordedAudio;
      a.download = "call_recording.webm";
      a.click();
      window.URL.revokeObjectURL(recordedAudio);
    }
  };

  useEffect(() => {
    const fetchUserAndMessages = async () => {
      if (!user && userId) {
        try {
          const userResponse = await axios.get(`${USER_INFO_URL}/${userId}`);
          setUser(userResponse.data);
        } catch (error) {
          console.error("Error fetching user info:", error);
        }
      }

      try {
        const response = await axios.get(
          `${CHAT_HISTORY_URL}/${userId || user?._id}`
        );
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchUserAndMessages();

    if (isConnected) {
      socket.on("user-to-admin", (data) => {
        if (data.sender === (userId || user?._id)) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { ...data, messageType: "private" },
          ]);
        }
      });

      socket.on("call-offer", handleCallOffer);
      socket.on("call-answer", handleCallAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("end-call", () => {
        console.log("PrivateChat: Received end-call event");
        handleEndCall();
      });
      socket.on("call-rejected", handleCallRejected);
    }

    return () => {
      if (isConnected) {
        socket.off("user-to-admin");
        socket.off("admin-private-message");
        socket.off("call-offer");
        socket.off("call-answer");
        socket.off("ice-candidate");
        socket.off("end-call");
        socket.off("call-rejected");
      }
    };
  }, [userId, user, isConnected, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (currentMessage.trim() !== "" && isConnected) {
      socket.emit("admin-private-message", {
        userId: user._id,
        message: currentMessage,
      });
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: admin, text: currentMessage },
      ]);
      setCurrentMessage("");
    }
  };

  const handleDeleteChat = async () => {
    try {
      await axios.delete(`${CHAT_HISTORY_URL}/${user._id}`);
      setMessages([]);
      console.log("Chat history deleted successfully");
    } catch (error) {
      console.error("Error deleting chat history:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("attachment", file);

      try {
        const response = await axios.post(FILE_UPLOAD_URL, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const fileUrl = response.data.fileUrl;

        socket.emit("admin-private-message", { userId: user._id, fileUrl });

        setMessages((prevMessages) => [
          ...prevMessages,
          { fileUrl, sender: admin, receiver: user._id },
        ]);

        await axios.post(API_URL, {
          sender: admin,
          receiver: user._id,
          fileUrl,
          messageType: "private",
        });
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const startCall = async (type) => {
    try {
      console.log("Admin initiating call:", type);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      setLocalStream(stream);
      setCallType(type);
      setInCall(true);

      stream.getTracks().forEach((track) => {
        console.log("Adding track to peer connection", track);
        peerConnectionRef.current.addTrack(track, stream);
      });

      const offer = await createOffer(peerConnectionRef.current);
      console.log("Created offer", offer);

      socket.emit("call-offer", { to: user._id, offer, type });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const handleCallOffer = async ({ from, offer, type }) => {
    console.log("Admin received call offer from:", from, "Offer:", offer);
    setIncomingCall({ from, offer, type });
  };

  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      if (!peerConnectionRef.current) {
        initializePeerConnection();
      }

      // Set the remote description using handleRemoteDescription
      await handleRemoteDescription(
        peerConnectionRef.current,
        new RTCSessionDescription(incomingCall.offer)
      );

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.type === "video",
      });

      setLocalStream(stream);
      setRemoteStream(stream);
      setCallType(incomingCall.type);
      setInCall(true);

      stream.getTracks().forEach((track) => {
        console.log("Adding track to peer connection", track);
        peerConnectionRef.current.addTrack(track, stream);
      });

      const answer = await createAnswer(peerConnectionRef.current);
      console.log("Created answer", answer);

      await peerConnectionRef.current.setLocalDescription(answer);

      if (socket) {
        socket.emit("call-answer", { to: incomingCall.from, answer });
        console.log(
          "Emitting call-answer to:",
          incomingCall.from,
          "Answer:",
          answer
        );
      } else {
        console.error("Socket is not available");
      }

      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleCallAnswer = async ({ from, answer }) => {
    console.log("Admin received call answer from:", from, "Answer:", answer);

    try {
      if (peerConnectionRef.current) {
        await handleRemoteDescription(
          peerConnectionRef.current,
          new RTCSessionDescription(answer)
        );
        console.log("Admin successfully set remote description");
      }
    } catch (error) {
      console.error("Admin error setting remote description:", error);
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;

    socket.emit("call-rejected", { to: incomingCall.from });
    setIncomingCall(null);
  };

  const handleIceCandidate = async ({ candidate }) => {
    console.log("Admin received ICE candidate", candidate);

    try {
      await addIceCandidate(
        peerConnectionRef.current,
        new RTCIceCandidate(candidate)
      );
      console.log("Admin successfully added ICE candidate");
    } catch (error) {
      console.error("Admin error adding ICE candidate:", error);
    }
  };

  const handleEndCall = () => {
    console.log("PrivateChat: Ending call");
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log("PrivateChat: Stopped track:", track.kind);
      });
      setLocalStream(null);
    }
    setRemoteStream(null);
    setInCall(false);
    setCallType(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      console.log("PrivateChat: Closed peer connection");
    }
    initializePeerConnection();

    // Emit end-call event to ensure the other party also ends the call
    console.log("PrivateChat: Emitting end-call event");
    socket.emit("end-call", { to: user._id });
  };

  const endCall = () => {
    handleEndCall();
  };

  const handleCallRejected = () => {
    handleEndCall();
  };

  return (
    <div className="private-chat">
      -
      {user ? (
        <>
          <div className="chat-header">
            <h2>Chat with {user.username}</h2>
            <button className="close-button" onClick={handleClose}>
              Close Chat
            </button>
            <button className="delete-chat-button" onClick={handleDeleteChat}>
              Delete Chat
            </button>
          </div>
        </>
      ) : (
        <div>Loading user information...</div>
      )}
      <div className="message-container" ref={messageContainerRef}>
        {!inCall && !incomingCall && (
          <div className="call-buttons">
            <button onClick={() => startCall("audio")}>Start Voice Call</button>
            <button onClick={() => startCall("video")}>Start Video Call</button>
          </div>
        )}
        {incomingCall && (
          <div className="incoming-call">
            <h3>Incoming {incomingCall.type} call</h3>
            <button onClick={acceptCall}>Accept</button>
            <button onClick={rejectCall}>Reject</button>
          </div>
        )}
        {inCall && (
          <div className="call-container">
            <h3>
              {callType === "audio" ? "Voice Call" : "Video Call"} in progress
            </h3>
            {callType === "video" && (
              <div className="video-streams">
                <div className="local">
                  <h3>You</h3>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: "240px", height: "225px" }}
                  />
                </div>
                <div className="remote">
                  <h3>{user.username}</h3>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{ width: "240px", height: "225px" }}
                  />
                </div>
              </div>
            )}
            {callType === "audio" && (
              <>
                <audio ref={remoteVideoRef} autoPlay />
                <div className="audio-controls">
                  <button onClick={toggleRecording}>
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </button>
                  {recordedAudio && (
                    <button onClick={downloadRecording}>
                      Download Recording
                    </button>
                  )}
                </div>
              </>
            )}
            <button onClick={endCall}>End Call</button>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === admin ? "admin" : "user"}`}
          >
            <p>
              <strong>{msg.sender === admin ? "Admin" : user.username}:</strong>{" "}
              {msg.text}
            </p>
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
                      download
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
      <div className="message-input">
        <input
          onKeyPress={(e) => (e.key === "Enter" ? handleSendMessage() : null)}
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
        />
        <input type="file" onChange={handleFileUpload} />
        <button className="send-button" onClick={handleSendMessage}>
          Send Message
        </button>
      </div>
    </div>
  );
};

export default PrivateChat;
