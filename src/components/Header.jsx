import React from 'react';
import logoImage from '../assets/logo.png'; // your logo image path
import '../styles/HeaderFooter.css';

const Header = () => {
  return (
    <header className="navbar">
      <div className="logo-section">
        <img src={logoImage} alt="Logo" className="logo-img" />
        <div className="logo-text">
          <div className="main-title">SmartFusion RAG</div>
          <div className="tagline">Smart Retrieval from Documents & Web</div>
        </div>
      </div>
    </header>
  );
};

export default Header;