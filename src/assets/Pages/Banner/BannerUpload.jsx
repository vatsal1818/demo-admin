import React, { useState, useEffect } from "react";
import axios from "axios";
import { ADMIN_BANNER_UPLOADS } from "../../Helper/Api_helpers";
import "./BannerUpload.css";

const BannerUpload = () => {
  const [banners, setBanners] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [bannerLinks, setBannerLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(ADMIN_BANNER_UPLOADS);
      setBanners(response.data.data);
    } catch (error) {
      console.error("Error fetching banners:", error);
      setMessage("Failed to load banners");
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setSelectedFiles(files);
    // Initialize links array with empty strings for each file
    setBannerLinks(new Array(files.length).fill(""));
  };

  const handleLinkChange = (index, value) => {
    const newLinks = [...bannerLinks];
    newLinks[index] = value;
    setBannerLinks(newLinks);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setMessage("Please select at least one banner image");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("banners", file);
      });
      formData.append("links", JSON.stringify(bannerLinks));

      const response = await axios.post(ADMIN_BANNER_UPLOADS, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        setMessage("Banners uploaded successfully!");
        fetchBanners();
        setSelectedFiles([]);
        setBannerLinks([]);
      }
    } catch (error) {
      console.error("Error uploading banners:", error);
      setMessage(error.response?.data?.message || "Failed to upload banners");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    try {
      const response = await axios.delete(
        `${ADMIN_BANNER_UPLOADS}/${bannerId}`
      );

      if (response.data.status === "success") {
        setMessage("Banner deleted successfully!");
        fetchBanners();
      }
    } catch (error) {
      console.error("Error deleting banner:", error);
      setMessage("Failed to delete banner");
    }
  };

  return (
    <div className="banner-upload-container">
      <h2>Banner Management</h2>

      <form onSubmit={handleUpload} className="banner-upload-form">
        <div className="form-group">
          <label>Upload Banners (Max 5)</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            accept="image/*"
            className="file-input"
          />
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              {selectedFiles.map((file, index) => (
                <div key={index} className="banner-input-group">
                  <span>{file.name}</span>
                  <input
                    type="url"
                    placeholder="Enter banner link"
                    value={bannerLinks[index]}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    className="banner-link-input"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || selectedFiles.length === 0}
          className="upload-button"
        >
          {loading ? "Uploading..." : "Upload Banners"}
        </button>
      </form>

      {message && (
        <div
          className={`message ${
            message.includes("Failed") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

      <div className="banner-list">
        <h3>Current Banners</h3>
        {banners.length === 0 ? (
          <p>No banners uploaded yet</p>
        ) : (
          <div className="banners-grid">
            {banners.map((banner) => (
              <div key={banner._id} className="banner-item">
                <a href={banner.link} target="_blank" rel="noopener noreferrer">
                  <img src={banner.bannerUrl} alt="Banner" />
                </a>
                <div className="banner-details">
                  <span className="banner-link">{banner.link}</span>
                  <button
                    onClick={() => handleDeleteBanner(banner._id)}
                    className="delete-banner-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerUpload;
