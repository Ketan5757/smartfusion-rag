import '../styles/Dashboard.css';
import Header from './Header';
import Footer from './Footer';

const Dashboard = () => {

  return (
    <>
      {/* Shared Header */}
      <Header />

      {/* Main Content */}
      <div className="dashboard-container">
        <main style={{ padding: '30px' }}>
          <h1>Welcome to Dashboard</h1>
          <p>Start uploading your PDFs or speak your query!</p>
        </main>
      </div>

      {/* Shared Footer */}
      <Footer />
    </>
  );
};

export default Dashboard;
