﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useState } from 'react';
import { useEpisodeForm } from '../hooks/useEpisodeForm';
import { useCategories } from '../hooks/useCategories';
import ImageUploader from './ImageUploader';
import CustomSelect from './CustomSelect';

const EpisodeFormModal = ({ isOpen, onClose, episode, onSubmit }) => {
  const { formData, errors, updateField, toggleCategory, validate } = useEpisodeForm(episode);
  const { categories } = useCategories();
  const [coverImageMode, setCoverImageMode] = useState('url');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        category: formData.categories
      });
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--overlay-bg-strong)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--border)'
        }}
      >
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h3>{episode ? '编辑剧集' : '添加新剧集'}</h3>
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-light)',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            关闭
          </button>
        </div>

        {!episode && (
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px'}}>
            添加剧集后将自动打开单集管理，您可以为每一集设置独立的跳转链接
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>标题</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => updateField('title', e.target.value)}
              className={errors.title ? 'error' : ''}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: errors.title ? '1px solid rgb(239, 68, 68)' : '1px solid var(--border)',
                backgroundColor: 'var(--hover-bg-strong)',
                color: 'var(--text-light)',
                fontSize: '14px'
              }}
            />
            {errors.title && <span style={{ color: 'var(--destructive-text)', fontSize: '13px', marginTop: '4px', display: 'block' }}>{errors.title}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>描述</label>
            <textarea
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              rows="3"
              className={errors.description ? 'error' : ''}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: errors.description ? '1px solid rgb(239, 68, 68)' : '1px solid var(--border)',
                backgroundColor: 'var(--hover-bg-strong)',
                color: 'var(--text-light)',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
            {errors.description && <span style={{ color: 'var(--destructive-text)', fontSize: '13px', marginTop: '4px', display: 'block' }}>{errors.description}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>封面图片</label>
            <ImageUploader
              value={formData.coverImage}
              onChange={url => updateField('coverImage', url)}
              label=""
              aspectRatio={2/3}
              outputWidth={400}
              outputHeight={600}
              uploadEndpoint="/api/episodes/upload"
            />
            {errors.coverImage && <span style={{ color: 'var(--destructive-text)', fontSize: '13px', marginTop: '4px', display: 'block' }}>{errors.coverImage}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>总集数</label>
            <input
              type="number"
              value={formData.totalEpisodes}
              onChange={e => updateField('totalEpisodes', parseInt(e.target.value) || 0)}
              className={errors.totalEpisodes ? 'error' : ''}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: errors.totalEpisodes ? '1px solid rgb(239, 68, 68)' : '1px solid var(--border)',
                backgroundColor: 'var(--hover-bg-strong)',
                color: 'var(--text-light)',
                fontSize: '14px'
              }}
            />
            {errors.totalEpisodes && <span style={{ color: 'var(--destructive-text)', fontSize: '13px', marginTop: '4px', display: 'block' }}>{errors.totalEpisodes}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>分类（可多选）</label>
            <div className="checkbox-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {categories.map(category => (
                <label key={category} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
            <p style={{fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px'}}>
              已选择: {formData.categories.join(', ') || '无'}
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>状态</label>
            <CustomSelect
              options={[
                { value: 'ongoing', label: '连载中' },
                { value: 'completed', label: '已完结' },
                { value: 'upcoming', label: '即将上映' }
              ]}
              value={formData.status}
              onChange={status => updateField('status', status)}
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="submit" 
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid var(--primary)',
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {episode ? '更新剧集信息' : '添加并管理单集'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-light)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EpisodeFormModal;
