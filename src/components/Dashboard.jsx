import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';

const Dashboard = () => {

  return (
    <>
  <Header />

  {/* Main Dashboard Layout */}
  <div className="dashboard-wrapper">
    {/* dashboard Left Section*/}
    <div className="dashboard-left">
      <h2>SmartFusion</h2>
      <p>
        Smarter answers. Real knowledge.<br />
        Combining retrieval and generation for accurate,<br />
        context-aware responses from PDFs, websites, and voice input.
      </p>

      <div className="chat-history-box">
        <h3>Chat History</h3>
        {/* Chat history logic */}
      </div>
    </div>

    {/* Dashboard Right Section  */}
    <div className="dashboard-right">
      <h1>Welcome to Dashboard</h1>
      <p>Start uploading your PDFs or speak your query!</p>
    </div>
  </div>

  <Footer />
</>
  );
};

export default Dashboard;
