import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

const ShopDashboard = () => {
  const { token } = useParams();
  const [jobs, setJobs] = useState([]);
  const [expiresAt, setExpiresAt] = useState(null);
  const [error, setError] = useState('');

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/${token}`);
      const data = await res.json();

      if (res.ok) {
        setJobs(data.jobs);
        setExpiresAt(data.expiresAt);
        setError('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch jobs');
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleDownload = (jobId, filename) => {
    window.open(`${API_URL}/api/files/${jobId}`, '_blank');
  };

  const timeRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 60000)) : 0;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏬 Shop Dashboard</h1>
        
        {expiresAt && (
          <div style={styles.timer}>
            ⏱ Session expires in: <strong>{timeRemaining} minutes</strong>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.jobsContainer}>
          <h2 style={styles.subtitle}>Uploaded Files ({jobs.length})</h2>

          {jobs.length === 0 ? (
            <div style={styles.empty}>
              <p>📭 No files uploaded yet</p>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>
                Files will appear here automatically
              </p>
            </div>
          ) : (
            <div style={styles.jobsList}>
              {jobs.map((job) => (
                <div key={job.jobId} style={styles.jobCard}>
                  <div style={styles.jobInfo}>
                    <div style={styles.filename}>📄 {job.filename}</div>
                    <div style={styles.meta}>
                      {(job.size / 1024 / 1024).toFixed(2)} MB • 
                      {new Date(job.uploadedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(job.jobId, job.filename)}
                    style={styles.downloadBtn}
                  >
                    ⬇️ Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    padding: '2rem'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  title: {
    margin: '0 0 1rem 0',
    fontSize: '2rem',
    color: '#333'
  },
  timer: {
    padding: '0.75rem',
    background: '#fff3cd',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    color: '#856404'
  },
  error: {
    padding: '1rem',
    background: '#f8d7da',
    color: '#721c24',
    borderRadius: '6px',
    marginBottom: '1rem'
  },
  jobsContainer: {
    marginTop: '1.5rem'
  },
  subtitle: {
    fontSize: '1.3rem',
    marginBottom: '1rem',
    color: '#555'
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    color: '#999'
  },
  jobsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  jobCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0'
  },
  jobInfo: {
    flex: 1
  },
  filename: {
    fontSize: '1rem',
    fontWeight: 'bold',
    marginBottom: '0.25rem',
    color: '#333'
  },
  meta: {
    fontSize: '0.85rem',
    color: '#666'
  },
  downloadBtn: {
    padding: '0.5rem 1rem',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.3s'
  }
};

export default ShopDashboard;
