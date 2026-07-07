import { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        await axios.get('/api/admin/verify', { withCredentials: true });
        navigate('/admin/dashboard', { replace: true });
      } catch {
        navigate('/login', { replace: true });
      }
    };
    verifyAdmin();
  }, [navigate]);

  return null;
};

export default Admin;
