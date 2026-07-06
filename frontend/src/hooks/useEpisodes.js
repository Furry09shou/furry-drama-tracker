import { useState, useEffect } from 'react';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

export const useEpisodes = () => {
  const { t } = useI18n();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const response = await adminApi.get('/api/episodes');
      setEpisodes(Array.isArray(response.data) ? response.data : (response.data.episodes || []));
      setError('');
    } catch (err) {
      setError(t('adminEpisodes.fetchEpisodesFailed'));
      console.error('Error fetching episodes:', err);
    } finally {
      setLoading(false);
    }
  };

  const addEpisode = async (episodeData) => {
    try {
      const response = await adminApi.post('/api/episodes', episodeData);
      await fetchEpisodes();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || t('adminEpisodes.addEpisodeFailed'));
      throw err;
    }
  };

  const updateEpisode = async (id, episodeData) => {
    try {
      await adminApi.put(`/api/episodes/${id}`, episodeData);
      await fetchEpisodes();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('adminEpisodes.updateEpisodeFailed'));
      throw err;
    }
  };

  const deleteEpisode = async (id) => {
    try {
      await adminApi.delete(`/api/episodes/${id}`);
      await fetchEpisodes();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('adminEpisodes.deleteEpisodeFailed'));
      throw err;
    }
  };

  const fetchSingleEpisodes = async (episodeId) => {
    try {
      const response = await adminApi.get(`/api/episodes/${episodeId}`);
      return response.data.episodes || [];
    } catch (error) {
      console.error('Error fetching single episodes:', error);
      return [];
    }
  };

  const addSingleEpisode = async (episodeId, singleEpisodeData) => {
    try {
      await adminApi.post(`/api/episodes/${episodeId}/episodes`, singleEpisodeData);
      await fetchEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || t('singleEpisode.addFailed'));
      throw err;
    }
  };

  const updateSingleEpisode = async (id, singleEpisodeData) => {
    try {
      await adminApi.put(`/api/episodes/single/${id}`, singleEpisodeData);
      await fetchEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || t('singleEpisode.editFailed'));
      throw err;
    }
  };

  const deleteSingleEpisode = async (id) => {
    try {
      await adminApi.delete(`/api/episodes/single/${id}`);
      await fetchEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || t('singleEpisode.deleteFailed'));
      throw err;
    }
  };

  useEffect(() => {
    fetchEpisodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    episodes,
    loading,
    error,
    fetchEpisodes,
    addEpisode,
    updateEpisode,
    deleteEpisode,
    fetchSingleEpisodes,
    addSingleEpisode,
    updateSingleEpisode,
    deleteSingleEpisode
  };
};
