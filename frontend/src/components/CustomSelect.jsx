import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../contexts/I18nContext';

const CustomSelect = ({ options, value, onChange, placeholder, className = '' }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const selectRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const option = options.find(opt => opt.value === value);
    setSelectedOption(option);
  }, [value, options]);

  const updatePosition = useCallback(() => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        const dropdown = document.querySelector('.select-dropdown');
        if (!dropdown || !dropdown.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionClick = (option) => {
    onChange(option.value);
    setSelectedOption(option);
    setIsOpen(false);
  };

  return (
    <div className={`custom-select ${className}`} ref={selectRef}>
      <div 
        className="select-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="select-value">
          {selectedOption ? selectedOption.label : placeholder || t('common.selectPlaceholder')}
        </span>
        <span className={`select-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </div>
      {isOpen && createPortal(
        <div 
          className="select-dropdown"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 2000
          }}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              className={`select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
            >
              {option.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
