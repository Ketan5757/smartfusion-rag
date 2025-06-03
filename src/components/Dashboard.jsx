import React from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="left">
          <h2>SmartFusion RAG</h2>
        </div>
        <div className="right">
          {user && (
            <>
              <span className="user-info">
                👤 {user.displayName || user.email}
              </span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '30px' }}>
        <h1>Welcome to your Dashboard</h1>
        <p>Start uploading your PDFs or speak your query!</p>
      </main>
    </div>
  );
};

export default Dashboard;
