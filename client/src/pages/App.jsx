import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Gallery from './pages/Gallery.jsx';
import Legal from './pages/Legal.jsx';
import PayMock from './pages/PayMock.jsx';
import PayManual from './pages/PayManual.jsx';
import PaymentResult from './pages/PaymentResult.jsx';
import Watch from './pages/Watch.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Admin from './pages/Admin.jsx';
import AdminEntry from './pages/AdminEntry.jsx';

export default function App() {
  return (
    <>
      {import.meta.env.MODE === 'single' && (
        <div className="preview-bar">PREVIEW · sample data only. Sign-in accepts any email and any code; nothing is saved.</div>
      )}
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pay/mock" element={<PayMock />} />
          <Route path="/pay/manual" element={<PayManual />} />
          <Route path="/payment/success" element={<PaymentResult />} />
          <Route path="/payment/cancel" element={<PaymentResult cancelled />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/entry/:id" element={<AdminEntry />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
