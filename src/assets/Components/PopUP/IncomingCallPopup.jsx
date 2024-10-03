import React from "react";
import "./IncomingCallPopup.css"; // Optional: For styling purposes

const IncomingCallPopup = ({ callerName, callType, onAccept, onDecline }) => {
  return (
    <div className="incoming-call-popup">
      <h3>Incoming {callType === "video" ? "Video" : "Audio"} Call</h3>
      <p>From: {callerName}</p>
      <div className="popup-buttons">
        <button className="accept-button" onClick={onAccept}>
          Accept
        </button>
        <button className="decline-button" onClick={onDecline}>
          Decline
        </button>
      </div>
    </div>
  );
};

export default IncomingCallPopup;
