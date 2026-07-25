import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * 通用 Modal 组件
 * 统一弹窗的进/退场动画、ESC 关闭、遮罩点击关闭、滚动锁定。
 *
 * 进场：遮罩淡入 + 模糊渐强；内容上浮 + 微缩放 + 弹性回弹
 * 退场：遮罩淡出；内容下沉 + 微缩放消失（延迟卸载，保证动画播完）
 *
 * 用法：
 *   <Modal isOpen={show} onClose={close} maxWidth="520px">
 *     <div className="modal-header"><h3>标题</h3></div>
 *     ...内容...
 *   </Modal>
 */
const EXIT_DURATION = 280; // 与 CSS 退出动画 0.26s 匹配，留 20ms 余量

const Modal = ({
  isOpen,
  onClose,
  children,
  className = '',
  contentClassName = '',
  contentStyle,
  overlayStyle,
  maxWidth,
  closeOnOverlay = true,
  closeOnEsc = true,
  lockScroll = true,
  zIndex = 1000,
}) => {
  const [mounted, setMounted] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);

  // 同步 isOpen → mounted/closing，实现退出动画后再卸载
  useEffect(() => {
    if (isOpen) {
      // 打开：确保挂载、重置 closing、取消任何进行中的退出计时
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      // 关闭：先触发退出动画，EXIT_DURATION 后真正卸载
      setClosing(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setMounted(false);
        setClosing(false);
      }, EXIT_DURATION);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    if (!mounted || !closeOnEsc) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, closeOnEsc, onClose]);

  // 锁定背景滚动
  useEffect(() => {
    if (!mounted || !lockScroll) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mounted, lockScroll]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (!closeOnOverlay) return;
      // 仅点击遮罩本身（非冒泡自内容）时关闭
      if (e.target === e.currentTarget) onClose?.();
    },
    [closeOnOverlay, onClose]
  );

  if (!mounted) return null;

  const mergedContentStyle = {
    ...(maxWidth ? { maxWidth } : null),
    ...contentStyle,
  };

  return createPortal(
    <div
      className={`modal-overlay ${closing ? 'is-closing' : ''} ${className}`.trim()}
      style={{ zIndex, ...overlayStyle }}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className={`modal-content ${closing ? 'is-closing' : ''} ${contentClassName}`.trim()}
        style={mergedContentStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
