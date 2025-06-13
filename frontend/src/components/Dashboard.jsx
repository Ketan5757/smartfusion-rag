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

  // NEW: track only the last question, answer, and error
  const [lastQuestion, setLastQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUploadSubmit = () => {
    if (!inputText.trim()) return;
    setSubmittedText(inputText.trim());
    setInputText('');
    // TODO: call ingestion API
  };

  const handleAskQuestion = async () => {
    const q = questionText.trim();
    if (!q) return;

    // 1️⃣ Record lastQuestion and reset prior result
    setLastQuestion(q);
    setAnswer('');
    setError('');
    setQuestionText('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, top_k: 5 }),
      });
      if (!res.ok) {
        const { detail } = await res.json();
        throw new Error(detail || 'Server error');
      }
      const { answer } = await res.json();
      setAnswer(answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMicInput = () => {
    console.log('Mic clicked – implement STT here');
  };

  return (
    <>
      <Header />

      <div className="dashboard-wrapper">
        {/* Left panel: Chat History remains unchanged (no questions are added here) */}
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
              <div className="message placeholder">No messages yet...</div>
            </div>
          </div>
        </div>

        {/* Right panel: Upload + Question + Inline Q&A */}
        <div className="dashboard-right">
          <center><h1>Chat with PDFs and Webpages</h1></center>

          {/* Upload Section (unchanged) */}
          <div className="upload-wrapper">
            <div className="upload-section">
              <label className="upload-label">Upload your pdf or enter link</label>
              <div className="upload-box">
                <input
                  type="text"
                  placeholder="Enter the website link here"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUploadSubmit()}
                />
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) setInputText(f.name);
                  }}
                />
                <label htmlFor="file-upload" title="Upload PDF">
                  <img src={uploadIcon} className="upload-icon" alt="Upload PDF" />
                </label>
                <img
                  src={sendIcon}
                  className="upload-icon"
                  alt="Submit"
                  onClick={handleUploadSubmit}
                />
              </div>
            </div>
            {submittedText && (
              <div className="submitted-output">
                Uploaded: {submittedText.length > 50
                  ? submittedText.slice(0, 50) + '…'
                  : submittedText}
              </div>
            )}
          </div>

          {/* Question Section with inline Q&A */}
          <div className="question-row">
            <label className="question-label">Ask Questions about</label>
            <div className="upload-box">
              <input
                type="text"
                placeholder="Ask your question here"
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                disabled={loading}
              />
              <img
                src={micIcon}
                className="upload-icon"
                alt="Mic"
                onClick={handleMicInput}
              />
              <img
                src={sendIcon}
                className="upload-icon"
                alt="Send"
                onClick={handleAskQuestion}
              />
            </div>

            {/* 2️⃣ Show the question below the input */}
            {lastQuestion && (
              <div className="last-question">  {lastQuestion}</div>
            )}

            {/* 3️⃣ Show “Thinking…” while loading */}
            {loading && (
              <div className="loading-indicator">⏳ Thinking…</div>
            )}

            {/* 4️⃣ Show the answer once received */}
            {answer && (
              <div className="answer-text">✅ {answer}</div>
            )}

            {/* 5️⃣ Show any error */}
            {error && (
              <div className="error-text">❌ {error}</div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Dashboard;
