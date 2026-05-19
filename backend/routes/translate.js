const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const https = require('https');

const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
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
const MAX_CACHE_SIZE = 5000;
const CONCURRENT_LIMIT = 3;

const isValidTranslation = (text) => {
  if (!text || typeof text !== 'string') return false;
  const upper = text.toUpperCase();
  return !upper.includes('MYMEMORY WARNING') && !upper.includes('USAGE LIMITS') && !upper.includes('VISIT HTTPS');
};

for (const [key, value] of machineTranslationCache) {
  if (!isValidTranslation(value.translation)) {
    machineTranslationCache.delete(key);
  }
}

const fetchTranslation = (text, sourceLang, targetLang) => {
  return new Promise((resolve) => {
    const langPair = `${LANG_MAP[sourceLang] || sourceLang}|${LANG_MAP[targetLang] || targetLang}`;
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}&de=furrydrama2026@gmail.com`;

    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed?.responseStatus === 429 || (parsed?.responseDetails && typeof parsed.responseDetails === 'string' && parsed.responseDetails.includes('MYMEMORY WARNING'))) {
            resolve(null);
            return;
          }
          if (parsed?.responseData?.translatedText) {
            const translated = parsed.responseData.translatedText;
            if (translated.toUpperCase() === text.toUpperCase()) {
              resolve(null);
            } else if (translated.startsWith('MYMEMORY') || translated.includes('USAGE LIMITS')) {
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

const LIBRE_MIRRORS = [
  { hostname: 'libretranslate.com', path: '/translate' },
  { hostname: 'translate.argosopentech.com', path: '/translate' },
  { hostname: 'translate.terraprint.co', path: '/translate' },
];

const fetchLibreTranslation = async (text, sourceLang, targetLang) => {
  const sl = sourceLang === 'zh' ? 'zh' : sourceLang;
  const tl = targetLang === 'zh' ? 'zh' : targetLang;
  const postData = JSON.stringify({ q: text, source: sl, target: tl, format: 'text' });

  for (const mirror of LIBRE_MIRRORS) {
    const result = await new Promise((resolve) => {
      const options = {
        hostname: mirror.hostname,
        port: 443,
        path: mirror.path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        timeout: 8000,
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed?.translatedText && !parsed.error) {
              resolve(parsed.translatedText);
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
      req.write(postData);
      req.end();
    });
    if (result) return result;
  }
  return null;
};

const fetchGoogleTranslation = (text, sourceLang, targetLang) => {
  return new Promise((resolve) => {
    const sl = sourceLang === 'zh' ? 'zh-CN' : sourceLang;
    const tl = targetLang === 'zh' ? 'zh-CN' : targetLang;
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodedText}`;
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed[0]) {
            const translated = parsed[0].map(item => item[0]).filter(Boolean).join('');
            if (translated && translated !== text) {
              resolve(translated);
            } else {
              resolve(null);
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

const MAX_SEGMENT_LENGTH = 450;

const splitLongText = (text) => {
  if (text.length <= MAX_SEGMENT_LENGTH) return [text];
  const segments = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_SEGMENT_LENGTH) {
      segments.push(remaining);
      break;
    }
    let splitPos = remaining.lastIndexOf('。', MAX_SEGMENT_LENGTH);
    if (splitPos === -1 || splitPos < MAX_SEGMENT_LENGTH * 0.3) {
      splitPos = remaining.lastIndexOf('，', MAX_SEGMENT_LENGTH);
    }
    if (splitPos === -1 || splitPos < MAX_SEGMENT_LENGTH * 0.3) {
      splitPos = remaining.lastIndexOf('.', MAX_SEGMENT_LENGTH);
    }
    if (splitPos === -1 || splitPos < MAX_SEGMENT_LENGTH * 0.3) {
      splitPos = remaining.lastIndexOf(' ', MAX_SEGMENT_LENGTH);
    }
    if (splitPos === -1 || splitPos < MAX_SEGMENT_LENGTH * 0.3) {
      splitPos = MAX_SEGMENT_LENGTH;
    } else {
      splitPos += 1;
    }
    segments.push(remaining.substring(0, splitPos));
    remaining = remaining.substring(splitPos);
  }
  return segments;
};

const getMachineTranslation = async (text, sourceLang, targetLang) => {
  if (sourceLang === targetLang) return text;
  if (!text) return null;

  const segments = splitLongText(text);
  if (segments.length === 1) {
    return getMachineTranslationSingle(segments[0], sourceLang, targetLang);
  }

  const translatedSegments = [];
  for (const segment of segments) {
    const result = await getMachineTranslationSingle(segment, sourceLang, targetLang);
    translatedSegments.push(result || segment);
  }
  return translatedSegments.join('');
};

const getMachineTranslationSingle = async (text, sourceLang, targetLang) => {
  if (!text || text.length > 500) return null;

  const cacheKey = `${sourceLang}:${targetLang}:${text}`;
  const cached = machineTranslationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.translation;
  }

  const tryCacheResult = (result) => {
    if (result && isValidTranslation(result)) {
      if (machineTranslationCache.size > MAX_CACHE_SIZE) {
        const oldestKey = machineTranslationCache.keys().next().value;
        machineTranslationCache.delete(oldestKey);
      }
      machineTranslationCache.set(cacheKey, { translation: result, timestamp: Date.now() });
      return result;
    }
    return null;
  };

  try {
    const result = await fetchTranslation(text, sourceLang, targetLang);
    if (result) return tryCacheResult(result);
  } catch {}

  try {
    const result = await fetchGoogleTranslation(text, sourceLang, targetLang);
    if (result) return tryCacheResult(result);
  } catch {}

  try {
    const result = await fetchLibreTranslation(text, sourceLang, targetLang);
    if (result) return tryCacheResult(result);
  } catch {}

  return null;
};

const translateWithConcurrencyLimit = async (texts, sourceLang, targetLang) => {
  const results = new Array(texts.length).fill(null);
  const queue = texts.map((text, index) => ({ text, index }));
  const workers = [];

  for (let i = 0; i < Math.min(CONCURRENT_LIMIT, queue.length); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const result = await getMachineTranslation(item.text, sourceLang, targetLang);
        results[item.index] = result;
      }
    })());
  }

  await Promise.all(workers);
  return results;
};

router.post('/', translateLimiter, async (req, res) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ message: 'Translation request timeout' });
    }
  }, 10000);

  try {
    const { key, targetLang } = req.body;
    if (!key || !targetLang) {
      clearTimeout(timeoutId);
      return res.status(400).json({ message: 'Missing key or targetLang' });
    }
    if (!LANG_MAP[targetLang]) {
      clearTimeout(timeoutId);
      return res.status(400).json({ message: 'Unsupported language' });
    }
    if (targetLang === 'zh') {
      clearTimeout(timeoutId);
      return res.json({ translation: key });
    }
    if (translations[key] && translations[key][targetLang]) {
      clearTimeout(timeoutId);
      return res.json({ translation: translations[key][targetLang] });
    }
    const machineResult = await getMachineTranslation(key, 'zh', targetLang);
    clearTimeout(timeoutId);
    if (machineResult) {
      return res.json({ translation: machineResult });
    }
    return res.json({ translation: null });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Translation error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Translation failed' });
    }
  }
});

router.post('/batch', translateLimiter, async (req, res) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ message: 'Translation request timeout' });
    }
  }, 15000);

  try {
    const { texts, targetLang } = req.body;
    if (!texts || !Array.isArray(texts) || !targetLang) {
      clearTimeout(timeoutId);
      return res.status(400).json({ message: 'Missing texts or targetLang' });
    }
    if (!LANG_MAP[targetLang]) {
      clearTimeout(timeoutId);
      return res.status(400).json({ message: 'Unsupported language' });
    }
    if (targetLang === 'zh') {
      clearTimeout(timeoutId);
      return res.json({ translations: texts });
    }
    const limitedTexts = texts.slice(0, 30);
    const machineResults = await translateWithConcurrencyLimit(limitedTexts, 'zh', targetLang);
    const finalResults = machineResults.map((result, i) => result || limitedTexts[i]);
    clearTimeout(timeoutId);
    res.json({ translations: finalResults });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Batch translation error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Batch translation failed' });
    }
  }
});

module.exports = router;
