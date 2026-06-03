import React from 'react';

const CaptchaField = ({ captchaData, captchaAnswer, setCaptchaAnswer, onRefresh, t }) => {
  return (
    <div className="form-group">
      <label>{t('auth.captcha')}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="text"
          value={captchaAnswer}
          onChange={(e) => setCaptchaAnswer(e.target.value)}
          required
          placeholder={t('auth.enterCaptcha')}
          style={{ flex: 1, minWidth: 0 }}
        />
        {captchaData.svg && (
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaData.svg)}`}
            alt={t('auth.captcha')}
            onClick={onRefresh}
            style={{ height: '40px', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }}
            title={t('common.clickToRefresh')}
          />
        )}
      </div>
    </div>
  );
};

export default CaptchaField;
