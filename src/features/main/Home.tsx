import React from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { User, Target, Calendar, Activity } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Home: React.FC = () => {
  const { profile } = useProfileStore();

  return (
    <div className={styles.screenContainer}>
      <div className={styles.systemOuterFrame}>
        
        {/* Title Box */}
        <div className={styles.statusTitleBox}>
          STATUS
        </div>

        {/* Level & Player Info */}
        <div className={styles.levelInfoSection}>
          <div className={styles.levelBlock}>
            <div className={styles.levelNumber}>1</div>
            <div className={styles.levelLabel}>LEVEL</div>
          </div>
          <div className={styles.jobBlock}>
            <div><span className={styles.labelDim}>PLAYER:</span> {profile.name.toUpperCase() || 'UNKNOWN'}</div>
            <div><span className={styles.labelDim}>CLASS:</span> {profile.experienceLevel.toUpperCase() || 'BEGINNER'}</div>
          </div>
        </div>

        {/* Mission Status (Replaces Vitals) */}
        <div className={styles.vitalsSection}>
          <div className={styles.vitalBars}>
            <div className={styles.vitalBarRow}>
              <Activity size={18} className={styles.vitalIcon} />
              <div className={styles.barLabel} style={{width: 'auto', marginRight: '8px'}}>MISSION</div>
              <div className={styles.barTrack} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: 'none' }}>
                <div style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-system)', letterSpacing: '1px' }}>
                  {(() => {
                    const { weeklyPlan } = useWorkoutStore.getState();
                    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                    const todayStr = days[new Date().getDay()];
                    const todayPlan = weeklyPlan.find(p => p.dayOfWeek === todayStr);
                    if (todayPlan) return todayPlan.protocolName.toUpperCase();
                    return profile.trainingDaysCount ? 'STANDBY' : 'AWAITING DIRECTIVE';
                  })()}
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.fatigueBlock}>
            <div className={styles.fatigueIcon}></div>
            <div className={styles.fatigueLabel}>STREAK: <span style={{color: 'var(--text-primary)'}}>1</span></div>
          </div>
        </div>

        {/* Physical Stats Grid (Replaces STR/VIT/etc) */}
        <div className={styles.statsSection}>
          <div className={styles.statsGrid} style={{ gridTemplateColumns: '1fr' }}>
            <div className={styles.statItem}>
              <User size={16} className={styles.statIcon} />
              <span className={styles.statName}>HEIGHT:</span>
              <span className={styles.statValue}>{profile.height || '0'} cm</span>
            </div>
            <div className={styles.statItem}>
              <User size={16} className={styles.statIcon} />
              <span className={styles.statName}>WEIGHT:</span>
              <span className={styles.statValue}>{profile.weight || '0'} kg</span>
            </div>
            <div className={styles.statItem}>
              <Target size={16} className={styles.statIcon} />
              <span className={styles.statName}>GOAL:</span>
              <span className={styles.statValue}>{profile.primaryGoal.toUpperCase() || 'NONE'}</span>
            </div>
            <div className={styles.statItem}>
              <Calendar size={16} className={styles.statIcon} />
              <span className={styles.statName}>TIME:</span>
              <span className={styles.statValue}>
                {profile.preferredWorkoutTime === 'Custom time' ? profile.customTime : profile.preferredWorkoutTime?.toUpperCase() || 'NONE'}
              </span>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid rgba(153, 235, 255, 0.2)', paddingTop: '16px' }}>
             <span className={styles.statName} style={{display: 'block', marginBottom: '8px'}}>EQUIPMENT INVENTORY:</span>
             <span className={styles.statValue} style={{fontSize: '0.9rem'}}>{profile.equipment.join(', ').toUpperCase() || 'NONE'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
