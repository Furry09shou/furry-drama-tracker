import { useState } from 'react';
import adminApi from '../utils/adminApi';

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadImage = async (file) => {
    if (!file) return null;

    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过5MB');
      return null;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('只支持 JPEG、PNG、GIF、WebP 格式的图片');
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
      setError(err.response?.data?.message || '图片上传失败');
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
