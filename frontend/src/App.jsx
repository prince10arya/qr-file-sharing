import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ShopDashboard from './pages/ShopDashboard';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload/:token" element={<UploadPage />} />
        <Route path="/shop/:token" element={<ShopDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
