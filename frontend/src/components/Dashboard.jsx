import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';
import uploadIcon from '../assets/upload.png';
import sendIcon from '../assets/send.png';
import { useState } from 'react';


const Dashboard = () => {

  const [inputText, setInputText] = useState('');
  const [submittedText, setSubmittedText] = useState('');

  return (
    <>
  <Header />

  {/* Main Dashboard Layout */}
  <div className="dashboard-wrapper">
    {/* dashboard Left Section*/}
    <div className="dashboard-left">
      <h2>SmartFusion RAG</h2>
      <p>
        Smarter answers. Real knowledge.<br />
        Combining retrieval and generation <br />
        for accurate, context-aware <br />
        responses from PDFs, websites, and voice input.
      </p>

      <div className="chat-history-box">
        <h3>Chat History</h3>
        {/* Chat history logic */}
      </div>
    </div>

    {/* Dashboard Right Section  */}
    <div className="dashboard-right">
  <center><h1>Chat with PDFs and Webpages</h1></center>

  <div className="upload-wrapper">
  <div className="upload-section">
    <label className="upload-label">Upload your pdf or enter link</label>
<div className="upload-box">
  {/* Input field */}
  <input
    type="text"
    placeholder="Enter the website link here"
    value={inputText}
    onChange={(e) => setInputText(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && inputText.trim() !== '') {
        setSubmittedText(inputText);
        setInputText('');
      }
    }}
  />

  {/* Hidden file input */}
  <input
    type="file"
    id="file-upload"
    accept=".pdf"
    style={{ display: 'none' }}
    onChange={(e) => {
      const file = e.target.files[0];
      if (file) setInputText(file.name);
    }}
  />

  {/* upload.png triggers file picker */}
  <label htmlFor="file-upload" title="Upload PDF">
    <img src={uploadIcon} alt="Upload PDF" className="upload-icon" />
  </label>

  {/* send.png submits input */}
  <img
    src={sendIcon}
    alt="Submit"
    className="upload-icon"
    title="Submit"
    onClick={() => {
      if (inputText.trim() !== '') {
        setSubmittedText(inputText);
        setInputText('');
      }
    }}
  />
</div>
</div>
</div>

  {/* Output BELOW, not affecting the input box width */}
  {submittedText && (
  <div className="submitted-output">
    <p>
      Uploaded : {submittedText.length > 50
        ? submittedText.slice(0, 50) + '...'
        : submittedText}
    </p>
  </div>
  )}
</div>
</div>

  <Footer />
</>
  );
};

export default Dashboard;
