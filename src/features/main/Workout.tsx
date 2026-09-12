import React, { useState, useEffect } from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import type { WorkoutSession } from '../../store/useWorkoutStore';
import { generateWorkout } from '../workout/workoutGenerator';
import { getExerciseById } from '../workout/exerciseDatabase';
import { Play, Check, Timer, ChevronRight } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Workout: React.FC = () => {
  const { profile } = useProfileStore();
  const { activeWorkout, startWorkout, updateActiveSet, completeActiveWorkout, cancelActiveWorkout } = useWorkoutStore();
  
  const [proposedWorkout, setProposedWorkout] = useState<WorkoutSession | null>(null);
  const [viewState, setViewState] = useState<'overview' | 'active' | 'rest' | 'summary'>('overview');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);

  // Generate a workout if we don't have one
  useEffect(() => {
    if (!activeWorkout && profile.isCompleted && !proposedWorkout) {
      const generated = generateWorkout(profile);
      setProposedWorkout(generated);
    }
  }, [profile, activeWorkout, proposedWorkout]);

  // Handle rest timer tick
  useEffect(() => {
    let interval: any = null;
    if (isResting && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isResting && restTimeLeft <= 0) {
      setIsResting(false);
      setViewState('active');
    }
    return () => clearInterval(interval);
  }, [isResting, restTimeLeft]);


  if (!profile.isCompleted) {
    return (
      <div className={styles.screenContainer}>
        <div className={styles.systemOuterFrame} style={{ minHeight: '60vh', justifyContent: 'center' }}>
          <div className={styles.statusTitleBox}>TRAINING</div>
          <div className={styles.emptyState}>
            <p className={styles.panelText}>Complete onboarding to unlock the training system.</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine which workout to show (active or proposed)
  const displayWorkout = activeWorkout || proposedWorkout;

  if (!displayWorkout) {
    return (
      <div className={styles.screenContainer}>
        <div className={styles.systemOuterFrame} style={{ minHeight: '60vh', justifyContent: 'center' }}>
          <div className={styles.statusTitleBox}>TRAINING</div>
          <div className={styles.emptyState}>
            <h2 className="system-title">SYSTEM ERROR</h2>
            <p className={styles.panelText}>Unable to generate mission based on current parameters.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleStartWorkout = () => {
    if (proposedWorkout) {
      startWorkout(proposedWorkout);
    }
    setViewState('active');
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
  };

  const handleCompleteSet = () => {
    if (!activeWorkout) return;
    
    // Mark set complete
    updateActiveSet(currentExerciseIndex, currentSetIndex, { completed: true });
    
    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    const isLastSet = currentSetIndex >= currentEx.sets.length - 1;
    const isLastExercise = currentExerciseIndex >= activeWorkout.exercises.length - 1;

    if (isLastSet && isLastExercise) {
      // Workout Complete!
      completeActiveWorkout();
      setViewState('summary');
    } else if (isLastSet) {
      // Move to next exercise, but take rest first
      const exDef = getExerciseById(currentEx.exerciseId);
      setRestTimeLeft(exDef?.defaultRest || 60);
      setIsResting(true);
      setViewState('rest');
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSetIndex(0);
    } else {
      // Move to next set, take rest
      const exDef = getExerciseById(currentEx.exerciseId);
      setRestTimeLeft(exDef?.defaultRest || 60);
      setIsResting(true);
      setViewState('rest');
      setCurrentSetIndex(prev => prev + 1);
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimeLeft(0);
    setViewState('active');
  };

  const renderOverview = () => (
    <div className={styles.systemOuterFrame}>
      <div className={styles.statusTitleBox}>TODAY'S MISSION</div>
      
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {displayWorkout.workoutName}
        </h2>
        <div className={styles.labelDim}>TARGET: {profile.primaryGoal.toUpperCase()}</div>
      </div>

      <div className={styles.statsGrid} style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '24px' }}>
        <div className={styles.statItem}>
          <span className={styles.statName}>EXERCISES</span>
          <span className={styles.statValue}>{displayWorkout.exercises.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statName}>EST. TIME</span>
          <span className={styles.statValue}>~45 MIN</span>
        </div>
      </div>

      <div style={{ borderTop: 'var(--border-thin)', paddingTop: '16px', marginBottom: '32px' }}>
        {displayWorkout.exercises.map((ex, i) => {
          const def = getExerciseById(ex.exerciseId);
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '8px', backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <span style={{ color: 'var(--accent-cyan)', marginRight: '12px' }}>0{i + 1}</span>
                <span style={{ fontWeight: 'bold' }}>{def?.name.toUpperCase()}</span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                {ex.sets.length} × {ex.sets[0].targetReps || ex.sets[0].targetDuration}
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={handleStartWorkout}
        style={{
          width: '100%', padding: '16px', backgroundColor: 'rgba(0, 240, 255, 0.1)', 
          border: 'var(--border-accent)', color: 'var(--accent-cyan)', 
          fontFamily: 'var(--font-system)', fontSize: '1.1rem', cursor: 'pointer',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
          boxShadow: 'var(--system-glow-subtle)'
        }}
      >
        <Play size={20} /> {activeWorkout ? 'RESUME MISSION' : 'ACCEPT MISSION'}
      </button>
      
      {activeWorkout && (
        <button 
          onClick={cancelActiveWorkout}
          style={{ width: '100%', padding: '12px', marginTop: '12px', background: 'transparent', border: 'none', color: 'var(--accent-alert)', fontFamily: 'var(--font-system)' }}
        >
          ABORT MISSION
        </button>
      )}
    </div>
  );

  const renderActive = () => {
    if (!activeWorkout) return null;
    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    const currentSet = currentEx.sets[currentSetIndex];
    const def = getExerciseById(currentEx.exerciseId);

    return (
      <div className={styles.systemOuterFrame} style={{ minHeight: '70vh' }}>
        <div className={styles.statusTitleBox} style={{ color: 'var(--accent-alert)', borderColor: 'var(--accent-alert)' }}>
          MISSION IN PROGRESS
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>EXERCISE 0{currentExerciseIndex + 1} / 0{activeWorkout.exercises.length}</span>
          <span>SET {currentSetIndex + 1} / {currentEx.sets.length}</span>
        </div>

        <h2 className="system-title" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '16px' }}>
          {def?.name.toUpperCase()}
        </h2>

        <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: 'var(--border-thin)', marginBottom: '32px', textAlign: 'center' }}>
          <div className={styles.labelDim} style={{ marginBottom: '8px' }}>TARGET</div>
          <div style={{ fontSize: '3rem', color: 'var(--accent-cyan)', textShadow: 'var(--system-glow)', fontFamily: 'var(--font-system)' }}>
            {def?.movementType === 'repetition' ? `${currentSet.targetReps} REPS` : `${currentSet.targetDuration} SEC`}
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={handleCompleteSet}
            style={{
              width: '100%', padding: '20px', backgroundColor: 'rgba(0, 240, 255, 0.1)', 
              border: 'var(--border-accent)', color: 'var(--accent-cyan)', 
              fontFamily: 'var(--font-system)', fontSize: '1.2rem', cursor: 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
              boxShadow: 'var(--system-glow)'
            }}
          >
            <Check size={24} /> SET COMPLETE
          </button>
        </div>
      </div>
    );
  };

  const renderRest = () => {
    return (
      <div className={styles.systemOuterFrame} style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Timer size={48} style={{ color: 'var(--text-secondary)', marginBottom: '24px' }} />
        <div className={styles.labelDim} style={{ letterSpacing: '4px' }}>RECOVERY PHASE</div>
        
        <div style={{ fontSize: '5rem', color: 'var(--accent-cyan)', textShadow: 'var(--system-glow)', fontFamily: 'var(--font-system)', margin: '24px 0' }}>
          {restTimeLeft}
        </div>
        
        <button 
          onClick={skipRest}
          style={{
            padding: '12px 32px', backgroundColor: 'transparent', 
            border: '1px solid var(--text-secondary)', color: 'var(--text-secondary)', 
            fontFamily: 'var(--font-system)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          SKIP REST <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  const renderSummary = () => (
    <div className={styles.systemOuterFrame} style={{ minHeight: '70vh', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.statusTitleBox} style={{ color: '#10b981', borderColor: '#10b981' }}>
        MISSION COMPLETE
      </div>
      
      <h2 className="system-title" style={{ fontSize: '2rem', marginTop: '24px', marginBottom: '8px' }}>
        {displayWorkout.workoutName}
      </h2>
      <div className={styles.labelDim}>SUCCESSFULLY EXECUTED</div>
      
      <div className={styles.statsGrid} style={{ gridTemplateColumns: '1fr', margin: '40px 0' }}>
         <div className={styles.statItem} style={{ justifyContent: 'space-between', padding: '16px' }}>
          <span className={styles.statName}>TOTAL EXERCISES:</span>
          <span className={styles.statValue} style={{ color: 'var(--accent-cyan)' }}>{displayWorkout.exercises.length}</span>
        </div>
        <div className={styles.statItem} style={{ justifyContent: 'space-between', padding: '16px' }}>
          <span className={styles.statName}>TOTAL SETS:</span>
          <span className={styles.statValue} style={{ color: 'var(--accent-cyan)' }}>
            {displayWorkout.exercises.reduce((acc, curr) => acc + curr.sets.length, 0)}
          </span>
        </div>
      </div>
      
      <div style={{ marginTop: 'auto' }}>
        <button 
          onClick={() => { setViewState('overview'); setProposedWorkout(null); }}
          style={{
            width: '100%', padding: '16px', backgroundColor: 'transparent', 
            border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', 
            fontFamily: 'var(--font-system)', fontSize: '1.1rem', cursor: 'pointer'
          }}
        >
          RETURN TO BASE
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.screenContainer}>
      {viewState === 'overview' && renderOverview()}
      {viewState === 'active' && renderActive()}
      {viewState === 'rest' && renderRest()}
      {viewState === 'summary' && renderSummary()}
    </div>
  );
};
