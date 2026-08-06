import { useState, useEffect, useRef } from 'react';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

export const useEpisodes = () => {
  const { t } = useI18n();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // 用 ref 保存当前分页参数，避免在 addEpisode 等函数中把 pagination 加入依赖数组
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;

  // 支持分页拉取：后端 /api/episodes 在传入 page+limit 时返回分页结果
  const fetchEpisodes = async (page = paginationRef.current.page, limit = paginationRef.current.limit) => {
    setLoading(true);
    try {
      const response = await adminApi.get('/api/episodes', {
        params: { page, limit }
      });
      const data = response.data;
      setEpisodes(data.episodes || []);
      setPagination({
        page: data.page || page,
        limit: data.limit || limit,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      });
      setError('');
    } catch (err) {
      setError(t('adminEpisodes.fetchEpisodesFailed'));
      console.error('Error fetching episodes:', err);
    } finally {
      setLoading(false);
    }
  };

  // 翻页：跳转到指定页码（保持当前每页条数）
  const fetchPage = async (page) => {
    await fetchEpisodes(page, paginationRef.current.limit);
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
    pagination,
    fetchEpisodes,
    fetchPage,
    addEpisode,
    updateEpisode,
    deleteEpisode,
    fetchSingleEpisodes,
    addSingleEpisode,
    updateSingleEpisode,
    deleteSingleEpisode
  };
};
