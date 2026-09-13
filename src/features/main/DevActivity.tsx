import React, { useState, useEffect } from 'react';
import { useActivityStore } from '../../store/useActivityStore';
import { StepTrackingService } from '../workout/StepTrackingService';
import styles from './MainScreens.module.css';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DevActivity: React.FC = () => {
  const { dailyActivity } = useActivityStore();
  const [status, setStatus] = useState(StepTrackingService.status);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(StepTrackingService.status);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.screenContainer} style={{ padding: '24px' }}>
      <Link to="/activity" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', textDecoration: 'none', marginBottom: '24px' }}>
        <ArrowLeft size={20} /> BACK TO ACTIVITY
      </Link>
      
      <div className={styles.systemOuterFrame}>
        <div className={styles.statusTitleBox} style={{ color: 'var(--accent-alert)', borderColor: 'var(--accent-alert)' }}>
          DEV DIAGNOSTICS: ACTIVITY
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', fontFamily: 'monospace' }}>
          <div>
            <div style={{ color: 'var(--text-dim)' }}>STEP SENSOR STATUS</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
              {status === 'DEVICE STEP SENSOR NOT ACCESSIBLE' ? 'UNAVAILABLE' : 'AVAILABLE'}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-dim)' }}>ACTIVITY PERMISSION</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
              {status}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-dim)' }}>DATA SOURCE</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
              {StepTrackingService.source}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-dim)' }}>LAST SYNC</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
              {dailyActivity?.lastSyncedAt ? new Date(dailyActivity.lastSyncedAt).toLocaleString() : 'NEVER'}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-dim)' }}>TODAY'S DEVICE STEPS</div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '2rem', fontWeight: 'bold' }}>
              {dailyActivity?.automaticSteps || 0}
            </div>
          </div>
          
          <div>
            <div style={{ color: 'var(--text-dim)' }}>TODAY'S MANUAL STEPS</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '1.5rem' }}>
              {dailyActivity?.manualSteps || 0}
            </div>
          </div>
        </div>

        {import.meta.env.DEV && (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ color: 'var(--text-dim)', marginBottom: '8px' }}>MOCK SENSOR INPUT (DEV ONLY)</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => StepTrackingService.addMockSteps(100)} 
                style={{ flex: 1, padding: '12px', background: 'rgba(0,240,255,0.1)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', borderRadius: '4px', cursor: 'pointer' }}
              >
                +100 STEPS
              </button>
              <button 
                onClick={() => StepTrackingService.addMockSteps(1000)} 
                style={{ flex: 1, padding: '12px', background: 'rgba(0,240,255,0.1)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', borderRadius: '4px', cursor: 'pointer' }}
              >
                +1000 STEPS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
