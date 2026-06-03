import { useState, useEffect } from 'react';
import adminApi from '../utils/adminApi';

export const useEpisodes = () => {
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
      setError('获取剧集列表失败');
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
      setError(err.response?.data?.message || '添加剧集失败');
      throw err;
    }
  };

  const updateEpisode = async (id, episodeData) => {
    try {
      await adminApi.put(`/api/episodes/${id}`, episodeData);
      await fetchEpisodes();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '更新剧集失败');
      throw err;
    }
  };

  const deleteEpisode = async (id) => {
    try {
      await adminApi.delete(`/api/episodes/${id}`);
      await fetchEpisodes();
      setError('');
    } catch (err) {
      setError('删除剧集失败');
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
      setError(err.response?.data?.message || '添加单集失败');
      throw err;
    }
  };

  const updateSingleEpisode = async (id, singleEpisodeData) => {
    try {
      await adminApi.put(`/api/episodes/single/${id}`, singleEpisodeData);
      await fetchEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || '更新单集失败');
      throw err;
    }
  };

  const deleteSingleEpisode = async (id) => {
    try {
      await adminApi.delete(`/api/episodes/single/${id}`);
      await fetchEpisodes();
    } catch (err) {
      setError('删除单集失败');
      throw err;
    }
  };

  useEffect(() => {
    fetchEpisodes();
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
