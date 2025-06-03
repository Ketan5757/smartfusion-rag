import React from 'react';
import '../styles/HomePage.css';
import robotImage from '../assets/robot.jpg'; // Replace with your image name

const HomePage = () => {
  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">📘 SmartFusion RAG</div>
        <div className="profile-icon">👤</div>
      </header>

      <div className="main-content">
        <div className="left">
          <img src={robotImage} alt="Robot" className="robot-img" />
        </div>
        <div className="right">
          <h1>SmartFusion RAG</h1>
          <h2>Smarter answers powered by real knowledge.</h2>
          <p>This platform combines advanced retrieval with language generation to deliver accurate, context-aware responses from trusted sources like PDFs, websites, and voice input.</p>
          <button onClick={() => window.location.href='/login'}>Get Started</button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
