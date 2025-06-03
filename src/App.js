import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
// import LoginPage and SignupPage later

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* More routes will be added here soon */}
      </Routes>
    </Router>
  );
}

export default App;
