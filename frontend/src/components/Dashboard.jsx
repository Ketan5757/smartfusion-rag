import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';
import uploadIcon from '../assets/upload.png';
import sendIcon   from '../assets/send.png';
import micIcon    from '../assets/mic.png';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  // ── Upload & query state ──
  const [inputText, setInputText]           = useState('');
  const [questionText, setQuestionText]     = useState('');
  const [lastQuestion, setLastQuestion]     = useState('');
  const [answer, setAnswer]                 = useState('');
  const [error, setError]                   = useState('');
  const [uploading, setUploading]           = useState(false);
  const [queryLoading, setQueryLoading]     = useState(false);

  // ── Multi‐file support ──
  const [files, setFiles]                   = useState([]);
  const [submittedFiles, setSubmittedFiles] = useState([]);

  // ── Stored docs (left pane) ──
  const [storedDocs, setStoredDocs] = useState([]);

  // Fetch the list of stored filenames/links on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('http://localhost:8000/documents');
        if (!res.ok) throw new Error('Could not load stored docs');
        const list = await res.json();
       // backend already returns newest-first, so just use it
        setStoredDocs(list);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  // Delete an entire document by filename
  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete all chunks for "${filename}"?`)) return;
    try {
      await fetch(
        `http://localhost:8000/documents?filename=${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      );
      const docsRes = await fetch('http://localhost:8000/documents');
      const docsList = await docsRes.json();
      setStoredDocs(docsList.reverse());
    } catch (e) {
      console.error(e);
    }
  };

  // ── Ingest PDF(s) endpoint ──
  const handleUploadSubmit = async () => {
    if (files.length === 0) return;
    setError(''); setAnswer(''); setUploading(true);

    try {
      for (let f of files) {
        const formData = new FormData();
        formData.append('file', f);
        formData.append('country', 'Germany');
        formData.append('target_group', 'Students');
        formData.append('owner', 'Ketan');

        const res = await fetch('http://localhost:8000/ingest_pdf', {
          method: 'POST',
          body: formData,
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.detail || 'Upload failed');
        setStoredDocs(prev => [f.name, ...prev]); //Shows it immediately on sidebar
        setSubmittedFiles(prev => [ ...prev, f.name ]);
      }
      setAnswer(`Ingested ${files.length} file(s) successfully.`);
      const docsRes = await fetch('http://localhost:8000/documents');
      const docsList = await docsRes.json();
      setStoredDocs(docsList.reverse());
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setFiles([]);
      setInputText('');
      const inp = document.getElementById('file-upload');
      if (inp) inp.value = '';
    }
  };

  // ── Ask question endpoint ──
  const handleAskQuestion = async () => {
    const q = questionText.trim();
    if (!q) return;
    setLastQuestion(q); setAnswer(''); setError(''); setQuestionText(''); setQueryLoading(true);

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
      const { answer: ans } = await res.json();
      setAnswer(ans);
    } catch (err) {
      setError(err.message);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleMicInput = () => console.log('Mic clicked – implement STT here');

  return (
    <>
      <Header/>

      <div className="dashboard-wrapper">
        {/* ── LEFT PANEL ── */}
        <div className="dashboard-left">
          <h3>Stored links &amp; docs</h3>
          <ol className="stored-docs-list">
            {storedDocs.length === 0
              ? <li className="placeholder">No stored docs yet.</li>
              : storedDocs.map(fname => (
                  <li key={fname}>
                    <button
                      className="delete-button"
                      onClick={()=>handleDelete(fname)}
                    >×</button>
                    {fname}
                  </li>
                ))
            }
          </ol>
        </div>

        {/* ── RIGHT PANEL ── */}
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
                  disabled={uploading}
                />
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => {
                    const picked = Array.from(e.target.files).slice(0,5);
                    setFiles(picked);
                    setInputText(picked.map(f=>f.name).join(', '));
                  }}
                  disabled={uploading}
                />
                <label htmlFor="file-upload" title="Upload PDF">
                  <img src={uploadIcon} className="upload-icon" alt="Upload PDF"/>
                </label>
                <img
                  src={sendIcon}
                  className="upload-icon"
                  alt="Submit"
                  onClick={handleUploadSubmit}
                />
              </div>
            </div>

            {submittedFiles.length > 0 && (
              <div className="submitted-output">
                <strong>Uploaded:</strong>
                <ul>
                  {submittedFiles.map((nm,i)=> <li key={i}>{nm}</li>)}
                </ul>
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
                onChange={e=>setQuestionText(e.target.value)}
                onKeyDown={e=>e.key==='Enter' && handleAskQuestion()}
                disabled={queryLoading}
              />
              <img src={micIcon} className="upload-icon" alt="Mic" onClick={handleMicInput}/>
              <img src={sendIcon} className="upload-icon" alt="Send" onClick={handleAskQuestion}/>
            </div>

            {lastQuestion && <div className="last-question">{lastQuestion}</div>}
            {queryLoading  && <div className="loading-indicator">⏳ Thinking…</div>}
            {answer       && <div className="answer-text">✅ {answer}</div>}
            {error        && <div className="error-text">❌ {error}</div>}
          </div>
        </div>
      </div>

      <Footer/>
    </>
  );
};

export default Dashboard;
