import { useState } from 'react';

const initialEpisodeState = {
  title: '',
  description: '',
  coverImage: '',
  totalEpisodes: 0,
  status: 'ongoing',
  categories: []
};

export const useEpisodeForm = (initialEpisode = null) => {
  const [formData, setFormData] = useState(
    initialEpisode || initialEpisodeState
  );
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleCategory = (category) => {
    setFormData(prev => {
      const currentCategories = prev.categories;
      if (currentCategories.includes(category)) {
        return { ...prev, categories: currentCategories.filter(c => c !== category) };
      } else {
        return { ...prev, categories: [...currentCategories, category] };
      }
    });
  };

  const resetForm = () => {
    setFormData(initialEpisodeState);
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = '标题不能为空';
    if (!formData.description.trim()) newErrors.description = '描述不能为空';
    if (!formData.coverImage.trim()) newErrors.coverImage = '封面图片不能为空';
    if (formData.totalEpisodes <= 0) newErrors.totalEpisodes = '总集数必须大于0';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    formData,
    errors,
    updateField,
    toggleCategory,
    resetForm,
    validate
  };
};
