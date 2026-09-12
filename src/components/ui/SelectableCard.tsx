import React from 'react';
import styles from './SelectableCard.module.css';

interface SelectableCardProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export const SelectableCard: React.FC<SelectableCardProps> = ({
  title,
  subtitle,
  selected,
  onClick,
  icon
}) => {
  return (
    <div 
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <div className={styles.content}>
        {icon && <div className={styles.icon}>{icon}</div>}
        <div className={styles.textContainer}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      </div>
      <div className={styles.indicator}>
        <div className={styles.indicatorInner} />
      </div>
    </div>
  );
};
