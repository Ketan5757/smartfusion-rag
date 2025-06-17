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

  // Track only the last question, answer, and error
  const [lastQuestion, setLastQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  // Separate loading states for upload and query
  const [uploading, setUploading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);

  // Track selected file for upload
  const [file, setFile] = useState(null);

  // Handle PDF upload + ingestion
  const handleUploadSubmit = async () => {
    if (!file) return;
    setSubmittedText(file.name);
    setInputText('');
    setError('');
    setAnswer('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const queryParams = new URLSearchParams({
        country: 'Germany',
        target_group: 'Students',
        owner: 'Ketan',
      });

      const res = await fetch(
        `http://localhost:8000/ingest_pdf?${queryParams.toString()}`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        const { detail } = await res.json();
        throw new Error(detail || 'Upload failed');
      }

      const { detail } = await res.json();
      setAnswer(detail); // show ingestion result as the “answer”
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setFile(null);
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  // Handle asking a question
  const handleAskQuestion = async () => {
    const q = questionText.trim();
    if (!q) return;

    setLastQuestion(q);
    setAnswer('');
    setError('');
    setQuestionText('');
    setQueryLoading(true);

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
      setQueryLoading(false);
    }
  };

  const handleMicInput = () => {
    console.log('Mic clicked – implement STT here');
  };

  return (
    <>
      <Header />

      <div className="dashboard-wrapper">
        {/* Left panel: Chat History unchanged */}
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

          {/* Upload Section */}
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
                  disabled={uploading}
                />
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) {
                      setFile(f);
                      setInputText(f.name);
                    }
                  }}
                  disabled={uploading}
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

          {/* Question Section */}
          <div className="question-row">
            <label className="question-label">Ask Questions about</label>
            <div className="upload-box">
              <input
                type="text"
                placeholder="Ask your question here"
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                disabled={queryLoading}
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

            {/* Show question once asked */}
            {lastQuestion && (
              <div className="last-question">{lastQuestion}</div>
            )}

            {/* Show thinking only during query */}
            {queryLoading && (
              <div className="loading-indicator">⏳ Thinking…</div>
            )}

            {/* Show answer */}
            {answer && (
              <div className="answer-text">✅ {answer}</div>
            )}

            {/* Show error */}
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
