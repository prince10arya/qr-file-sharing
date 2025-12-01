import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './UploadPage.css';

const API_URL = "https://qr-file-sharing-2757.vercel.app";

const UploadPage = () => {
  const { token } = useParams();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    // Warn for files larger than 4MB due to Vercel limits
    if (file.size > 4 * 1024 * 1024) {
      setMessage('⚠️ Files larger than 4MB may fail due to server limitations. Please try a smaller file.');
      return;
    }

    setUploading(true);
    setMessage('');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(`${API_URL}/api/upload/${token}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      setMessage(`✅ ${data.filename} uploaded successfully!`);
      setFile(null);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || 'Upload failed. Please try again.'}`);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📄 Upload Your File</h1>
        <p style={styles.subtitle}>Select a PDF, image, or document to upload</p>
        <div style={styles.warning}>
          ⚠️ Files are automatically deleted after 10 minutes
        </div>

        <form onSubmit={handleUpload} style={styles.form}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/jpg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files[0])}
            style={styles.fileInput}
          />

          {file && (
            <div style={{
              ...styles.fileInfo,
              ...(file.size > 4 * 1024 * 1024 && { background: '#fff3cd', border: '1px solid #ffc107' })
            }}>
              <strong>{file.name}</strong>
              <span> ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              {file.size > 4 * 1024 * 1024 && (
                <div style={{ color: '#856404', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  ⚠️ File may be too large for upload
                </div>
              )}
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
            {uploading ? `⏳ Uploading... ${progress}%` : '📤 Upload File'}
          </button>

          {uploading && progress > 0 && (
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          )}
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
    margin: '0 0 1rem 0',
    color: '#666'
  },
  warning: {
    padding: '0.75rem',
    background: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '6px',
    color: '#856404',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
    textAlign: 'center'
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
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: '#667eea',
    transition: 'width 0.3s ease'
  }
};

export default UploadPage;
