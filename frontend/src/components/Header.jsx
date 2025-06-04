import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import logoImage from '../assets/logo.png';
import '../styles/HeaderFooter.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const isDashboard = location.pathname === '/dashboard';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe(); // Clean up the listener on unmount
  }, []);

  const handleLogout = async () => {
  const confirmLogout = window.confirm('Are you sure you want to logout?');
  if (confirmLogout) {
    await signOut(auth);
    navigate('/'); // Redirect to homepage
  }
  // else: do nothing, stay on the page
};


  return (
    <header className="navbar">
      <div className="logo-section" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
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
