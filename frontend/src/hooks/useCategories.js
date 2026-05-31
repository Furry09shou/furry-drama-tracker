import { useState, useEffect } from 'react';
import axios from 'axios';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data.map(c => c.name));
      setError('');
    } catch (err) {
      setError('获取分类失败');
      console.error('获取分类失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories
  };
};
