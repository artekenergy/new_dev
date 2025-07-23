import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './IconDropdown.module.css';

export default function IconDropdown({ 
  value, 
  onChange, 
  icons, 
  disabled,
  placeholder = "Default Icon" 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Find selected icon info - make sure it works with both full path and base name
  const selectedIcon = value ? icons.find(icon => 
    icon.name === value || 
    icon.name.startsWith(`${value}-`) || 
    icon.name === `${value}.png`
  ) : null;
  
  // Handle icon selection
  const handleSelect = (icon) => {
    // For serv-plus, we use the full name rather than iconBase
    onChange(icon.name.includes(".") ? icon.name : icon.name);
    setIsOpen(false);
  };
  
  // Handle key navigation
  const handleKeyDown = (e) => {
    if (disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };
  
  // Format icon name for display
  const getDisplayName = (iconName) => {
    if (!iconName) return "";
    // Remove file extension if present
    const nameWithoutExt = iconName.replace(/\.(png|svg)$/, '');
    // Remove -black or -white suffix if present
    const baseName = nameWithoutExt.replace(/-black$|-white$/, '');
    // Replace dashes with spaces and capitalize
    return baseName.replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <div 
        className={`${styles.dropdownHeader} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={selectedIcon ? (selectedIcon.displayName || getDisplayName(selectedIcon.name)) : placeholder}
      >
        <div className={styles.selectedOption}>
          {selectedIcon ? (
            <div className={styles.iconPreview}>
              <Image
                src={`/icons/${selectedIcon.name}`}
                alt={selectedIcon.displayName || getDisplayName(selectedIcon.name)}
                width={30}
                height={30}
                onError={(e) => {
                  // Try alternate icon formats if the primary one fails
                  if (!e.target.src.includes('-black')) {
                    e.target.src = `/icons/${value}-black.png`;
                  } else if (!e.target.src.includes('.svg')) {
                    e.target.src = `/icons/${value.replace(/-black\.png$/, '')}.svg`;
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />

            </div>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </div>
        <span className={styles.arrow}>▼</span>
      </div>
      
      {isOpen && !disabled && (
        <div className={styles.dropdownList} role="listbox">
          <div 
            className={`${styles.dropdownItem} ${!value ? styles.selected : ''}`}
            onClick={() => handleSelect({ name: '', displayName: placeholder })}
          >
            <span className={styles.placeholder}>{placeholder}</span>
          </div>
          
          <div className={styles.iconsGrid}>
            {icons.map((icon, index) => (
              <div 
                key={index} 
                className={`${styles.iconItem} ${
                  (icon.name === value || 
                   icon.name === `${value}-black.png` || 
                   icon.name === `${value}-white.png`) 
                  ? styles.selected : ''
                }`}
                onClick={() => handleSelect(icon)}
                role="option"
                aria-selected={icon.name === value}
                title={icon.displayName || getDisplayName(icon.name)}
              >
                <div className={styles.iconWrapper}>
                  <Image
                    src={`/icons/${icon.name}`}
                    alt={icon.displayName || getDisplayName(icon.name)}
                    width={32}
                    height={32}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {(icon.name === value || 
                    icon.name === `${value}-black.png` || 
                    icon.name === `${value}-white.png`) && 
                    <div className={styles.selectedIndicator} />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}