import React from 'react';

const CaptchaField = ({ captchaData, captchaAnswer, setCaptchaAnswer, onRefresh, captchaLoading, t }) => {
  return (
    <div className="form-group">
      <label>{t('auth.captcha')}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="text"
          value={captchaAnswer}
          onChange={(e) => setCaptchaAnswer(e.target.value)}
          required
          placeholder={captchaLoading ? t('common.loading') : t('auth.enterCaptcha')}
          disabled={captchaLoading}
          autoComplete="off"
          style={{ flex: 1, minWidth: 0 }}
        />
        {captchaLoading ? (
          <div style={{
            height: '40px', width: '120px', borderRadius: '4px', flexShrink: 0,
            background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('common.loading')}</span>
          </div>
        ) : captchaData.svg ? (
          <img
            src={`data:image/svg+xml,${encodeURIComponent(captchaData.svg)}`}
            alt={t('auth.captcha')}
            onClick={onRefresh}
            style={{ height: '40px', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }}
            title={t('common.clickToRefresh')}
          />
        ) : (
          <div style={{
            height: '40px', width: '120px', borderRadius: '4px', flexShrink: 0,
            background: 'var(--destructive-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }} onClick={onRefresh} title={t('common.clickToRefresh')}>
            <span style={{ fontSize: '12px', color: 'var(--destructive-text)' }}>{t('common.clickToRefresh')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptchaField;
