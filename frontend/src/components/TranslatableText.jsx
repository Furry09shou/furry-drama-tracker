import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../contexts/I18nContext';
import translationCache, { setCache } from '../utils/translationCache';
import { requestTranslation } from '../hooks/useTranslation';
import axios from 'axios';

const MAX_CHUNK_LENGTH = 450;

const escapeHtml = (str) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;');

const splitIntoChunks = (text) => {
  const paragraphs = text.split(/\n+/);
  const chunks = [];
  for (const para of paragraphs) {
    if (para.trim().length === 0) continue;
    if (para.length <= MAX_CHUNK_LENGTH) {
      chunks.push(para);
    } else {
      let remaining = para;
      while (remaining.length > 0) {
        if (remaining.length <= MAX_CHUNK_LENGTH) {
          chunks.push(remaining);
          break;
        }
        let splitPos = remaining.lastIndexOf('。', MAX_CHUNK_LENGTH);
        if (splitPos === -1 || splitPos < MAX_CHUNK_LENGTH * 0.3) {
          splitPos = remaining.lastIndexOf('，', MAX_CHUNK_LENGTH);
        }
        if (splitPos === -1 || splitPos < MAX_CHUNK_LENGTH * 0.3) {
          splitPos = remaining.lastIndexOf('.', MAX_CHUNK_LENGTH);
        }
        if (splitPos === -1 || splitPos < MAX_CHUNK_LENGTH * 0.3) {
          splitPos = remaining.lastIndexOf(' ', MAX_CHUNK_LENGTH);
        }
        if (splitPos === -1 || splitPos < MAX_CHUNK_LENGTH * 0.3) {
          splitPos = MAX_CHUNK_LENGTH;
        } else {
          splitPos += 1;
        }
        chunks.push(remaining.substring(0, splitPos));
        remaining = remaining.substring(splitPos);
      }
    }
  }
  return chunks;
};

const TranslatableText = ({ text, as: Tag = 'span', style, className }) => {
  const { lang } = useI18n();
  const [translated, setTranslated] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!text || lang === 'zh') {
      setTranslated(null);
      return;
    }
    const cacheKey = `${lang}:${text}`;
    if (translationCache[cacheKey]) {
      setTranslated(translationCache[cacheKey]);
      return;
    }
    setTranslated(null);
    let cancelled = false;
    requestTranslation(text, lang).then(result => {
      if (!cancelled && result && mountedRef.current) {
        setTranslated(result);
      }
    });
    return () => { cancelled = true; };
  }, [text, lang]);

  if (!text) return null;
  if (lang === 'zh') return <Tag style={style} className={className}>{text}</Tag>;
  return <Tag style={style} className={className}>{translated || text}</Tag>;
};

const TranslatableBlock = ({ text, style, className }) => {
  const { lang } = useI18n();
  const [translatedChunks, setTranslatedChunks] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!text || lang === 'zh') {
      setTranslatedChunks(null);
      setIsTranslating(false);
      setProgress(0);
      return;
    }
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length === 0) {
      setTranslatedChunks(null);
      setIsTranslating(false);
      setProgress(0);
      return;
    }

    const allChunks = [];
    const chunkParaMap = [];
    paragraphs.forEach((para, paraIdx) => {
      if (para.length <= MAX_CHUNK_LENGTH) {
        allChunks.push(para);
        chunkParaMap.push(paraIdx);
      } else {
        let remaining = para;
        while (remaining.length > 0) {
          if (remaining.length <= MAX_CHUNK_LENGTH) {
            allChunks.push(remaining);
            chunkParaMap.push(paraIdx);
            break;
          }
          let splitPos = remaining.lastIndexOf('。', MAX_CHUNK_LENGTH);
          if (splitPos === -1 || splitPos < MAX_CHUNK_LENGTH * 0.3) {
            splitPos = remaining.lastIndexOf('，', MAX_CHUNK_LENGTH);
          }
          if (splitPos === -1 || splitPos < MAX_CHUNK_LENGTH * 0.3) {
            splitPos = remaining.lastIndexOf('.', MAX_CHUNK_LENGTH);
          }
          if (splitPos === -1 || splitPos < MAX_CHUNK_LENGTH * 0.3) {
            splitPos = remaining.lastIndexOf(' ', MAX_CHUNK_LENGTH);
          }
          if (splitPos === -1 || splitPos < MAX_CHUNK_LENGTH * 0.3) {
            splitPos = MAX_CHUNK_LENGTH;
          } else {
            splitPos += 1;
          }
          allChunks.push(remaining.substring(0, splitPos));
          chunkParaMap.push(paraIdx);
          remaining = remaining.substring(splitPos);
        }
      }
    });

    const allCached = allChunks.every(chunk => translationCache[`${lang}:${chunk}`]);
    if (allCached) {
      const results = allChunks.map(chunk => translationCache[`${lang}:${chunk}`]);
      const paraResults = paragraphs.map((_, paraIdx) => {
        return results.filter((_, i) => chunkParaMap[i] === paraIdx).join('');
      });
      setTranslatedChunks(paraResults);
      setIsTranslating(false);
      setProgress(100);
      return;
    }

    const cachedResults = allChunks.map(chunk => translationCache[`${lang}:${chunk}`] || null);
    const uncachedIndices = [];
    const uncachedTexts = [];
    allChunks.forEach((chunk, i) => {
      if (!translationCache[`${lang}:${chunk}`]) {
        uncachedIndices.push(i);
        uncachedTexts.push(chunk);
      }
    });

    if (uncachedTexts.length === 0) {
      const paraResults = paragraphs.map((_, paraIdx) => {
        return cachedResults.filter((_, i) => chunkParaMap[i] === paraIdx).join('');
      });
      setTranslatedChunks(paraResults);
      setIsTranslating(false);
      setProgress(100);
      return;
    }

    const partialResults = [...cachedResults];
    const buildParaResults = () => {
      return paragraphs.map((_, paraIdx) => {
        return partialResults.filter((_, i) => chunkParaMap[i] === paraIdx).map(r => r || '').join('');
      });
    };

    const hasSomeCached = cachedResults.some(r => r !== null);
    if (hasSomeCached) {
      setTranslatedChunks(buildParaResults());
    } else {
      setTranslatedChunks(null);
    }
    setIsTranslating(true);
    setProgress(Math.round((allChunks.length - uncachedTexts.length) / allChunks.length * 100));
    let cancelled = false;

    const BATCH_SIZE = 10;
    const translateInBatches = async () => {
      for (let batchStart = 0; batchStart < uncachedTexts.length; batchStart += BATCH_SIZE) {
        if (cancelled || !mountedRef.current) return;
        const batchTexts = uncachedTexts.slice(batchStart, batchStart + BATCH_SIZE);
        const batchIndices = uncachedIndices.slice(batchStart, batchStart + BATCH_SIZE);
        try {
          const res = await Promise.race([
            axios.post('/api/translate/batch', { texts: batchTexts, targetLang: lang }, { timeout: 120000, skipRedirect: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Batch timeout')), 130000))
          ]);
          if (res.data?.translations) {
            res.data.translations.forEach((translated, i) => {
              const originalIndex = batchIndices[i];
              partialResults[originalIndex] = translated || batchTexts[i];
              const cacheKey = `${lang}:${batchTexts[i]}`;
              if (translated) setCache(cacheKey, translated);
            });
          }
        } catch (e) {
          for (let i = 0; i < batchTexts.length; i++) {
            const originalIndex = batchIndices[i];
            if (partialResults[originalIndex] === null) {
              partialResults[originalIndex] = batchTexts[i];
            }
          }
        }
        if (!cancelled && mountedRef.current) {
          setTranslatedChunks(buildParaResults());
          const completed = allChunks.length - partialResults.filter(r => r === null).length;
          setProgress(Math.round(completed / allChunks.length * 100));
        }
      }
      if (!cancelled && mountedRef.current) {
        setIsTranslating(false);
        setProgress(100);
      }
    };

    translateInBatches();
    return () => { cancelled = true; };
  }, [text, lang]);

  if (!text) return null;

  if (lang === 'zh') {
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    return (
      <div style={style} className={className}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: i > 0 ? '12px 0 0' : '0' }} dangerouslySetInnerHTML={{ __html: escapeHtml(p) }} />
        ))}
      </div>
    );
  }

  if (translatedChunks) {
    return (
      <div style={style} className={className}>
        {translatedChunks.map((chunk, i) => (
          <p key={i} style={{ margin: i > 0 ? '12px 0 0' : '0' }} dangerouslySetInnerHTML={{ __html: escapeHtml(chunk) }} />
        ))}
      </div>
    );
  }

  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  return (
    <div style={style} className={className}>
      {isTranslating && (
        <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontStyle: 'italic', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', width: '14px', height: '14px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
          Translating... {progress > 0 ? `${progress}%` : ''}
        </div>
      )}
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: i > 0 ? '12px 0 0' : '0', opacity: isTranslating ? 0.5 : 1 }} dangerouslySetInnerHTML={{ __html: escapeHtml(p) }} />
      ))}
    </div>
  );
};

export { TranslatableText, TranslatableBlock };
export default TranslatableText;
