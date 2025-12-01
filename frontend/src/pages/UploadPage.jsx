import { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './UploadPage.css';

const API_URL = "https://qr-file-sharing-2757.vercel.app";

const UploadPage = () => {
  const { token } = useParams();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(`${API_URL}/api/upload/${token}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      });
      setMessage(`✅ ${data.filename} uploaded successfully!`);
      setFile(null);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || 'Upload failed. Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📄 Upload Your File</h1>
        <p style={styles.subtitle}>Select a PDF, image, or document to upload</p>

        <form onSubmit={handleUpload} style={styles.form}>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/jpg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files[0])}
            style={styles.fileInput}
          />

          {file && (
            <div style={styles.fileInfo}>
              <strong>{file.name}</strong>
              <span> ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            style={{
              ...styles.button,
              ...((!file || uploading) && styles.buttonDisabled)
            }}
          >
            {uploading ? '⏳ Uploading...' : '📤 Upload File'}
          </button>
        </form>

        {message && (
          <div style={{
            ...styles.message,
            ...(message.includes('✅') ? styles.success : styles.error)
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '1rem'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '2rem',
    color: '#333'
  },
  subtitle: {
    margin: '0 0 2rem 0',
    color: '#666'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  fileInput: {
    padding: '0.75rem',
    border: '2px dashed #667eea',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  fileInfo: {
    padding: '0.75rem',
    background: '#f0f0f0',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },
  button: {
    padding: '1rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s'
  },
  buttonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed'
  },
  message: {
    marginTop: '1rem',
    padding: '1rem',
    borderRadius: '6px',
    fontSize: '0.95rem'
  },
  success: {
    background: '#d4edda',
    color: '#155724'
  },
  error: {
    background: '#f8d7da',
    color: '#721c24'
  }
};

export default UploadPage;
