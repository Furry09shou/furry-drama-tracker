import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';

const initialEpisodeState = {
  title: '',
  description: '',
  coverImage: '',
  totalEpisodes: 0,
  status: 'ongoing',
  categories: []
};

export const useEpisodeForm = (initialEpisode = null) => {
  const { t } = useI18n();
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
    if (!formData.title.trim()) newErrors.title = t('adminEpisodes.titleRequired');
    if (!formData.description.trim()) newErrors.description = t('adminEpisodes.descriptionRequired');
    if (!formData.coverImage.trim()) newErrors.coverImage = t('adminEpisodes.coverRequired');
    if (formData.totalEpisodes <= 0) newErrors.totalEpisodes = t('adminEpisodes.totalEpisodesRequired');

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
