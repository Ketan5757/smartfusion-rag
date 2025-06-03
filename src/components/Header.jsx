import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import logoImage from '../assets/logo.png';
import '../styles/HeaderFooter.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const isDashboard = location.pathname === '/dashboard';

  const handleLogout = async () => {
  await signOut(auth);
  navigate('/'); // Redirect to homepage 
};


  return (
    <header className="navbar">
      <div className="logo-section">
        <img src={logoImage} alt="Logo" className="logo-img" />
        <div className="logo-text">
          <div className="main-title">SmartFusion RAG</div>
          <div className="tagline">Smart Retrieval from Documents & Web</div>
        </div>
      </div>

      {isDashboard && user && (
        <div className="dashboard-header-right">
          <span className="user-info">👤 {user.displayName || user.email}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        )}
    </header>
  );
};

export default Header;
