import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import RequestorDashboard from './pages/RequestorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function FullScreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center">
      <Loader2 className="animate-spin text-brand" size={28} />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1a28', color: '#e8e8f4', border: '1px solid #23233a', fontSize: 14 },
        }}
      />
      {loading ? (
        <FullScreenLoader />
      ) : !user ? (
        <Login />
      ) : user.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <RequestorDashboard />
      )}
    </>
  );
}
