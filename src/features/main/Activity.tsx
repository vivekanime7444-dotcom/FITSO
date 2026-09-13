import React, { useState, useEffect } from 'react';
import { useActivityStore } from '../../store/useActivityStore';
import { StepTrackingService } from '../workout/StepTrackingService';
import { Footprints, Plus, History, Clock, Map } from 'lucide-react';
import { HapticService } from '../workout/HapticService';
import { SoundEffectService } from '../workout/SoundEffectService';
import styles from './MainScreens.module.css';

export const Activity: React.FC = () => {
  const { dailyActivity, stepGoal, setStepGoal, addManualActivity, history } = useActivityStore();
  const [manualSteps, setManualSteps] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(stepGoal.toString());
  const [activeTab, setActiveTab] = useState<'week' | 'month'>('week');

  // Trigger sync on mount
  useEffect(() => {
    StepTrackingService.sync();
  }, []);

  const totalSteps = dailyActivity?.totalSteps || 0;
  const autoSteps = dailyActivity?.automaticSteps || 0;
  const manualCount = dailyActivity?.manualSteps || 0;
  
  const progress = Math.min((totalSteps / stepGoal) * 100, 100);
  const status = StepTrackingService.status;
  const isWebUnsupported = status === 'DEVICE STEP SENSOR NOT ACCESSIBLE';

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(manualSteps);
    if (!isNaN(num) && num > 0) {
      HapticService.selection();
      SoundEffectService.playClick();
      addManualActivity(num);
      setManualSteps('');
    }
  };

  const handleGoalSave = () => {
    const num = parseInt(newGoal);
    if (!isNaN(num) && num >= 1000) {
      HapticService.selection();
      SoundEffectService.playClick();
      setStepGoal(num);
      setIsEditingGoal(false);
    }
  };

  const getWeekHistory = () => {
    const result = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const record = dateStr === dailyActivity?.date 
        ? dailyActivity 
        : history.find(h => h.date === dateStr);
        
      result.push({
        date: d,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        steps: record?.totalSteps || 0
      });
    }
    return result;
  };

  const weekHistory = getWeekHistory();

  return (
    <div className={styles.screenContainer}>
      {/* TODAY SECTION */}
      <div className={styles.systemOuterFrame}>
        <div className={styles.statusTitleBox}>TODAY'S ACTIVITY</div>
        
        {isWebUnsupported && totalSteps === 0 ? (
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-dim)', marginBottom: '16px' }}>—</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>AUTOMATIC DEVICE DATA</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>UNAVAILABLE IN WEB MODE</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <Footprints size={48} style={{ color: 'var(--accent-cyan)', marginBottom: '16px', opacity: 0.8 }} />
            
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1', color: 'var(--text-primary)', textShadow: 'var(--system-glow)' }}>
              {totalSteps.toLocaleString()}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>STEPS</span>
              <span style={{ color: 'var(--text-dim)' }}>/</span>
              {isEditingGoal ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    value={newGoal} 
                    onChange={(e) => setNewGoal(e.target.value)}
                    style={{ width: '80px', background: 'var(--surface-bg)', border: '1px solid var(--border-accent)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px' }}
                  />
                  <button 
                    onClick={handleGoalSave}
                    style={{ background: 'var(--accent-cyan)', color: '#000', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    SAVE
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingGoal(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }}
                >
                  {stepGoal.toLocaleString()}
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              {isWebUnsupported ? 'DEVICE DATA: UNAVAILABLE' : `${autoSteps.toLocaleString()} AUTO`} • {manualCount.toLocaleString()} MANUAL
            </div>
          </div>
        )}

        {/* PROGRESS BAR */}
        <div style={{ width: '100%', height: '8px', background: 'var(--surface-bg)', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px', position: 'relative' }}>
          <div style={{ 
            width: `${progress}%`, 
            height: '100%', 
            background: 'var(--accent-cyan)',
            boxShadow: '0 0 10px var(--accent-cyan)',
            transition: 'width 0.5s ease-out'
          }} />
        </div>

        {/* METRICS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Map size={16} /> DISTANCE
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {dailyActivity?.distance ? (dailyActivity.distance / 1000).toFixed(2) : '0.00'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>km</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>ESTIMATED</div>
          </div>
          
          <div style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Clock size={16} /> ACTIVE TIME
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {dailyActivity?.activeTime ? Math.floor(dailyActivity.activeTime / 60) : '0'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>min</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>ESTIMATED</div>
          </div>
        </div>

      </div>

      {/* MANUAL ENTRY */}
      {isWebUnsupported && (
        <div className={styles.systemOuterFrame}>
          <div className={styles.statusTitleBox}>MANUAL ACTIVITY</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '12px 0' }}>
            Automatic tracking unavailable. Enter daily steps from your wearable device:
          </p>
          <form onSubmit={handleManualAdd} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="number"
              placeholder="Enter steps (e.g., 2000)"
              value={manualSteps}
              onChange={(e) => setManualSteps(e.target.value)}
              style={{ flex: 1, padding: '16px', background: 'var(--surface-bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '8px', fontFamily: 'var(--font-system)' }}
            />
            <button 
              type="submit"
              disabled={!manualSteps || parseInt(manualSteps) <= 0}
              style={{ padding: '0 24px', background: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: manualSteps ? 'pointer' : 'not-allowed', opacity: manualSteps ? 1 : 0.5 }}
            >
              <Plus size={24} />
            </button>
          </form>
        </div>
      )}

      {/* HISTORY */}
      <div className={styles.systemOuterFrame} style={{ marginBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div className={styles.statusTitleBox} style={{ margin: 0 }}>HISTORY</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={() => { HapticService.light(); setActiveTab('week'); }}
              style={{ background: 'none', border: 'none', color: activeTab === 'week' ? 'var(--accent-cyan)' : 'var(--text-dim)', fontWeight: 'bold', cursor: 'pointer' }}
            >
              WEEK
            </button>
            <button 
              onClick={() => { HapticService.light(); setActiveTab('month'); }}
              style={{ background: 'none', border: 'none', color: activeTab === 'month' ? 'var(--accent-cyan)' : 'var(--text-dim)', fontWeight: 'bold', cursor: 'pointer' }}
            >
              MONTH
            </button>
          </div>
        </div>

        {activeTab === 'week' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {weekHistory.map((day, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--surface-bg)', borderRadius: '8px' }}>
                <span style={{ color: day.date.toDateString() === new Date().toDateString() ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                  {day.dayName}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: day.steps >= stepGoal ? '#10b981' : 'var(--text-primary)' }}>
                  {day.steps.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
            <History size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p>Extended history analytics unavailable.</p>
          </div>
        )}
      </div>
    </div>
  );
};
