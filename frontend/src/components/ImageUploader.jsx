﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const ImageUploader = ({ value, onChange, label, aspectRatio, outputWidth, outputHeight, uploadEndpoint }) => {
  const [mode, setMode] = useState('url');
  const [urlInput, setUrlInput] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);
  const [cropRect, setCropRect] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragStartRect, setDragStartRect] = useState(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropError, setCropError] = useState('');

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setUrlInput(value || '');
  }, [value]);

  const getPointerPos = (e) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    };
  };

  const isInsideRect = (x, y, rect) => {
    if (!rect) return false;
    const minX = Math.min(rect.x1, rect.x2);
    const maxX = Math.max(rect.x1, rect.x2);
    const minY = Math.min(rect.y1, rect.y2);
    const maxY = Math.max(rect.y1, rect.y2);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };

  const constrainAspectRatio = (startX, startY, endX, endY) => {
    if (!aspectRatio) return { x1: startX, y1: startY, x2: endX, y2: endY };
    let dx = endX - startX;
    let dy = endY - startY;
    if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005) {
      return { x1: startX, y1: startY, x2: endX, y2: endY };
    }
    if (dx === 0 && dy === 0) return { x1: startX, y1: startY, x2: endX, y2: endY };
    if (Math.abs(dy) < 0.005) {
      dy = Math.abs(dx) / aspectRatio * (dy >= 0 ? 1 : -1);
      if (Math.abs(dy) < 0.005) dy = Math.abs(dx) / aspectRatio;
    } else if (Math.abs(dx) < 0.005) {
      dx = Math.abs(dy) * aspectRatio * (dx >= 0 ? 1 : -1);
      if (Math.abs(dx) < 0.005) dx = Math.abs(dy) * aspectRatio;
    } else if (Math.abs(dx) / Math.abs(dy) > aspectRatio) {
      dy = (Math.abs(dx) / aspectRatio) * (dy >= 0 ? 1 : -1);
    } else {
      dx = Math.abs(dy) * aspectRatio * (dx >= 0 ? 1 : -1);
    }
    let x2 = startX + dx;
    let y2 = startY + dy;
    if (x2 < 0) { x2 = 0; y2 = startY + (x2 - startX) / aspectRatio * (dy >= 0 ? 1 : -1); }
    if (x2 > 1) { x2 = 1; y2 = startY + (x2 - startX) / aspectRatio * (dy >= 0 ? 1 : -1); }
    if (y2 < 0) { y2 = 0; x2 = startX + (y2 - startY) * aspectRatio * (dx >= 0 ? 1 : -1); }
    if (y2 > 1) { y2 = 1; x2 = startX + (y2 - startY) * aspectRatio * (dx >= 0 ? 1 : -1); }
    return { x1: startX, y1: startY, x2, y2 };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;
    if (cropRect && isInsideRect(pos.x, pos.y, cropRect)) {
      setDragType('move');
      setDragStart(pos);
      setDragStartRect({ ...cropRect });
    } else {
      setDragType('create');
      setDragStart(pos);
      const constrained = constrainAspectRatio(pos.x, pos.y, pos.x, pos.y);
      setCropRect(constrained);
    }
    setIsDragging(true);
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;
    if (dragType === 'create') {
      const constrained = constrainAspectRatio(dragStart.x, dragStart.y, pos.x, pos.y);
      setCropRect(constrained);
    } else if (dragType === 'move' && dragStartRect) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      const w = dragStartRect.x2 - dragStartRect.x1;
      const h = dragStartRect.y2 - dragStartRect.y1;
      let newX1 = dragStartRect.x1 + dx;
      let newY1 = dragStartRect.y1 + dy;
      let newX2 = dragStartRect.x2 + dx;
      let newY2 = dragStartRect.y2 + dy;
      if (newX1 < 0) { newX2 -= newX1; newX1 = 0; }
      if (newY1 < 0) { newY2 -= newY1; newY1 = 0; }
      if (newX2 > 1) { newX1 -= (newX2 - 1); newX2 = 1; }
      if (newY2 > 1) { newY1 -= (newY2 - 1); newY2 = 1; }
      setCropRect({ x1: newX1, y1: newY1, x2: newX2, y2: newY2 });
    }
  }, [isDragging, dragType, dragStart, dragStartRect, aspectRatio]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => handlePointerMove(e);
    const handleUp = () => handlePointerUp();
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const uploadCroppedImage = async (canvas) => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { reject(new Error('裁剪失败')); return; }
        try {
          const formData = new FormData();
          formData.append('image', blob, 'cropped.jpg');
          const token = localStorage.getItem('adminToken');
          const endpoint = uploadEndpoint || '/api/site-content/upload';
          const res = await axios.post(endpoint, formData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
          resolve(res.data.url);
        } catch (err) {
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            resolve(dataUrl);
          } catch (e2) {
            reject(new Error('裁剪结果保存失败'));
          }
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('adminToken');
      const endpoint = uploadEndpoint || '/api/site-content/upload';
      const res = await axios.post(endpoint, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = res.data.url;
      setUrlInput(uploadedUrl);
      if (aspectRatio) {
        setCropImageUrl(uploadedUrl);
        setCropRect(null);
        setCropError('');
        setShowCropper(true);
      } else {
        onChange(uploadedUrl);
      }
    } catch (err) {
      console.error('上传失败', err);
      alert('上传失败，请重试');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlConfirm = () => {
    if (!urlInput.trim()) { onChange(''); return; }
    if (aspectRatio) {
      setCropImageUrl(urlInput.trim());
      setCropRect(null);
      setCropError('');
      setShowCropper(true);
    } else {
      onChange(urlInput.trim());
    }
  };

  const handleCropConfirm = useCallback(() => {
    if (!cropImageUrl) { onChange(cropImageUrl); setShowCropper(false); return; }
    if (!cropRect || (Math.abs(cropRect.x2 - cropRect.x1) < 0.01 && Math.abs(cropRect.y2 - cropRect.y1) < 0.01)) {
      onChange(cropImageUrl); setUrlInput(cropImageUrl); setShowCropper(false); return;
    }
    setCropLoading(true);
    setCropError('');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const minX = Math.min(cropRect.x1, cropRect.x2);
        const minY = Math.min(cropRect.y1, cropRect.y2);
        const maxX = Math.max(cropRect.x1, cropRect.x2);
        const maxY = Math.max(cropRect.y1, cropRect.y2);
        const sx = minX * img.naturalWidth;
        const sy = minY * img.naturalHeight;
        const sw = (maxX - minX) * img.naturalWidth;
        const sh = (maxY - minY) * img.naturalHeight;
        if (sw < 10 || sh < 10) {
          onChange(cropImageUrl); setUrlInput(cropImageUrl); setShowCropper(false); setCropLoading(false); return;
        }
        const targetW = outputWidth || Math.round(sw);
        const targetH = outputHeight || Math.round(sh);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        const url = await uploadCroppedImage(canvas);
        onChange(url);
        setUrlInput(url);
        setShowCropper(false);
      } catch (err) {
        setCropError(err.message || '裁剪失败，可能是跨域限制。请尝试下载图片后本地上传');
      }
      setCropLoading(false);
    };
    img.onerror = () => { setCropError('图片加载失败，请检查URL是否正确'); setCropLoading(false); };
    img.src = cropImageUrl;
  }, [cropRect, cropImageUrl, outputWidth, outputHeight, onChange, uploadEndpoint]);

  const handleUseOriginal = () => { onChange(cropImageUrl); setUrlInput(cropImageUrl); setShowCropper(false); };
  const handleCancelCrop = () => { setShowCropper(false); setCropRect(null); setCropError(''); };
  const handleRemove = () => { onChange(''); setUrlInput(''); };
  const handleStartCrop = () => {
    if (value) { setCropImageUrl(value); setCropRect(null); setCropError(''); setShowCropper(true); }
  };

  if (showCropper) {
    const cropDisplay = cropRect ? {
      left: Math.min(cropRect.x1, cropRect.x2) * 100,
      top: Math.min(cropRect.y1, cropRect.y2) * 100,
      width: Math.abs(cropRect.x2 - cropRect.x1) * 100,
      height: Math.abs(cropRect.y2 - cropRect.y1) * 100,
    } : null;

    return (
      <div style={{ marginBottom: '16px' }}>
        {label && <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--foreground)' }}>{label} - 裁剪编辑</label>}
        <div style={{
          background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)',
          borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: 'var(--primary-light)'
        }}>
          <div style={{ marginBottom: '4px' }}>📌 在图片上拖动鼠标选择裁剪区域</div>
          {aspectRatio && <div>📐 固定比例 {outputWidth}:{outputHeight}，点击已选区域可拖动移动</div>}
          {!aspectRatio && <div>点击已选区域可拖动移动</div>}
        </div>
        <div
          ref={containerRef}
          style={{ position: 'relative', maxWidth: '600px', cursor: 'crosshair', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', userSelect: 'none', touchAction: 'none', background: 'var(--video-bg)' }}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
        >
          <img src={cropImageUrl} alt="裁剪" style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} draggable={false} />
          {cropDisplay && cropDisplay.width > 0.5 && cropDisplay.height > 0.5 && (
            <div style={{
              position: 'absolute', left: `${cropDisplay.left}%`, top: `${cropDisplay.top}%`,
              width: `${cropDisplay.width}%`, height: `${cropDisplay.height}%`,
              border: '2px solid #fff', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', pointerEvents: 'none',
            }}>
              <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.3)' }} />
              {[{ top: '-5px', left: '-5px' }, { top: '-5px', right: '-5px' }, { bottom: '-5px', left: '-5px' }, { bottom: '-5px', right: '-5px' }].map((pos, i) => (
                <div key={i} style={{ position: 'absolute', width: '10px', height: '10px', background: '#fff', borderRadius: '2px', ...pos }} />
              ))}
              {outputWidth && outputHeight && (
                <div style={{ position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', color: 'var(--btn-text)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                  {outputWidth}×{outputHeight}
                </div>
              )}
            </div>
          )}
        </div>
        {cropError && (
          <div style={{ padding: '8px 12px', marginTop: '8px', borderRadius: '6px', background: 'var(--destructive-bg)', color: 'var(--destructive-text)', border: '1px solid var(--destructive-border)', fontSize: '13px' }}>{cropError}</div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button className="btn" onClick={handleCropConfirm} disabled={cropLoading}>{cropLoading ? '处理中...' : '✓ 确认裁剪'}</button>
          <button className="btn btn-secondary" onClick={handleUseOriginal}>使用原图</button>
          <button className="btn btn-secondary" onClick={handleCancelCrop}>取消</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--foreground)' }}>{label}</label>}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button type="button" className={mode === 'url' ? 'btn' : 'btn btn-secondary'} onClick={() => setMode('url')} style={{ fontSize: '13px', padding: '6px 14px' }}>URL输入</button>
        <button type="button" className={mode === 'upload' ? 'btn' : 'btn btn-secondary'} onClick={() => setMode('upload')} style={{ fontSize: '13px', padding: '6px 14px' }}>本地上传</button>
      </div>
      {mode === 'url' ? (
        <div>
          <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="输入图片URL地址" style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '14px', marginBottom: '8px' }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrlConfirm(); } }} />
          <button type="button" className="btn" style={{ fontSize: '13px', padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={handleUrlConfirm}>
            {aspectRatio ? '裁剪' : '确认'}
          </button>
        </div>
      ) : (
        <div>
          <input type="file" ref={fileInputRef} accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleFileUpload} style={{ display: 'none' }} />
          <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? '上传中...' : '📁 选择图片文件'}
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>支持 JPEG、PNG、GIF、WebP，最大5MB</span>
        </div>
      )}
      {value && (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <img src={value} alt="预览" style={{ maxWidth: '200px', maxHeight: '120px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {aspectRatio && (
              <button type="button" onClick={handleStartCrop} style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', color: 'var(--primary-light)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px' }}>✂️ 裁剪</button>
            )}
            <button type="button" onClick={handleRemove} style={{ background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)', color: 'var(--destructive-text)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px' }}>🗑️ 移除</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
