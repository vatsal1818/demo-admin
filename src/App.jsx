import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Navbar from "./assets/Components/navbar/navbar.jsx";
import Home from "./assets/Pages/Home/Home.jsx";
import LoginSignUp from "./assets/Components/LoginSignup/LoginSignup.jsx";
import ProtectedRoute from "./assets/Components/ProtectedRoute/ProtectedRoute.jsx";
import Users from "./assets/Pages/Users/Users.jsx";
import Layout from "./assets/Components/Sidebar/Layout/Layout.jsx";
import AdminChat from "./assets/Pages/Chat/chat.jsx";
import { SocketProvider } from "./assets/Components/Socket/SocketContext.jsx";
import AllUserTrade from "./assets/Pages/AllUser-trades/AllUserTrade.jsx";
import { NotificationProvider } from "./assets/Components/Notification/NotificationContext.jsx";
import GlobalNotification from "./assets/Components/Notification/GlobalNotification.jsx";
import PrivateChat from "./assets/Pages/Chat/PrivateChat.jsx";
import AllUserTradeByUser from "./assets/Pages/Alluser-trades-by-User/AllusersTradesByUser.jsx";

function App() {
  return (
    <Router>
      <SocketProvider>
        <NotificationProvider>
          <div>
            <Navbar />
            <Layout>
              <GlobalNotification />
              <Routes>
                <Route path="/login" element={<LoginSignUp />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <AdminChat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/allusers-trade"
                  element={
                    <ProtectedRoute>
                      <AllUserTrade />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/allusers-trade-by-user"
                  element={
                    <ProtectedRoute>
                      <AllUserTradeByUser />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/private-chat/:userId"
                  element={
                    <ProtectedRoute>
                      <PrivateChat onClose={() => {}} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <GlobalNotification />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Layout>
          </div>
        </NotificationProvider>
      </SocketProvider>
    </Router>
  );
}

export default App;
