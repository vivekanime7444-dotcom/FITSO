import React from 'react';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { Activity } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Progress: React.FC = () => {
  const { workoutHistory } = useWorkoutStore();

  return (
    <div className={styles.screenContainer}>
      <div className={styles.systemOuterFrame} style={{ minHeight: '60vh' }}>
        <div className={styles.statusTitleBox} style={{fontSize: '1.2rem', padding: '4px 20px'}}>
          TRAINING HISTORY
        </div>
        
        {workoutHistory.length === 0 ? (
          <div className={styles.emptyState} style={{ height: 'auto', marginTop: '40px' }}>
            <Activity size={64} className={styles.emptyIcon} style={{ color: 'var(--accent-cyan)' }} />
            <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '16px', textShadow: 'var(--system-glow-subtle)' }}>
              [ NO LOGS FOUND ]
            </h2>
            <p className={styles.panelText}>
              Complete your first mission to generate system data.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: '24px' }}>
            {workoutHistory.map((workout) => (
              <div key={workout.id} style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: 'var(--border-thin)',
                padding: '16px',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-system)', fontWeight: 'bold' }}>
                    {workout.workoutName}
                  </span>
                  <span className={styles.labelDim}>
                    {new Date(workout.date).toLocaleDateString()}
                  </span>
                </div>
                
                <div className={styles.statsGrid} style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className={styles.statItem} style={{ padding: '8px', background: 'transparent' }}>
                    <span className={styles.statName}>EXERCISES</span>
                    <span className={styles.statValue} style={{ fontSize: '1rem' }}>{workout.exercises.length}</span>
                  </div>
                  <div className={styles.statItem} style={{ padding: '8px', background: 'transparent' }}>
                    <span className={styles.statName}>TIME</span>
                    <span className={styles.statValue} style={{ fontSize: '1rem' }}>
                      {Math.floor((workout.duration || 0) / 60)}M {(workout.duration || 0) % 60}S
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
