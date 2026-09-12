import React from 'react';
import { Dumbbell } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Workout: React.FC = () => {
  return (
    <div className={styles.screenContainer}>
      <div className={styles.systemOuterFrame} style={{ minHeight: '60vh', justifyContent: 'center' }}>
        <div className={styles.statusTitleBox} style={{fontSize: '1.2rem', padding: '4px 20px'}}>TRAINING</div>
        
        <div className={styles.emptyState} style={{ height: 'auto' }}>
          <Dumbbell size={64} className={styles.emptyIcon} style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '16px', textShadow: 'var(--system-glow-subtle)' }}>
            [ TRAINING SYSTEM ]
          </h2>
          <p className={styles.panelText}>
            The training system is currently locked. Advance further to unlock this feature.
          </p>
        </div>
      </div>
    </div>
  );
};
