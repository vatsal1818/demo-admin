import { useState, useEffect } from "react";
import axios from "axios";
import "./AdminLinkControl.css";
import { LINK_STATE } from "../../Helper/Api_helpers";

const UserLinkControl = ({ userId, username, isOpen, onClose }) => {
  const [linkStates, setLinkStates] = useState({
    home: true,
    chat: true,
    alltrade: true,
    courses: true,
    myCourses: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      const fetchUserLinkStates = async () => {
        try {
          console.log("Fetching link states for userId:", userId); // Add this
          const response = await axios.get(
            `${LINK_STATE}/${userId}/link-states`
          );
          console.log("API Response:", response.data); // Add this
          setLinkStates(response.data.links || {});
        } catch (error) {
          console.error("Error fetching user link states:", error);
        }
      };

      fetchUserLinkStates();
    }
  }, [isOpen, userId]);

  const handleToggle = async (key) => {
    try {
      setLoading(true);
      const response = await axios.patch(
        `${LINK_STATE}/${userId}/link-states/${key}`,
        {
          state: !linkStates[key],
        }
      );
      setLinkStates(response.data.links);
    } catch (error) {
      console.error("Error updating user link state:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="link-control-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="link-control-modal">
        <div className="link-control-header">
          <h2>Manage Links for {username}</h2>
          <button className="link-control-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="link-control-body">
          {Object.keys(linkStates).length === 0 ? (
            <div>No link states found</div>
          ) : (
            Object.entries(linkStates).map(([key, value]) => (
              <div key={key} className="link-toggle-container">
                <span className="link-name">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
                <label className="link-toggle-switch">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => handleToggle(key)}
                    disabled={loading}
                  />
                  <span className="link-toggle-slider"></span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserLinkControl;
