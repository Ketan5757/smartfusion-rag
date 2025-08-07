// src/components/Dashboard.jsx
import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';
import uploadIcon from '../assets/upload.png';
import sendIcon   from '../assets/send.png';
import micIcon    from '../assets/mic.png';
import { useState, useEffect, useRef } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReactMarkdown from 'react-markdown'


const Dashboard = () => {
  // helper to strip extensions
  const stripExt = name => name.replace(/\.[^/.]+$/, '');
  const audioRef = useRef(null);

  // Upload state
  const [inputText, setInputText]           = useState('');
  const [files, setFiles]                   = useState([]);
  const [submittedFiles, setSubmittedFiles] = useState([]);
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef              = useRef(null);
  const audioStreamRef                = useRef(null);

  // Stored docs
  const [storedDocs, setStoredDocs]         = useState([]);
  const chatContainerRef = useRef(null);
  const [selectedDocs, setSelectedDocs] = useState([]);

  // Metadata options
  const countryOptions    = ['Germany','India','France','Spain'];
  const jobAreaOptions    = ['IT','Engineering','Management','Research'];
  const sourceTypeOptions = ['pdf','docx','html'];

  // Upload metadata
  const [uploadCountry, setUploadCountry]        = useState('Germany');
  const [uploadJobArea, setUploadJobArea]        = useState('IT');
  const [uploadSourceType, setUploadSourceType]  = useState('pdf');

  // Filter pane
  const [countryFilter, setCountryFilter]        = useState('');
  const [jobAreaFilter, setJobAreaFilter]        = useState('');
  const [sourceTypeFilter, setSourceTypeFilter]  = useState('');
  const [filtersApplied, setFiltersApplied]      = useState(false);
  const [results, setResults]                    = useState([]);
  const [searchLoading, setSearchLoading]        = useState(false);
  const [searchError, setSearchError]            = useState('');

  // Q&A pane
  const [questionText, setQuestionText]          = useState('');
  //const [lastQuestion, setLastQuestion]          = useState('');
  //const [answer, setAnswer]                      = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [error, setError]                        = useState('');
  const [queryLoading, setQueryLoading]          = useState(false);

  const toggleSelect = fn => {
  setSelectedDocs(current =>
    current.includes(fn)
      ? current.filter(x => x !== fn)
      : [...current, fn]
  );
};

   const handleMicClick = async () => {
  // ▶︎ Start recording
  if (!mediaRecorderRef.current) {
    console.log("🎤 Starting recording...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStreamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    const chunks   = [];

    recorder.ondataavailable = e => {
      chunks.push(e.data);
    };

    recorder.onstop = async () => {
      console.log("🛑 Recording stopped. Chunks count:", chunks.length);
      audioStreamRef.current.getTracks().forEach(t => t.stop());

      const blob = new Blob(chunks, { type: "audio/webm" });
      console.log(" Recorded blob size:", blob.size);

      const form = new FormData();
      form.append("file", blob, "speech.webm");

      // ▶︎ Send to Whisper
      try {
        console.log("🚀 Sending to /api/transcribe …");
        const res = await fetch("http://localhost:8000/api/transcribe", {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        console.log("✅ Transcribe response:", json);
        setQuestionText(json.transcript || "");
      } catch (err) {
        console.error("❌ Transcription error", err);
      }

      mediaRecorderRef.current = null;
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }
  // ▶︎ Stop recording
  else {
    console.log("🛑 Stopping recording…");
    mediaRecorderRef.current.stop();
    setRecording(false);
  }
};


useEffect(() => {
  // Chrome may load voices asynchronously
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('💬 voices available:', voices);
  };

  // Try immediately…
  loadVoices();
  // …and again when they finish loading
  window.speechSynthesis.onvoiceschanged = loadVoices;
}, []);


// TTS Feature
const playTTS = async (text) => {
    try {
      // 1️ If there’s already an Audio playing, stop it and clear the ref
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
        return;
      }

      // 2️ Otherwise, fetch a new MP3 from your backend
      const res = await fetch('http://localhost:8000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || payload.error || `Status ${res.status}`);
      }

      // 3️ Wrap in a Blob so the browser knows it’s MPEG
      const buffer = await res.arrayBuffer();
      const blob   = new Blob([buffer], { type: 'audio/mpeg' });
      const url    = URL.createObjectURL(blob);

      // 4️ Create a new Audio, store it in the ref, and play
      const audio = new Audio(url);
      audioRef.current = audio;

      // 5️ When playback ends, clear the ref so the next click will re-fetch
      audio.onended = () => {
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('TTS playback failed:', err);
    }
  };


  // load stored docs
  useEffect(() => {
    fetch('http://localhost:8000/documents')
      .then(r => r.json())
      .then(list => setStoredDocs(list.reverse()))
      .catch(console.error);
  }, []);

  // delete
  const handleDelete = async fn => {
    if (!window.confirm(`Delete all chunks for "${fn}"?`)) return;
    await fetch(
      `http://localhost:8000/documents?filename=${encodeURIComponent(fn)}`,
      { method: 'DELETE' }
    );
    const docs = await fetch('http://localhost:8000/documents').then(r => r.json());
    setStoredDocs(docs.reverse());
  };

  // upload (handles both file and URL)
  const handleUploadSubmit = async () => {
  setUploading(true);
  setUploadError('');

  try {
    // If user selected files, ingest them as PDFs/DOCX
    if (files.length > 0) {
      for (let f of files) {
        const form = new FormData();
        form.append('file', f);
        form.append('country', uploadCountry);
        form.append('job_area', uploadJobArea);
        form.append('source_type', uploadSourceType);
        form.append('target_group', 'Students');
        form.append('owner', 'Ketan');

        const res = await fetch('http://localhost:8000/ingest_pdf', {
          method: 'POST',
          body: form
        });
        const p = await res.json();
        if (!res.ok) throw new Error(p.detail || 'Upload failed');
      }
      // All files ingested successfully, now append their names to the list
      setSubmittedFiles(prev => [
        ...prev,
        ...files.map(f => f.name)
      ]);
    }
    // Otherwise, if inputText is a URL, ingest it as HTML
    else if (inputText.trim().match(/^https?:\/\//i)) {
      const params = new URLSearchParams({
        url: inputText.trim(),
        country: uploadCountry,
        job_area: uploadJobArea,
        source_type: 'html',
        target_group: 'Students',
        owner: 'Ketan'
      });
      const res = await fetch(`http://localhost:8000/ingest_url?${params}`, {
        method: 'POST'
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.detail || 'URL ingest failed');
      // URL ingested successfully, now append it to the list
      setSubmittedFiles(prev => [
        ...prev,
        inputText.trim()
      ]);
    }
    // Neither a file nor a valid URL? error out
    else {
      throw new Error(
        'Please select a file or enter a valid URL (starting with http:// or https://)'
      );
    }

    // Refresh stored docs list in the sidebar
    const docs = await fetch('http://localhost:8000/documents')
      .then(r => r.json());
    setStoredDocs(docs.reverse());
  } catch (e) {
    setUploadError(e.message);
  } finally {
    setUploading(false);
    setFiles([]);
    setInputText('');
    document.getElementById('file-upload').value = '';
    setFiltersApplied(false);
  }
};


    // filter/search
  const handleSearch = async () => {
    setFiltersApplied(true);
    setSearchLoading(true)
    setSearchError('')
    setResults([])

    try {
      //  no filters at all ⇒ list every file
      if (!countryFilter && !jobAreaFilter && !sourceTypeFilter) {
        const docs = await fetch('http://localhost:8000/documents')
                           .then(r => r.json())
        setResults(docs.map(fn => ({ filename: fn, snippet: '' })))
      }
      // filters set but no question text ⇒ metadata-only listing
      else if (!questionText.trim()) {
        const params = new URLSearchParams()
        if (countryFilter)    params.append('country',    countryFilter)
        if (jobAreaFilter)    params.append('job_area',    jobAreaFilter)
        if (sourceTypeFilter) params.append('source_type', sourceTypeFilter)

        // hits back to /documents with metadata filters
        const docs = await fetch(
          `http://localhost:8000/documents?${params.toString()}`
        ).then(r => r.json())

        setResults(docs.map(fn => ({ filename: fn, snippet: '' })))
      }
      // real Q-and-A search ⇒ vector search endpoint
      else {
        const params = new URLSearchParams({ q: questionText, k: 5 })
        if (countryFilter)    params.append('country',    countryFilter)
        if (jobAreaFilter)    params.append('job_area',    jobAreaFilter)
        if (sourceTypeFilter) params.append('source_type', sourceTypeFilter)

        const res = await fetch(
          `http://localhost:8000/search/?${params.toString()}`
        )
        if (!res.ok) throw new Error(`Status ${res.status}`)
        setResults(await res.json())
      }
    } catch (e) {
      setSearchError(e.message)
    } finally {
      setSearchLoading(false)
    }
  }


  // unique docs
  const uniqueDocs = Array.from(new Set(results.map(r => r.filename)));
  const uniqueDocsCount = uniqueDocs.length;

  // ask question
  const handleAskQuestion = async () => {
    const q = questionText.trim();
    if (!q) return;
    //setLastQuestion(q);
    //setAnswer('');
    setError('');
    setQueryLoading(true);
    try {
      const body = {
        top_k: 5,
        country: countryFilter || undefined,
        job_area: jobAreaFilter || undefined,
        source_type: sourceTypeFilter || undefined,
        filenames: selectedDocs.length ? selectedDocs : undefined,
        messages: [
          ...chatHistory.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: q }
        ]
      };
      if (filtersApplied) {
        if (countryFilter)    body.country     = countryFilter;
        if (jobAreaFilter)    body.job_area    = jobAreaFilter;
        if (sourceTypeFilter) body.source_type = sourceTypeFilter;
      }

      console.log("POST /answer body:", body);

      const res = await fetch('http://localhost:8000/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.detail || 'Error');
      setChatHistory(h => [
        ...h,
        { role: 'user',      content: q },
        { role: 'assistant', content: p.answer }
      ]);
      setQuestionText(''); 
      
    } catch (e) {
      setError(e.message);
    } finally {
      setQueryLoading(false);
    }
  };

  useEffect(() => {
  const container = chatContainerRef.current;
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}, [chatHistory]);

  return (
    <>
      <Header />
      <div className="dashboard-wrapper">
        {/* left list */}
        <div className="dashboard-left">
          <h3>Stored links & docs</h3>
          <ol className="stored-docs-list">
            {storedDocs.length === 0
              ? <li className="placeholder">No stored docs yet.</li>
              : storedDocs.map(fn => (
              <li key={fn} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                type="checkbox"
                checked={selectedDocs.includes(fn)}
                onChange={() => toggleSelect(fn)}
                />
                <button className="delete-button" onClick={() => handleDelete(fn)}>×</button>
                <span>{stripExt(fn)}</span>
                </li>))
            }
          </ol>
        </div>

        {/* right panel */}
        <div className="dashboard-right">
          <center><h1>Chat with PDFs and Webpages</h1></center>
          <div className="top-row">

            {/* upload */}
            <div className="upload-wrapper">
              <label className="upload-label">Upload your PDF or enter link</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Enter the website link here"
                  value={inputText}
                  disabled={uploading}
                  onChange={e => setInputText(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.docx"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => {
                    const pick = Array.from(e.target.files).slice(0, 5);
                    setFiles(pick);
                    setInputText(pick.map(f => f.name).join(', '));
                  }}
                  disabled={uploading}
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                  <img src={uploadIcon} alt="Upload" className="upload-icon"/>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <select
                  value={uploadCountry}
                  onChange={e => setUploadCountry(e.target.value)}
                  className="filter-input"
                >
                  {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={uploadJobArea}
                  onChange={e => setUploadJobArea(e.target.value)}
                  className="filter-input"
                >
                  {jobAreaOptions.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                <select
                  value={uploadSourceType}
                  onChange={e => setUploadSourceType(e.target.value)}
                  className="filter-input"
                >
                  {sourceTypeOptions.map(s => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
                <button
                  onClick={handleUploadSubmit}
                  disabled={uploading}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img src={sendIcon} alt="Submit" className="upload-icon"/>
                </button>
              </div>
              {uploadError && <div className="error-text">❌ {uploadError}</div>}
              {submittedFiles.length > 0 && (
                <div className="submitted-output">
                  <strong>Uploaded:</strong> {submittedFiles.map(stripExt).join(', ')}
                </div>
              )}
            </div>

            {/* filter */}
            <div className="filter-wrapper">
              <label className="filter-label">Filter Documents</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={countryFilter}
                  onChange={e => setCountryFilter(e.target.value)}
                  className="filter-input"
                >
                  <option value="">Country</option>
                  {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={jobAreaFilter}
                  onChange={e => setJobAreaFilter(e.target.value)}
                  className="filter-input"
                >
                  <option value="">Job Area</option>
                  {jobAreaOptions.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                <select
                  value={sourceTypeFilter}
                  onChange={e => setSourceTypeFilter(e.target.value)}
                  className="filter-input"
                >
                  <option value="">Source Type</option>
                  {sourceTypeOptions.map(s => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
                <button
                  onClick={handleSearch}
                  disabled={searchLoading}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img src={sendIcon} alt="Filter" className="upload-icon"/>
                </button>
              </div>
              {searchError && <div className="error-text">❌ {searchError}</div>}
              {uniqueDocsCount > 0 ? ( <>
              <div className="filter-found">
                Found <strong>{uniqueDocsCount}</strong> document
                {uniqueDocsCount > 1 ? 's' : ''} matching your filters:
                </div>
                <div className="filter-results">
                  <ul>
                    {uniqueDocs.map(fn => (
                      <li key={fn}>{stripExt(fn)}</li>
                      ))}
                      </ul>
                      </div>
                      </>
                    ) : !searchLoading && <p className="placeholder">No results to display.</p>}
                    </div>
                    </div>

          {/* Q&A */}
<div className="question-row">
  <label className="question-label">Ask Questions about</label>
  <div
    className="upload-box"
    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
  >
    <input
      type="text"
      placeholder="Ask your question here"
      value={questionText}
      onChange={e => setQuestionText(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
      disabled={queryLoading}
      style={{ flexGrow: 1 }}
    />
    <img
  src={micIcon}
  className="upload-icon"
  alt="Mic"
  style={{ opacity: recording ? 0.5 : 1 }}
  onClick={handleMicClick}
/>

    <img
      src={sendIcon}
      className="upload-icon"
      alt="Send"
      onClick={handleAskQuestion}
    />
  </div>

{/* Scrollable chat history */}
<div className="chat-container" ref={chatContainerRef}>
  {chatHistory.length === 0 ? (
    <p className="placeholder">No messages yet.</p>
  ) : (
    chatHistory.map((msg, i) =>
      msg.role === 'user' ? (
        <div
          key={i}
          className="chat-user"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span className="chat-user-icon">👤 ⇒</span>
          <div className="chat-user-text" style={{ flexGrow: 1 }}>
            <ReactMarkdown>
              {msg.content}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div
          key={i}
          className="chat-assistant"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <div className="chat-assistant-text" style={{ flexGrow: 1 }}>
            <ReactMarkdown>
              {msg.content}
            </ReactMarkdown>
          </div>
          <PlayArrowIcon
            sx={{ cursor: 'pointer', fontSize: 24, marginLeft: '0.5rem' }}
            onClick={() => playTTS(msg.content)}
          />
        </div>
      )
    )
  )}
</div>

{error && <div className="error-text">❌ {error}</div>}
  </div>
  </div>
  </div>
  <Footer />
    </>
  );
};

export default Dashboard;
