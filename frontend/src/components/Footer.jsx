import React from 'react';
import '../styles/HeaderFooter.css';

const Footer = () => {
  return (
    <footer className="footer">
      <p>&copy; {new Date().getFullYear()} SmartFusion RAG. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
