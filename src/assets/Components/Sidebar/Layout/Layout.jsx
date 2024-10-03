import React from "react";
import Sidebar from "../../Sidebar/Sidebar.jsx";
import "./Layout.css";

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="content">{children}</div>
    </div>
  );
};

export default Layout;
