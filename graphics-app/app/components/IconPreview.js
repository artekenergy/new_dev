import Image from 'next/image';
import { useState } from 'react';
import styles from './IconPreview.module.css';

export default function IconPreview({ iconName }) {
  const [error, setError] = useState(false);
  
  // Handle loading error
  const handleError = () => {
    setError(true);
  };
  
  // Reset error state when icon changes
  if (error && iconName) {
    setError(false);
  }
  
  if (!iconName || error) {
    return (
      <div className={styles.iconPlaceholder}>
        <span>No icon selected</span>
      </div>
    );
  }
  
  return (
    <div className={styles.iconPreview}>
      <Image
        src={`/icons/${iconName}`}
        alt={`Icon: ${iconName}`}
        width={32}
        height={32}
        onError={handleError}
      />
      <span>{iconName}</span>
    </div>
  );
}