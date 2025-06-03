import React from 'react';
import '../styles/HomePage.css';
import robotImage from '../assets/robot.jpg';
import logoImage from '../assets/logo.png';
import { useNavigate } from 'react-router-dom';


const HomePage = () => {
    const navigate = useNavigate();
  return (
    <div className="home-container">
      {/* Header */}
      <header className="navbar">
        <div className="logo-section">
          <img src={logoImage} alt="Logo" className="logo-img" />
          <div className="logo-text">
            <div className="main-title">SmartFusion RAG</div>
            <div className="tagline">Smart Retrieval from Documents & Web</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        <div className="left">
          <img src={robotImage} alt="Robot" className="robot-img" />
        </div>
        <div className="right">
          <h1>SmartFusion RAG</h1>
          <h2>Smarter answers powered by real knowledge.</h2>
          <p>This platform combines advanced retrieval with language generation to deliver accurate, context-aware responses from trusted sources like PDFs, websites, and voice input.</p>
          <button onClick={() => navigate('/login')}>Get Started</button>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2025 SmartFusion RAG. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;

