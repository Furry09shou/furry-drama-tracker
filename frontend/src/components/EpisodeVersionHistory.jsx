import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const EpisodeVersionHistory = ({ episodeId, onClose }) => {
  const { t, locale } = useI18n();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareV1, setCompareV1] = useState(null);
  const [compareV2, setCompareV2] = useState(null);
  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [episodeId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get(`/api/versions/${episodeId}`);
      setVersions(res.data.versions || []);
    } catch (error) {
      console.error('Fetch versions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (version) => {
    if (compareMode) {
      if (!compareV1) {
        setCompareV1(version);
      } else if (!compareV2) {
        setCompareV2(version);
      } else {
        setCompareV1(version);
        setCompareV2(null);
        setDiff(null);
      }
    } else {
      setSelectedVersion(selectedVersion?.version === version.version ? null : version);
    }
  };

  const handleCompare = async () => {
    if (!compareV1 || !compareV2) return;
    setDiffLoading(true);
    try {
      const v1 = compareV1.version < compareV2.version ? compareV1.version : compareV2.version;
      const v2 = compareV1.version < compareV2.version ? compareV2.version : compareV1.version;
      const res = await adminApi.get(`/api/versions/${episodeId}/diff/${v1}/${v2}`);
      setDiff(res.data);
    } catch (error) {
      console.error('Diff error:', error);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleRollback = async (version) => {
    const confirmed = window.confirm(t('version.rollbackConfirm', { v: version.version }));
    if (!confirmed) return;
    try {
      await adminApi.post(`/api/versions/${episodeId}/rollback/${version.version}`);
      alert(t('version.rollbackSuccess'));
      fetchVersions();
    } catch (error) {
      console.error('Rollback error:', error);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setCompareV1(null);
    setCompareV2(null);
    setDiff(null);
    setSelectedVersion(null);
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const modal = (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3>{t('version.title')}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${compareMode ? '' : 'btn-secondary'}`}
              onClick={toggleCompareMode}
              style={{ fontSize: '13px' }}
            >
              {compareMode ? t('common.cancel') : t('version.compare')}
            </button>
            <button className="btn btn-secondary" onClick={onClose}>{t('common.close')}</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            {t('common.loading')}
          </div>
        ) : versions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            {t('version.noHistory')}
          </div>
        ) : (
          <>
            {compareMode && (
              <div style={{
                padding: '12px 16px', marginBottom: '12px',
                background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary)',
                borderRadius: '8px', fontSize: '14px', color: 'var(--text-secondary)'
              }}>
                {t('version.selectVersions')}
                {compareV1 && (
                  <span style={{ marginLeft: '8px', color: 'var(--primary)' }}>
                    V{compareV1.version}
                  </span>
                )}
                {compareV2 && (
                  <span style={{ marginLeft: '4px', color: 'var(--primary)' }}>
                    ↔ V{compareV2.version}
                  </span>
                )}
                {compareV1 && compareV2 && (
                  <button
                    className="btn btn-small"
                    onClick={handleCompare}
                    style={{ marginLeft: '12px', fontSize: '12px', padding: '4px 12px' }}
                    disabled={diffLoading}
                  >
                    {diffLoading ? t('common.loading') : t('version.compare')}
                  </button>
                )}
              </div>
            )}

            {diff && (
              <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('version.field')}</th>
                      <th>{t('version.oldValue')}</th>
                      <th>{t('version.newValue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.length === 0 ? (
                      <tr><td colSpan="3" style={{ textAlign: 'center' }}>{t('version.noHistory')}</td></tr>
                    ) : (
                      diff.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '500' }}>{item.field}</td>
                          <td style={{ color: 'var(--destructive-text)', maxWidth: '250px', wordBreak: 'break-all', fontSize: '13px' }}>
                            {formatValue(item.oldValue)}
                          </td>
                          <td style={{ color: 'var(--success-text)', maxWidth: '250px', wordBreak: 'break-all', fontSize: '13px' }}>
                            {formatValue(item.newValue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('version.version')}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('version.changedBy')}</th>
                    <th>{t('version.changeSummary')}</th>
                    <th>{t('adminEpisodes.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <React.Fragment key={v._id}>
                      <tr
                        style={{
                          cursor: 'pointer',
                          background: (compareV1?.version === v.version || compareV2?.version === v.version)
                            ? 'var(--primary-bg-subtle)'
                            : selectedVersion?.version === v.version
                              ? 'var(--hover-bg)'
                              : undefined
                        }}
                        onClick={() => handleVersionClick(v)}
                      >
                        <td style={{ fontWeight: '500' }}>V{v.version}</td>
                        <td style={{ fontSize: '13px' }}>
                          {new Date(v.createdAt).toLocaleString(locale)}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {v.changedBy ? (v.changedBy.username || v.changedBy.accountId) : '-'}
                        </td>
                        <td style={{ fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.changeSummary || '-'}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-small"
                            onClick={(e) => { e.stopPropagation(); handleRollback(v); }}
                            style={{ fontSize: '12px' }}
                          >
                            {t('version.rollback')}
                          </button>
                        </td>
                      </tr>
                      {selectedVersion?.version === v.version && !compareMode && (
                        <tr>
                          <td colSpan="5" style={{ background: 'var(--hover-bg)', padding: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                              {Object.entries(v.data).map(([key, val]) => (
                                <div key={key} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
                                  <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{key}:</span>{' '}
                                  <span style={{ wordBreak: 'break-all' }}>{formatValue(val)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default EpisodeVersionHistory;
