# QR-Based File Sharing System

A cloud-native file sharing solution for print shops that eliminates the need for WhatsApp, email, or USB drives. Customers scan a QR code, upload their documents, and shop staff download them from a real-time dashboard.

**Zero friction. Zero apps. Zero login.**

---

## 🎯 Project Overview

This system enables print shops to receive customer files instantly through QR codes. The shop generates a temporary session with a unique QR code, customers scan it to upload files, and the shop views all uploads in a live dashboard. All sessions and files auto-expire for security.

### Key Highlights
- **Cloud Storage**: AWS S3 for scalable file storage
- **Session Management**: Redis for distributed session handling
- **Real-time Updates**: Dashboard auto-refreshes every 5 seconds
- **Secure**: Time-limited sessions, signed URLs, automatic cleanup
- **Production Ready**: Deployed on Vercel (frontend) and cloud backend

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        PRINT SHOP WORKFLOW                       │
└──────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐    ┌─────────────────┐
          │  Generate QR    │    │ View Dashboard  │
          │  (HomePage)     │    │ (ShopDashboard) │
          └─────────────────┘    └─────────────────┘
                    │                       ▲
                    │                       │
                    ▼                       │
          ┌─────────────────┐              │
          │  Customer Scans │              │
          │  QR Code        │              │
          └─────────────────┘              │
                    │                       │
                    ▼                       │
          ┌─────────────────┐              │
          │  Upload File    │──────────────┘
          │  (UploadPage)   │
          └─────────────────┘
```

### Technical Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│                  Deployed on Vercel (Port 5173)                  │
├──────────────────────────────────────────────────────────────────┤
│  Routes:                                                         │
│  • /                    → HomePage (Generate QR)                 │
│  • /upload/:token       → UploadPage (Customer upload)           │
│  • /shop/:token         → ShopDashboard (View files)             │
│                                                                  │
│  Tech Stack:                                                     │
│  • React 18 + React Router                                       │
│  • Axios for API calls                                           │
│  • CSS-in-JS styling                                             │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼ REST API (HTTPS)
┌──────────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express)                         │
│                    Port 3000 (Cloud Hosted)                      │
├──────────────────────────────────────────────────────────────────┤
│  API Endpoints:                                                  │
│  • POST /api/sessions        → Create session + QR code          │
│  • POST /api/upload/:token   → Upload file to S3                 │
│  • GET  /api/jobs/:token     → List all uploaded files           │
│  • GET  /api/files/:jobId    → Generate signed download URL      │
│  • GET  /api/health          → Health check                      │
│                                                                  │
│  Middleware:                                                     │
│  • Multer + Multer-S3 (file upload)                              │
│  • CORS (cross-origin requests)                                  │
│  • Express.json (JSON parsing)                                   │
│                                                                  │
│  Dependencies:                                                   │
│  • @aws-sdk/client-s3 (S3 operations)                            │
│  • @aws-sdk/s3-request-presigner (signed URLs)                   │
│  • qrcode (QR generation)                                        │
│  • redis (session storage)                                       │
└──────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
    ┌───────────────────────┐   ┌───────────────────────┐
    │   REDIS CLOUD         │   │   AWS S3 BUCKET       │
    │   (Session Store)     │   │   (File Storage)      │
    ├───────────────────────┤   ├───────────────────────┤
    │ • Session metadata    │   │ • Uploaded files      │
    │ • Job tracking        │   │ • Organized by key    │
    │ • TTL-based expiry    │   │ • Signed URL access   │
    │ • Distributed cache   │   │ • Scalable storage    │
    └───────────────────────┘   └───────────────────────┘
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         COMPLETE DATA FLOW                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Shop → POST /api/sessions                                    │
│     ↓                                                            │
│     Backend generates token, stores in Redis, creates QR        │
│     ↓                                                            │
│     Returns: { token, uploadUrl, qrDataUrl, expiresAt }         │
│                                                                  │
│  2. Customer → Scans QR → Opens /upload/:token                   │
│     ↓                                                            │
│     Selects file → POST /api/upload/:token                       │
│     ↓                                                            │
│     Backend validates session (Redis lookup)                     │
│     ↓                                                            │
│     Multer-S3 uploads file directly to AWS S3                    │
│     ↓                                                            │
│     Job metadata stored in Redis with TTL                        │
│     ↓                                                            │
│     Returns: { jobId, filename, size }                           │
│                                                                  │
│  3. Shop → Opens /shop/:token (auto-refreshes every 5s)          │
│     ↓                                                            │
│     GET /api/jobs/:token                                         │
│     ↓                                                            │
│     Backend fetches job list from Redis                          │
│     ↓                                                            │
│     Returns: { jobs: [...], expiresAt }                          │
│                                                                  │
│  4. Shop → Clicks download → GET /api/files/:jobId               │
│     ↓                                                            │
│     Backend generates S3 signed URL (1 hour expiry)              │
│     ↓                                                            │
│     Redirects to signed URL → File downloads from S3             │
│                                                                  │
│  5. Auto-cleanup → Redis TTL expires sessions & jobs             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
file-sharing-site/
├── backend/
│   ├── server.js              # Express server with all API endpoints
│   ├── package.json           # Dependencies: express, multer, aws-sdk, redis
│   ├── Dockerfile             # Node.js 18 Alpine container
│   ├── .env                   # Environment configuration
│   └── uploads/               # Local directory (not used in production)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # React Router setup
│   │   ├── main.jsx           # React entry point
│   │   ├── App.css            # Global styles
│   │   └── pages/
│   │       ├── HomePage.jsx       # QR generation page
│   │       ├── HomePage.css       # Home page styles
│   │       ├── UploadPage.jsx     # Customer upload interface
│   │       ├── UploadPage.css     # Upload page styles
│   │       ├── ShopDashboard.jsx  # Shop file management
│   │       └── ShopDashboard.css  # Dashboard styles
│   ├── package.json           # Dependencies: react, react-router-dom, axios
│   ├── vite.config.js         # Vite configuration
│   ├── vercel.json            # Vercel deployment config
│   ├── Dockerfile             # Node.js container for frontend
│   └── index.html             # HTML entry point
│
├── docker-compose.yml         # Multi-container orchestration
├── test-api.html              # API testing interface
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for containerized deployment)
- AWS Account (S3 bucket)
- Redis Cloud account (or local Redis)

### Local Development

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/file-sharing-site.git
cd file-sharing-site
```

#### 2. Configure Backend
Create `backend/.env`:
```env
PORT=3000
PUBLIC_URL=http://localhost:5173
SESSION_TTL_MIN=30
FILE_TTL_HOURS=24
MAX_FILE_SIZE_BYTES=52428800

# Redis Configuration
REDIS_URL=redis://localhost:6379

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET=your-bucket-name
```

#### 3. Run with Docker Compose
```bash
docker-compose up --build
```

#### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/api/health

### Manual Setup (Without Docker)

#### Backend
```bash
cd backend
npm install
npm start
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Reference

### Create Session
```http
POST /api/sessions
Content-Type: application/json

{
  "shopId": "shop-1"
}
```

**Response:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0",
  "uploadUrl": "http://localhost:5173/upload/a1b2c3d4e5f6g7h8i9j0",
  "qrDataUrl": "data:image/png;base64,iVBORw0KG...",
  "expiresAt": 1713456000000
}
```

### Upload File
```http
POST /api/upload/:token
Content-Type: multipart/form-data

file: [binary data]
```

**Response:**
```json
{
  "jobId": "abc123def456",
  "filename": "document.pdf",
  "size": 1048576
}
```

### List Jobs
```http
GET /api/jobs/:token
```

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "abc123def456",
      "filename": "document.pdf",
      "size": 1048576,
      "uploadedAt": 1713456000000
    }
  ],
  "expiresAt": 1713456000000
}
```

### Download File
```http
GET /api/files/:jobId
```

**Response:** Redirects to S3 signed URL (1-hour expiry)

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3000` |
| `PUBLIC_URL` | Frontend URL for QR codes | `http://localhost:5173` |
| `SESSION_TTL_MIN` | Session expiry time (minutes) | `30` |
| `FILE_TTL_HOURS` | File expiry time (hours) | `24` |
| `MAX_FILE_SIZE_BYTES` | Max upload size | `52428800` (50MB) |
| `REDIS_URL` | Redis connection string | Required |
| `AWS_ACCESS_KEY_ID` | AWS access key | Required |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required |
| `AWS_REGION` | AWS region | Required |
| `S3_BUCKET` | S3 bucket name | Required |

### File Type Restrictions
Allowed extensions: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.doc`, `.docx`

---

## 🔒 Security Features

1. **Time-Limited Sessions**: Sessions expire after 30 minutes (configurable)
2. **Auto-Expiring Files**: Files deleted after 24 hours (configurable)
3. **Signed URLs**: S3 downloads use pre-signed URLs with 1-hour expiry
4. **Token-Based Access**: Unguessable 20-character hex tokens
5. **File Type Validation**: Only allowed file types accepted
6. **Size Limits**: Configurable max file size (default 50MB)
7. **Redis TTL**: Automatic cleanup of expired sessions and jobs
8. **CORS Protection**: Configured for specific origins

---

## 🏭 Production Deployment

### Current Setup
- **Frontend**: Deployed on Vercel
- **Backend**: Cloud-hosted (configurable)
- **Storage**: AWS S3
- **Cache**: Redis Cloud

### Deployment Checklist
- [ ] Set `PUBLIC_URL` to production frontend URL
- [ ] Configure CORS for production domain
- [ ] Use HTTPS for all endpoints
- [ ] Set up S3 bucket with proper IAM policies
- [ ] Configure Redis with authentication
- [ ] Set appropriate TTL values
- [ ] Enable CloudWatch/logging
- [ ] Set up monitoring and alerts

---

## 🧪 Testing

Use the included `test-api.html` file to test API endpoints manually.

```bash
# Open in browser
open test-api.html
```

---

## 📊 System Capabilities

- **Concurrent Sessions**: Unlimited (Redis-backed)
- **File Storage**: Scalable (AWS S3)
- **Max File Size**: 50MB (configurable)
- **Session Duration**: 30 minutes (configurable)
- **File Retention**: 24 hours (configurable)
- **Real-time Updates**: 5-second polling interval

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **File Upload**: Multer + Multer-S3
- **Storage**: AWS S3
- **Cache**: Redis
- **QR Generation**: qrcode library
- **Container**: Docker (Alpine Linux)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS-in-JS
- **Deployment**: Vercel

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Cloud Storage**: AWS S3
- **Session Store**: Redis Cloud
- **CDN**: Vercel Edge Network

---

## 📝 Limitations & Future Enhancements

### Current Limitations
- No authentication for shop dashboard
- Polling-based updates (not WebSocket)
- No multi-shop management
- No file preview functionality
- No print queue management

### Planned Improvements
- [ ] WebSocket for real-time updates
- [ ] Shop authentication (JWT)
- [ ] Multi-shop support with admin panel
- [ ] File preview (PDF, images)
- [ ] Print queue management
- [ ] Analytics dashboard
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Virus scanning (ClamAV)
- [ ] Kubernetes deployment

---

## 📄 License

MIT License - Feel free to use this project for commercial purposes.

---

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ for print shops everywhere**
