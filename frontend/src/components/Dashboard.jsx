import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';
import uploadIcon from '../assets/upload.png';
import sendIcon   from '../assets/send.png';
import micIcon    from '../assets/mic.png';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  // ── Upload & state ──
  const [inputText, setInputText]           = useState('');
  const [files, setFiles]                   = useState([]);
  const [submittedFiles, setSubmittedFiles] = useState([]);
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState('');

  // ── Stored docs (left pane) ──
  const [storedDocs, setStoredDocs] = useState([]);

  // ── Metadata for filter dropdowns ──
  const [metadata, setMetadata] = useState({
    countries: [],
    job_areas: [],
    source_types: []
  });

  // ── Search filters & results ──
  const [countryFilter, setCountryFilter]       = useState('');
  const [jobAreaFilter, setJobAreaFilter]       = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');
  const [kFilter, setKFilter]                   = useState(5);
  const [results, setResults]                   = useState([]);
  const [searchLoading, setSearchLoading]       = useState(false);
  const [searchError, setSearchError]           = useState('');

  // ── Ask question state ──
  const [questionText, setQuestionText]     = useState('');
  const [lastQuestion, setLastQuestion]     = useState('');
  const [answer, setAnswer]                 = useState('');
  const [error, setError]                   = useState('');
  const [queryLoading, setQueryLoading]     = useState(false);

  // Fetch stored docs and metadata on mount
  useEffect(() => {
    // load documents
    fetch('http://localhost:8000/documents')
      .then(r => r.json())
      .then(list => setStoredDocs(list.reverse()))
      .catch(console.error);
    // load metadata
    fetch('http://localhost:8000/metadata')
      .then(r => r.json())
      .then(m => setMetadata(m))
      .catch(console.error);
  }, []);

  // Delete document by filename
  const handleDelete = async (fn) => {
    if (!window.confirm(`Delete all chunks for "${fn}"?`)) return;
    await fetch(`http://localhost:8000/documents?filename=${encodeURIComponent(fn)}`, { method: 'DELETE' });
    const docs = await fetch('http://localhost:8000/documents').then(r => r.json());
    setStoredDocs(docs.reverse());
  };

  // Upload PDF(s)
  const handleUploadSubmit = async () => {
    if (!files.length) return;
    setUploading(true); setUploadError('');
    try {
      for (let f of files) {
        const form = new FormData();
        form.append('file', f);
        form.append('country', 'Germany');
        form.append('target_group', 'Students');
        form.append('owner', 'Ketan');
        const res = await fetch('http://localhost:8000/ingest_pdf', { method: 'POST', body: form });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.detail || 'Upload failed');
      }
      setSubmittedFiles(files.map(f => f.name));
      const docs = await fetch('http://localhost:8000/documents').then(r => r.json());
      setStoredDocs(docs.reverse());
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
      setFiles([]);
      setInputText('');
      document.getElementById('file-upload').value = '';
    }
  };

  // Trigger filtered search
  const handleSearch = async () => {
    const query = questionText.trim() || lastQuestion;
    if (!query) return;

    setSearchLoading(true);
    setSearchError('');
    setResults([]);
    try {
      const params = new URLSearchParams({ q: query, k: kFilter });
      if (countryFilter)    params.append('country', countryFilter);
      if (jobAreaFilter)    params.append('job_area', jobAreaFilter);
      if (sourceTypeFilter) params.append('source_type', sourceTypeFilter);

      const res = await fetch(`http://localhost:8000/search/?${params.toString()}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setSearchError(e.message);
    } finally {
      setSearchLoading(false);
    }
  };

  // Ask question (original)
  const handleAskQuestion = async () => {
    const q = questionText.trim();
    if (!q) return;
    setLastQuestion(q);
    setAnswer(''); setError(''); setQueryLoading(true);
    try {
      const res = await fetch('http://localhost:8000/answer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, top_k: 5 })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.detail || 'Error');
      setAnswer(payload.answer);
    } catch (e) {
      setError(e.message);
    } finally {
      setQueryLoading(false);
    }
  };

  // STT placeholder
  const handleMicInput = () => console.log('Mic clicked');

  return (
    <>
      <Header />
      <div className="dashboard-wrapper">
        {/* LEFT PANEL */}
        <div className="dashboard-left">
          <h3>Stored links &amp; docs</h3>
          <ol className="stored-docs-list">
            {storedDocs.length === 0
              ? <li className="placeholder">No stored docs yet.</li>
              : storedDocs.map(fn => (
                  <li key={fn}>
                    <button className="delete-button" onClick={()=>handleDelete(fn)}>×</button>
                    {fn}
                  </li>
                ))}
          </ol>
        </div>

        {/* RIGHT PANEL */}
        <div className="dashboard-right">
          <center><h1>Chat with PDFs and Webpages</h1></center>

          {/* Upload Section */}
          <div className="upload-wrapper">
            <label className="upload-label">Upload your pdf or enter link</label>
            <div className="upload-box">
              <input type="text" placeholder="Enter the website link here"
                value={inputText} disabled={uploading}
                onChange={e=>setInputText(e.target.value)} />
              <input type="file" id="file-upload" accept=".pdf,.docx" multiple style={{display:'none'}} 
                onChange={e=>{
                  const pick=Array.from(e.target.files).slice(0,5);
                  setFiles(pick);
                  setInputText(pick.map(f=>f.name).join(', '));
                }} disabled={uploading}/>
              <label htmlFor="file-upload"><img src={uploadIcon} alt="Upload" className="upload-icon"/></label>
              <img src={sendIcon} alt="Submit" className="upload-icon" onClick={handleUploadSubmit}/>
            </div>
            {uploadError && <div className="error-text">❌ {uploadError}</div>}
            {submittedFiles.length>0 && (
              <div className="submitted-output">
                <strong>Uploaded:</strong> {submittedFiles.join(', ')}
              </div>
            )}
          </div>

          {/* Search Filters Section */}
          <div className="filter-row">
            <label className="filter-label">Filter Documents</label>
            <div className="upload-box">
              <input
                list="countries"
                placeholder="Country"
                value={countryFilter}
                onChange={e=>setCountryFilter(e.target.value)}
                className="filter-input"
              />
              <datalist id="countries">
                {metadata.countries.map(c=> <option key={c} value={c}/>) }
              </datalist>

              <input
                list="jobAreas"
                placeholder="Job area"
                value={jobAreaFilter}
                onChange={e=>setJobAreaFilter(e.target.value)}
                className="filter-input"
              />
              <datalist id="jobAreas">
                {metadata.job_areas.map(j=> <option key={j} value={j}/>) }
              </datalist>

              <input
                list="sourceTypes"
                placeholder="Source type"
                value={sourceTypeFilter}
                onChange={e=>setSourceTypeFilter(e.target.value)}
                className="filter-input"
              />
              <datalist id="sourceTypes">
                {metadata.source_types.map(s=> <option key={s} value={s}/>) }
              </datalist>

              <input
                type="number"
                placeholder="k"
                min={1} max={50}
                value={kFilter}
                onChange={e=>setKFilter(e.target.value)}
                className="filter-input w-16"
              />
              <img src={sendIcon} alt="Filter" className="upload-icon" onClick={handleSearch}/>
            </div>
            {searchLoading && <div className="loading-indicator">⏳ Searching…</div>}
            {searchError   && <div className="error-text">❌ {searchError}</div>}

            {/* Results */}
            <div className="results-list">
              {results.length===0
                ? <p className="placeholder">No results to display.</p>
                : results.map((r,i)=>(
                    <div key={i} className="result-item">
                      <strong>{r.filename}</strong>
                      <p className="snippet">{r.snippet}</p>
                    </div>
                  ))}
            </div>
          </div>

          {/* Question Section */}
          <div className="question-row">
            <label className="question-label">Ask Questions about</label>
            <div className="upload-box">
              <input type="text" placeholder="Ask your question here"
                value={questionText} onChange={e=>setQuestionText(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleAskQuestion()}
                disabled={queryLoading}/>
              <img src={micIcon} className="upload-icon" alt="Mic" onClick={handleMicInput}/>
              <img src={sendIcon} className="upload-icon" alt="Send" onClick={handleAskQuestion}/>
            </div>
            {lastQuestion && <div className="last-question">{lastQuestion}</div>}
            {queryLoading  && <div className="loading-indicator">⏳ Thinking…</div>}
            {answer && <div className="answer-box"><p>✅ {answer}</p></div>}
            {error && <div className="error-text">❌ {error}</div>}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Dashboard;
