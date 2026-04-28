import React from 'react';
import SearchInput from './SearchInput';

const EpisodeSearch = ({ value, onChange, totalCount, filteredCount }) => {
  return (
    <div className="episode-search" style={{ marginBottom: '20px' }}>
      <SearchInput
        value={value}
        onChange={onChange}
        placeholder="搜索剧集标题、描述或分类..."
      />
      {filteredCount !== totalCount && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '13px', 
          color: '#94a3b8' 
        }}>
          显示 {filteredCount} 个结果，共 {totalCount} 个剧集
        </div>
      )}
    </div>
  );
};

export default EpisodeSearch;
