import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { translationCache, pendingMap, failureCooldown, queueTranslation } from '../hooks/useTranslation';

const isValidTranslation = (text) => {
  if (!text || typeof text !== 'string') return false;
  const upper = text.toUpperCase();
  return !upper.includes('MYMEMORY') && !upper.includes('USAGE LIMITS') && !upper.includes('VISIT HTTPS');
};

const MAX_CHUNK_LENGTH = 450;

const splitIntoChunks = (text) => {
  const lines = text.split('\n');
  const chunks = [];
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    if (line.length <= MAX_CHUNK_LENGTH) {
      chunks.push(line);
    } else {
      let remaining = line;
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
    const cooldown = failureCooldown.get(cacheKey);
    if (cooldown && Date.now() < cooldown) {
      setTranslated(null);
      return;
    }
    setTranslated(null);
    queueTranslation(text, lang).then(result => {
      if (result && isValidTranslation(result) && mountedRef.current) {
        setTranslated(result);
      }
    });
  }, [text, lang]);

  if (!text) return null;
  if (lang === 'zh') return <Tag style={style} className={className}>{text}</Tag>;
  return <Tag style={style} className={className}>{translated || text}</Tag>;
};

const TranslatableBlock = ({ text, style, className }) => {
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
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) {
      setTranslated(null);
      return;
    }

    const allCached = chunks.every(chunk => {
      const cacheKey = `${lang}:${chunk}`;
      return translationCache[cacheKey];
    });
    if (allCached) {
      setTranslated(chunks.map(chunk => translationCache[`${lang}:${chunk}`]).join(''));
      return;
    }

    const anyCooldown = chunks.some(chunk => {
      const cacheKey = `${lang}:${chunk}`;
      const cooldown = failureCooldown.get(cacheKey);
      return cooldown && Date.now() < cooldown;
    });
    if (anyCooldown) {
      const results = chunks.map(chunk => {
        const cacheKey = `${lang}:${chunk}`;
        return translationCache[cacheKey] || chunk;
      });
      setTranslated(results.join(''));
      return;
    }

    setTranslated(null);
    Promise.all(chunks.map(chunk => {
      const cacheKey = `${lang}:${chunk}`;
      if (translationCache[cacheKey]) return Promise.resolve(translationCache[cacheKey]);
      return queueTranslation(chunk, lang);
    }))
      .then(results => {
        if (mountedRef.current) {
          setTranslated(results.map((r, i) => (r && isValidTranslation(r)) ? r : chunks[i]).join(''));
        }
      });
  }, [text, lang]);

  if (!text) return null;
  const displayText = lang === 'zh' ? text : (translated || text);
  return (
    <div style={style} className={className} dangerouslySetInnerHTML={{
      __html: displayText.split('\n').map(p => p.trim()).filter(p => p).join('<br/>')
    }} />
  );
};

export { TranslatableText, TranslatableBlock };
export default TranslatableText;
