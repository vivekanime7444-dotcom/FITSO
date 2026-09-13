import React from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useActivityStore } from '../../store/useActivityStore';
import { User, Target, Calendar, Activity, Footprints } from 'lucide-react';
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
                {profile.preferredWorkoutTime || 'NONE'}
              </span>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
             <span className={styles.statName} style={{display: 'block', marginBottom: '8px'}}>EQUIPMENT INVENTORY:</span>
             <span className={styles.statValue} style={{fontSize: '0.9rem'}}>{profile.equipment.join(', ').toUpperCase() || 'NONE'}</span>
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
             <div className={styles.statusTitleBox} style={{ margin: '0 0 12px 0' }}>DAILY ACTIVITY</div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Footprints size={24} style={{ color: 'var(--accent-cyan)' }} />
                 <div>
                   <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                     {(() => {
                       const { dailyActivity } = useActivityStore.getState();
                       return (dailyActivity?.steps || 0).toLocaleString();
                     })()} STEPS
                   </div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                     {(() => {
                       const { dailyActivity, stepGoal } = useActivityStore.getState();
                       const steps = dailyActivity?.steps || 0;
                       return `${Math.min(Math.round((steps / stepGoal) * 100), 100)}% COMPLETE`;
                     })()}
                   </div>
                 </div>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                   {(() => {
                     const { dailyActivity } = useActivityStore.getState();
                     return dailyActivity?.distance ? `${(dailyActivity.distance / 1000).toFixed(2)} km` : 'DISTANCE UNAVAILABLE';
                   })()}
                 </div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                   {(() => {
                     const { dailyActivity } = useActivityStore.getState();
                     return dailyActivity?.activeTime ? `${Math.floor(dailyActivity.activeTime / 60)} min` : 'TIME UNAVAILABLE';
                   })()}
                 </div>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
