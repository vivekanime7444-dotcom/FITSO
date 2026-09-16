import React, { useState } from 'react';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useProgressStore } from '../../store/useProgressStore';
import { Activity, Camera, Layers } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Progress: React.FC = () => {
  const { workoutHistory } = useWorkoutStore();
  const { photos } = useProgressStore();
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'GENERAL' | 'MUSCLE'>('HISTORY');
  
  // Group photos
  const generalPhotos = photos.filter(p => p.photoType === 'GENERAL_STANDING');
  const musclePhotos = photos.filter(p => p.photoType === 'TARGETED_MUSCLE');
  
  // Get unique muscles that have photos
  const uniqueMuscles = Array.from(
    new Set(musclePhotos.flatMap(p => p.muscleGroups || []))
  ).filter(Boolean);

  const renderHistory = () => {
    if (workoutHistory.length === 0) {
      return (
        <div className={styles.emptyState} style={{ height: 'auto', marginTop: '40px' }}>
          <Activity size={64} className={styles.emptyIcon} style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '16px', textShadow: 'var(--system-glow-subtle)' }}>
            [ NO LOGS FOUND ]
          </h2>
          <p className={styles.panelText}>
            Complete your first mission to generate system data.
          </p>
        </div>
      );
    }

    return (
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
    );
  };

  const renderGeneralPhotos = () => {
    if (generalPhotos.length === 0) {
      return (
        <div className={styles.emptyState} style={{ height: 'auto', marginTop: '40px' }}>
          <Camera size={64} className={styles.emptyIcon} style={{ color: 'var(--text-secondary)' }} />
          <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            NO GENERAL PHOTOS
          </h2>
          <p className={styles.panelText}>
            Take progress photos after completing a mission.
          </p>
        </div>
      );
    }

    return (
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {generalPhotos.map(photo => (
          <div key={photo.id} style={{ border: 'var(--border-thin)', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', borderBottom: 'var(--border-thin)' }}>
              <span style={{ fontFamily: 'var(--font-system)', color: 'var(--text-primary)' }}>
                {new Date(photo.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
              </span>
            </div>
            <img src={photo.imageUri} alt="General Progress" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        ))}
      </div>
    );
  };

  const renderMusclePhotos = () => {
    if (musclePhotos.length === 0) {
      return (
        <div className={styles.emptyState} style={{ height: 'auto', marginTop: '40px' }}>
          <Layers size={64} className={styles.emptyIcon} style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--accent-cyan)' }}>
            NO TARGETED PHOTOS
          </h2>
          <p className={styles.panelText}>
            Take targeted progress photos after completing a mission.
          </p>
        </div>
      );
    }

    return (
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {uniqueMuscles.map(muscle => {
          const mPhotos = musclePhotos.filter(p => p.muscleGroups.includes(muscle));
          return (
            <div key={muscle}>
              <div className={styles.statusTitleBox} style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', marginBottom: '16px', fontSize: '1rem', padding: '8px' }}>
                {muscle.toUpperCase()} PROGRESS
              </div>
              
              <div style={{ display: 'flex', overflowX: 'auto', gap: '16px', paddingBottom: '16px' }}>
                {mPhotos.map(photo => (
                  <div key={photo.id} style={{ minWidth: '200px', width: '200px', border: 'var(--border-thin)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
                    <img src={photo.imageUri} alt={`${muscle} Progress`} style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '8px', fontSize: '0.8rem' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>{new Date(photo.date).toLocaleDateString()}</div>
                      <div style={{ color: 'var(--accent-cyan)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.workoutName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.screenContainer}>
      <div className={styles.systemOuterFrame} style={{ minHeight: '60vh', padding: '16px' }}>
        
        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            style={{
              flex: 1, padding: '12px', background: activeTab === 'HISTORY' ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
              border: activeTab === 'HISTORY' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
              color: activeTab === 'HISTORY' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-system)', fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            HISTORY
          </button>
          <button 
            onClick={() => setActiveTab('GENERAL')}
            style={{
              flex: 1, padding: '12px', background: activeTab === 'GENERAL' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: activeTab === 'GENERAL' ? '1px solid var(--text-primary)' : '1px solid var(--border-color)',
              color: activeTab === 'GENERAL' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-system)', fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            GENERAL P.
          </button>
          <button 
            onClick={() => setActiveTab('MUSCLE')}
            style={{
              flex: 1, padding: '12px', background: activeTab === 'MUSCLE' ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
              border: activeTab === 'MUSCLE' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
              color: activeTab === 'MUSCLE' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-system)', fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            TARGET P.
          </button>
        </div>
        
        {activeTab === 'HISTORY' && renderHistory()}
        {activeTab === 'GENERAL' && renderGeneralPhotos()}
        {activeTab === 'MUSCLE' && renderMusclePhotos()}
        
      </div>
    </div>
  );
};
