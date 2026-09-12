import React from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import styles from './MainScreens.module.css';

export const Profile: React.FC = () => {
  const { profile, resetProfile } = useProfileStore();
  const navigate = useNavigate();

  return (
    <div className={styles.screenContainer}>
      <div className={styles.systemOuterFrame}>
        <div className={styles.statusTitleBox} style={{fontSize: '1.2rem', padding: '4px 20px'}}>SYSTEM_SETTINGS</div>

        <div className={styles.levelInfoSection} style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <div className={styles.jobBlock} style={{ borderLeft: 'none', paddingLeft: 0 }}>
            <div><span className={styles.labelDim}>PLAYER:</span> {profile.name}</div>
            <div><span className={styles.labelDim}>AGE:</span> {profile.age}</div>
            <div><span className={styles.labelDim}>HEIGHT:</span> {profile.height} cm</div>
            <div><span className={styles.labelDim}>WEIGHT:</span> {profile.weight} kg</div>
          </div>
        </div>

        <div className={styles.statsSection}>
          <h3 className={styles.statName} style={{ marginBottom: '16px' }}>[ CONFIGURATION ]</h3>
          <div className={styles.jobBlock} style={{ borderLeft: 'none', paddingLeft: 0, gap: '12px' }}>
            <div><span className={styles.labelDim}>GOAL:</span> {profile.primaryGoal}</div>
            <div><span className={styles.labelDim}>EXPERIENCE:</span> {profile.experienceLevel}</div>
            <div><span className={styles.labelDim}>WORKOUT DAYS:</span> {profile.trainingDays.join(', ')}</div>
            <div><span className={styles.labelDim}>PREFERRED TIME:</span> {profile.preferredWorkoutTime === 'Custom time' ? profile.customTime : profile.preferredWorkoutTime}</div>
            <div><span className={styles.labelDim}>EQUIPMENT:</span> {profile.equipment.join(', ')}</div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Button variant="primary" style={{ width: '100%' }} onClick={() => navigate('/onboarding')}>EDIT CONFIGURATION</Button>
          <Button 
            variant="outline" 
            style={{ width: '100%', borderColor: 'var(--accent-alert)', color: 'var(--accent-alert)', boxShadow: '0 0 10px rgba(239, 68, 68, 0.2) inset' }}
            onClick={() => {
              if (window.confirm('Are you sure you want to reset the system? All progress will be lost.')) {
                resetProfile();
              }
            }}
          >
            RESET SYSTEM
          </Button>
        </div>
      </div>
    </div>
  );
};
