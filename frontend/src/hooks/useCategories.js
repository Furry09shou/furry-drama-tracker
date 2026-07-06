import { useState, useEffect } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

export const useCategories = () => {
  const { t } = useI18n();
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
      setError(t('adminCategories.fetchFailed'));
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories
  };
};
