import { useState, useEffect } from 'react';
import axios from 'axios';

export const useEpisodes = () => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/episodes', {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('adminToken');
      const response = await axios.post('/api/episodes', episodeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEpisodes();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || '添加剧集失败');
      throw err;
    }
  };

  const updateEpisode = async (id, episodeData) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/episodes/${id}`, episodeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEpisodes();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '更新剧集失败');
      throw err;
    }
  };

  const deleteEpisode = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/episodes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEpisodes();
      setError('');
    } catch (err) {
      setError('删除剧集失败');
      throw err;
    }
  };

  const fetchSingleEpisodes = async (episodeId) => {
    try {
      const response = await axios.get(`/api/episodes/${episodeId}`);
      return response.data.episodes || [];
    } catch (error) {
      console.error('Error fetching single episodes:', error);
      return [];
    }
  };

  const addSingleEpisode = async (episodeId, singleEpisodeData) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`/api/episodes/${episodeId}/episodes`, singleEpisodeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || '添加单集失败');
      throw err;
    }
  };

  const updateSingleEpisode = async (id, singleEpisodeData) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/episodes/single/${id}`, singleEpisodeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || '更新单集失败');
      throw err;
    }
  };

  const deleteSingleEpisode = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/episodes/single/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
