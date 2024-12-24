import React, { useState, useEffect } from "react";
import axios from "axios";

const SubscriberCount = () => {
  const [platform, setPlatform] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [subscriberCount, setSubscriberCount] = useState(null);

  const fetchData = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/${platform}/${identifier}`
      );
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(
        "Failed to fetch data. Make sure the identifier and platform are correct."
      );
      setData(null);
    }
  };

  useEffect(() => {
    const fetchSubscriberCount = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/telegram`
        );
        setSubscriberCount(response.data.subscriberCount);
      } catch (error) {
        console.error("Error fetching subscriber count:", error.message);
      }
    };

    fetchSubscriberCount();
  }, []);

  return (
    <div>
      <div>
        <h1>Telegram Live Subscriber Count</h1>
        <p>
          {subscriberCount ? `Subscribers: ${subscriberCount}` : "Loading..."}
        </p>
      </div>
      <h1>Fetch Subscriber/Followers/Download Count</h1>
      <select onChange={(e) => setPlatform(e.target.value)} value={platform}>
        <option value="">Select Platform</option>
        <option value="youtube">YouTube</option>
        <option value="instagram">Instagram</option>
        <option value="playstore">Play Store</option>
      </select>
      <input
        type="text"
        placeholder={
          platform === "playstore" ? "Enter App ID" : "Enter Username/Channel"
        }
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <button onClick={fetchData}>Fetch Count</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {data && (
        <div>
          <h2>Platform: {data.platform}</h2>
          <p>
            {data.platform === "YouTube"
              ? `Subscribers: ${data.subscriberCount}`
              : data.platform === "Instagram"
              ? `Followers: ${data.followerCount}`
              : `Downloads: ${data.downloadCount}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default SubscriberCount;
