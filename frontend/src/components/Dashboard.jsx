import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';
import uploadIcon from '../assets/upload.png';
import sendIcon from '../assets/send.png';
import { useState } from 'react';
import micIcon from '../assets/mic.png'; 


const Dashboard = () => {

  const [inputText, setInputText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [questionText, setQuestionText] = useState('');

  const handleAskQuestion = () => {
  if (questionText.trim() !== '') {
    console.log("User asked:", questionText);
    //  backend call or chat logic here
    setQuestionText('');
  }
};

const handleMicInput = () => {
  console.log("Mic icon clicked - implement STT here");
};

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
  {/* Ask Questions Section */}
<div className="question-row">
  <label className="question-label">Ask Questions about</label>
  <div className="upload-box">
    <input
      type="text"
      placeholder="Ask your question here"
      value={questionText}
      onChange={(e) => setQuestionText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && questionText.trim() !== '') {
          handleAskQuestion();
        }
      }}
    />
    <img
      src={micIcon}
      alt="Mic"
      className="upload-icon"
      onClick={handleMicInput}
    />
    <img
      src={sendIcon}
      alt="Send"
      className="upload-icon"
      onClick={handleAskQuestion}
    />
  </div>
</div>
</div>
</div>

  <Footer />
</>
  );
};

export default Dashboard;
