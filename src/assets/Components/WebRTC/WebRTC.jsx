let iceCandidatesQueue = [];

export const createPeerConnection = (configuration) => {
  return new RTCPeerConnection(configuration);
};

export const createOffer = async (peerConnection) => {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
};

export const createAnswer = async (peerConnection) => {
  try {
    if (peerConnection.signalingState !== "have-remote-offer") {
      throw new Error("PeerConnection is not in the 'have-remote-offer' state");
    }
    const answer = await peerConnection.createAnswer();
    return answer;
  } catch (error) {
    console.error("Error creating answer:", error);
    throw error;
  }
};

// Handle setting the remote description and process queued ICE candidates
export const handleRemoteDescription = async (peerConnection, description) => {
  try {
    console.log("Setting remote description:", description);

    // Check if the description is valid before setting it
    if (!description || !description.type) {
      throw new Error("Invalid remote description");
    }

    await peerConnection.setRemoteDescription(description);
    console.log("Remote description set successfully.");

    // Process queued ICE candidates
    console.log("Processing queued ICE candidates...");
    iceCandidatesQueue.forEach(async (candidate) => {
      try {
        console.log("Adding queued ICE candidate:", candidate);
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Error adding queued ICE candidate:", error);
      }
    });
    iceCandidatesQueue = [];
  } catch (error) {
    console.error("Error setting remote description:", error);
  }
};

// Handle ICE candidates, queuing them if necessary
export const addIceCandidate = async (peerConnection, candidate) => {
  console.log("Received ICE candidate:", candidate);
  if (
    peerConnection.remoteDescription &&
    peerConnection.remoteDescription.type
  ) {
    console.log("Remote description set. Adding ICE candidate.");
    await peerConnection.addIceCandidate(candidate);
  } else {
    console.log("Remote description not set yet. Queueing ICE candidate.");
    iceCandidatesQueue.push(candidate); // Queue the ICE candidates
  }
};
