import { useState } from 'react';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

export const useImageUpload = () => {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadImage = async (file) => {
    if (!file) return null;

    if (file.size > 5 * 1024 * 1024) {
      setError(t('adminEpisodes.imageSizeExceeded'));
      return null;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(t('adminEpisodes.imageFormatUnsupported'));
      return null;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('coverImage', file);
      const response = await adminApi.post('/api/episodes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.url;
    } catch (err) {
      setError(err.response?.data?.message || t('adminEpisodes.imageUploadFailed'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const clearError = () => {
    setError('');
  };

  return {
    uploading,
    error,
    uploadImage,
    clearError
  };
};
