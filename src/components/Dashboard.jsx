import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';
import uploadIcon from '../assets/upload.jpeg';


const Dashboard = () => {

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

  <div className="upload-section">
  <label className="upload-label">Upload your pdf or enter link</label>
  
  <div className="upload-box">
    <input type="text" placeholder="Enter the website link here" />

    {/* Hidden File Input */}
    <input
      type="file"
      id="file-upload"
      accept=".pdf"
      style={{ display: 'none' }}
      onChange={(e) => {
        const file = e.target.files[0];
        console.log('Selected file:', file);
        // You can add your file handling logic here
      }}
    />

    {/* Label acts as clickable button for hidden input */}
    <label htmlFor="file-upload" className="upload-btn">
      <img src={uploadIcon} alt="Upload" className="upload-icon" />
    </label>
  </div>
</div>
</div>
  </div>

  <Footer />
</>
  );
};

export default Dashboard;
