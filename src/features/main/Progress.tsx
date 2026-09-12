import React from 'react';
import { Activity } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Progress: React.FC = () => {
  return (
    <div className={styles.screenContainer}>
      <div className={styles.systemOuterFrame} style={{ minHeight: '60vh', justifyContent: 'center' }}>
        <div className={styles.statusTitleBox} style={{fontSize: '1.2rem', padding: '4px 20px'}}>RECORDS</div>
        
        <div className={styles.emptyState} style={{ height: 'auto' }}>
          <Activity size={64} className={styles.emptyIcon} style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '16px', textShadow: 'var(--system-glow-subtle)' }}>
            [ RECORD OF VALOR ]
          </h2>
          <p className={styles.panelText}>
            No records found. Complete a quest to record your progress.
          </p>
        </div>
      </div>
    </div>
  );
};
