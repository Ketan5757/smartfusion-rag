import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';
import uploadIcon from '../assets/upload.png';
import sendIcon from '../assets/send.png';
import micIcon from '../assets/mic.png';
import { useState } from 'react';

const Dashboard = () => {
  const [inputText, setInputText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [chatHistory, setChatHistory] = useState([]); // { sender: 'user'|'bot', text: string }[]
  const [loading, setLoading] = useState(false);

  const handleUploadSubmit = () => {
    if (!inputText.trim()) return;
    setSubmittedText(inputText);
    setInputText('');
    // TODO: send file or URL to backend ingestion endpoint
  };

  const handleAskQuestion = async () => {
    if (!questionText.trim()) return;
    const userQ = questionText.trim();
    // Add user question to history
    setChatHistory((h) => [...h, { sender: 'user', text: userQ }]);
    setQuestionText('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQ, top_k: 5 }),
      });
      const { answer } = await res.json();
      setChatHistory((h) => [...h, { sender: 'bot', text: answer }]);
    } catch (err) {
      console.error(err);
      setChatHistory((h) => [
        ...h,
        { sender: 'bot', text: '❌ Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMicInput = () => {
    console.log('Mic icon clicked – implement STT here');
  };

  return (
    <>
      <Header />

      <div className="dashboard-wrapper">
        <div className="dashboard-left">
          <h2>SmartFusion RAG</h2>
          <p>
            Smarter answers. Real knowledge.
            <br />
            Combining retrieval and generation
            <br />
            for accurate, context-aware
            <br />
            responses from PDFs, websites, and voice input.
          </p>

          <div className="chat-history-box">
            <h3>Chat History</h3>
            <div className="messages">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`message ${msg.sender === 'user' ? 'user' : 'bot'}`}
                >
                  {msg.text}
                </div>
              ))}
              {loading && <div className="message bot">⏳ Thinking…</div>}
            </div>
          </div>
        </div>

        <div className="dashboard-right">
          <center>
            <h1>Chat with PDFs and Webpages</h1>
          </center>

          <div className="upload-wrapper">
            <div className="upload-section">
              <label className="upload-label">
                Upload your pdf or enter link
              </label>
              <div className="upload-box">
                <input
                  type="text"
                  placeholder="Enter the website link here"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUploadSubmit();
                  }}
                />
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
                <label htmlFor="file-upload" title="Upload PDF">
                  <img
                    src={uploadIcon}
                    alt="Upload PDF"
                    className="upload-icon"
                  />
                </label>
                <img
                  src={sendIcon}
                  alt="Submit"
                  className="upload-icon"
                  title="Submit"
                  onClick={handleUploadSubmit}
                />
              </div>
            </div>
          </div>

          {submittedText && (
            <div className="submitted-output">
              <p>
                Uploaded:{' '}
                {submittedText.length > 50
                  ? submittedText.slice(0, 50) + '...'
                  : submittedText}
              </p>
            </div>
          )}

          <div className="question-row">
            <label className="question-label">Ask Questions about</label>
            <div className="upload-box">
              <input
                type="text"
                placeholder="Ask your question here"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskQuestion();
                }}
                disabled={loading}
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
