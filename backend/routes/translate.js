const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const https = require('https');

const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: 'Too many translation requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

const LANG_MAP = { zh: 'zh-CN', en: 'en', ja: 'ja' };

const translations = {
  'twoFactor.title': { en: '🔐 Two-Factor Authentication (2FA)', ja: '🔐 二段階認証 (2FA)' },
  'twoFactor.enableDesc': { en: 'Enable 2FA to require a verification code in addition to your password when logging in, greatly improving account security.', ja: '二段階認証を有効にすると、ログイン時にパスワードに加えて認証コードが必要になり、アカウントの安全性が大幅に向上します。' },
  'twoFactor.enable': { en: 'Enable 2FA', ja: '2FAを有効にする' },
  'twoFactor.setupStep1': { en: '1. Scan the QR code below with an authenticator app (e.g., Google Authenticator, Microsoft Authenticator) or enter the key manually:', ja: '1. 認証アプリで下のQRコードをスキャンするか、キーを手動で入力してください：' },
  'twoFactor.manualKey': { en: 'Manual entry key:', ja: '手動入力キー：' },
  'twoFactor.setupStep2': { en: '2. Save these backup codes carefully (each can only be used once). Use them to login when you cannot access your authenticator:', ja: '2. 以下のバックアップコードを保存してください：' },
  'twoFactor.showBackupCodes': { en: 'Show backup codes', ja: 'バックアップコードを表示' },
  'twoFactor.setupStep3': { en: '3. Enter the 6-digit code from your authenticator app to confirm:', ja: '3. 認証アプリの6桁のコードを入力して有効化を確認してください：' },
  'twoFactor.confirmEnable': { en: 'Confirm Enable', ja: '有効化を確認' },
  'twoFactor.enabled': { en: '✅ Two-Factor Authentication Enabled', ja: '✅ 二段階認証が有効です' },
  'twoFactor.disableDesc': { en: 'Enter the 6-digit code from your authenticator app to disable 2FA:', ja: '認証アプリの6桁のコードを入力して二段階認証を無効にしてください：' },
  'twoFactor.disable': { en: 'Disable 2FA', ja: '2FAを無効にする' },
  'twoFactor.verifying': { en: 'Verifying...', ja: '確認中...' },
  'twoFactor.invalidCode': { en: 'Invalid verification code', ja: '認証コードが正しくありません' },
  'twoFactor.code': { en: 'Code', ja: 'コード' },
  'twoFactor.loginDesc': { en: 'Enter the 6-digit code from your authenticator app to complete login.', ja: '認証アプリの6桁のコードを入力してログインを完了してください。' },
  'twoFactor.verify': { en: 'Verify', ja: '確認' },
  'twoFactor.enterCode': { en: 'Enter 6-digit code', ja: '6桁のコードを入力' },
  'report.title': { en: 'Report "{targetName}"', ja: '「{targetName}」を報告' },
  'report.reasonLabel': { en: 'Reason *', ja: '報告理由 *' },
  'report.selectReasonPlaceholder': { en: 'Select a reason', ja: '理由を選択' },
  'report.descriptionLabel': { en: 'Additional details', ja: '補足説明' },
  'report.descriptionPlaceholder': { en: 'Please describe the situation...', ja: '詳しい状況を入力してください...' },
  'report.submit': { en: 'Submit Report', ja: '報告を送信' },
  'report.submitted': { en: 'Report submitted', ja: '報告を送信しました' },
  'report.willProcess': { en: 'We will process it as soon as possible', ja: 'できるだけ早く対応いたします' },
  'report.selectReason': { en: 'Please select a reason', ja: '報告理由を選択してください' },
  'report.submitFailed': { en: 'Report failed', ja: '報告に失敗しました' },
  'report.inappropriate': { en: 'Inappropriate content', ja: '不適切なコンテンツ' },
  'report.copyright': { en: 'Copyright infringement', ja: '著作権侵害' },
  'report.spam': { en: 'Spam', ja: 'スパム' },
  'report.misleading': { en: 'Misleading information', ja: '誤解を招く情報' },
  'report.other': { en: 'Other', ja: 'その他' },
};

const machineTranslationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const fetchTranslation = (text, sourceLang, targetLang) => {
  return new Promise((resolve) => {
    const langPair = `${LANG_MAP[sourceLang] || sourceLang}|${LANG_MAP[targetLang] || targetLang}`;
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}`;

    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed?.responseData?.translatedText) {
            const translated = parsed.responseData.translatedText;
            if (translated.toUpperCase() === text.toUpperCase()) {
              resolve(null);
            } else {
              resolve(translated);
            }
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
};

const getMachineTranslation = async (text, sourceLang, targetLang) => {
  if (sourceLang === targetLang) return text;
  const cacheKey = `${sourceLang}:${targetLang}:${text}`;
  const cached = machineTranslationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.translation;
  }
  const result = await fetchTranslation(text, sourceLang, targetLang);
  if (result) {
    machineTranslationCache.set(cacheKey, { translation: result, timestamp: Date.now() });
  }
  return result;
};

router.post('/', translateLimiter, async (req, res) => {
  try {
    const { key, targetLang } = req.body;
    if (!key || !targetLang) {
      return res.status(400).json({ message: 'Missing key or targetLang' });
    }
    if (!LANG_MAP[targetLang]) {
      return res.status(400).json({ message: 'Unsupported language' });
    }
    if (targetLang === 'zh') {
      return res.json({ translation: key });
    }
    if (translations[key] && translations[key][targetLang]) {
      return res.json({ translation: translations[key][targetLang] });
    }
    const machineResult = await getMachineTranslation(key, 'zh', targetLang);
    if (machineResult) {
      return res.json({ translation: machineResult });
    }
    return res.json({ translation: null });
  } catch (error) {
    res.status(500).json({ message: 'Translation failed' });
  }
});

router.post('/batch', translateLimiter, async (req, res) => {
  try {
    const { texts, targetLang } = req.body;
    if (!texts || !Array.isArray(texts) || !targetLang) {
      return res.status(400).json({ message: 'Missing texts or targetLang' });
    }
    if (!LANG_MAP[targetLang]) {
      return res.status(400).json({ message: 'Unsupported language' });
    }
    if (targetLang === 'zh') {
      return res.json({ translations: texts });
    }
    const results = await Promise.all(
      texts.map(async (text) => {
        const machineResult = await getMachineTranslation(text, 'zh', targetLang);
        return machineResult || text;
      })
    );
    res.json({ translations: results });
  } catch (error) {
    res.status(500).json({ message: 'Batch translation failed' });
  }
});

module.exports = router;
