import { useState } from 'react';
import './HomePage.css';

const API_URL = 'http://localhost:3000';

const HomePage = () => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);

  const createSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: 'shop-1' })
      });
      const data = await res.json();
      setQrData(data);
    } catch (err) {
      alert('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <div className="logo-large">📱</div>
          <h1>QR Share</h1>
          <p className="tagline">Fast, secure file sharing for print shops</p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Upload</h3>
              <p>Customers scan & upload in seconds</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure</h3>
              <p>Auto-expiring sessions & files</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>Any Format</h3>
              <p>PDF, images, DOC, DOCX</p>
            </div>
          </div>

          {!qrData ? (
            <button onClick={createSession} disabled={loading} className="cta-button">
              {loading ? '⏳ Creating...' : '🚀 Generate QR Code'}
            </button>
          ) : (
            <div className="qr-result">
              <div className="qr-card">
                <h2>✅ Session Created!</h2>
                <img src={qrData.qrDataUrl} alt="QR Code" className="qr-image" />
                <p className="qr-instruction">Show this QR code to customers</p>

                <div className="links-section">
                  <div className="link-item">
                    <span className="link-label">📤 Upload URL:</span>
                    <a href={qrData.uploadUrl} target="_blank" rel="noopener noreferrer" className="link-url">
                      {qrData.uploadUrl}
                    </a>
                  </div>
                  <div className="link-item">
                    <span className="link-label">🏬 Dashboard:</span>
                    <a href={`http://localhost:5173/shop/${qrData.token}`} target="_blank" rel="noopener noreferrer" className="link-url">
                      Open Dashboard
                    </a>
                  </div>
                </div>

                <button onClick={() => setQrData(null)} className="new-session-btn">
                  Create New Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
