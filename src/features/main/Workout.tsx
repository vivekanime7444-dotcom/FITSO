import React, { useState, useEffect } from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import type { DayOfWeek } from '../../store/useProfileStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import type { WorkoutSession } from '../../store/useWorkoutStore';
import { generateWorkout } from '../workout/workoutGenerator';
import { generateWeeklySplit } from '../workout/splitGenerator';
import { getExerciseById } from '../workout/exerciseDatabase';
import { SystemVoice } from '../workout/SystemVoice';
import { HapticService } from '../workout/HapticService';
import { SoundEffectService } from '../workout/SoundEffectService';
import { Play, Check, Timer, ChevronRight, Volume2, VolumeX, ShieldAlert, Zap, ZapOff } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Workout: React.FC = () => {
  const { profile } = useProfileStore();
  const { 
    activeWorkout, 
    startWorkout, 
    updateActiveSet, 
    completeActiveWorkout, 
    cancelActiveWorkout,
    voiceEnabled,
    setVoiceEnabled,
    soundsEnabled,
    setSoundsEnabled,
    workoutHistory,
    weeklyPlan,
    setWeeklyPlan
  } = useWorkoutStore();
  
  const [proposedWorkout, setProposedWorkout] = useState<WorkoutSession | null>(null);
  const [viewState, setViewState] = useState<'overview' | 'active' | 'rest' | 'summary'>('overview');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); 

  useEffect(() => {
    SoundEffectService.setEnabled(soundsEnabled);
  }, [soundsEnabled]);

  useEffect(() => {
    if (profile.isCompleted) {
      const plan = generateWeeklySplit(profile);
      setWeeklyPlan(plan);
    }
  }, [profile.trainingDays, profile.primaryGoal, profile.experienceLevel, setWeeklyPlan]);

  useEffect(() => {
    if (!activeWorkout && profile.isCompleted && !proposedWorkout && weeklyPlan.length > 0) {
      const generated = generateWorkout(profile);
      setProposedWorkout(generated); 
    }
  }, [profile, activeWorkout, proposedWorkout, weeklyPlan]);

  const playVoice = (text: string) => {
    if (voiceEnabled) {
      setIsSpeaking(true);
      SystemVoice.speak(text, voiceEnabled);
      // Rough approximation for UI animation duration
      setTimeout(() => setIsSpeaking(false), 3000); 
    }
  };

  const playNextSetVoice = () => {
    if (!activeWorkout) return;
    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    const def = getExerciseById(currentEx.exerciseId);
    const currentSet = currentEx.sets[currentSetIndex];
    
    if (def && currentSet) {
      const type = def.movementType === 'repetition' ? 'reps' : 'time';
      const amount = type === 'reps' ? currentSet.targetReps || 0 : currentSet.targetDuration || 0;

      if (currentSetIndex === 0) {
        // Announce exercise, then set
        playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.startExercise(currentExerciseIndex + 1, def.voiceName)));
        setTimeout(() => {
          playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.startSet(currentSetIndex + 1, type, amount)));
        }, 3000);
      } else {
        // Just announce set
        playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.startSet(currentSetIndex + 1, type, amount)));
      }
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isResting && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft(prev => {
          const next = prev - 1;
          // Play subtle tick sound on important countdown markers
          if (next <= 10 && next > 0) {
            HapticService.selection();
            SoundEffectService.playClick();
          }
          return next;
        });
      }, 1000);
    } else if (isResting && restTimeLeft === 0) {
      setIsResting(false);
      setViewState('active');
      
      // Rest Complete Sequence
      HapticService.confirm();
      SoundEffectService.playNotification();
      
      setTimeout(() => {
        playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.restComplete()));
        
        setTimeout(() => {
          playNextSetVoice();
        }, 2500);
      }, 500); // Wait for sound effect to finish
    }
    return () => clearInterval(interval);
  }, [isResting, restTimeLeft, activeWorkout, currentExerciseIndex, currentSetIndex, voiceEnabled]);


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

  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayStr = days[new Date().getDay()];
  const todayPlan = weeklyPlan.find(p => p.dayOfWeek === todayStr);

  if (!activeWorkout && todayPlan?.isRestDay) {
    return (
      <div className={styles.screenContainer}>
        <div className={styles.systemOuterFrame} style={{ minHeight: '60vh', textAlign: 'center', justifyContent: 'center', position: 'relative' }}>
          
          <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '16px' }}>
            <button onClick={() => setSoundsEnabled(!soundsEnabled)} style={{ background: 'none', border: 'none', color: soundsEnabled ? 'var(--text-secondary)' : 'var(--text-dim)', cursor: 'pointer' }}>
              {soundsEnabled ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} style={{ background: 'none', border: 'none', color: voiceEnabled ? 'var(--text-secondary)' : 'var(--text-dim)', cursor: 'pointer' }}>
              {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          <div className={styles.statusTitleBox} style={{ color: 'var(--text-secondary)', borderColor: 'var(--text-secondary)' }}>
            TODAY'S STATUS
          </div>
          <ShieldAlert size={48} style={{ color: 'var(--text-secondary)', margin: '24px auto' }} />
          <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
            RECOVERY PROTOCOL
          </h2>
          <p className={styles.panelText}>
            Today is a rest day.<br/>Recovery is an essential part of the training system.
          </p>
        </div>
      </div>
    );
  }

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
    // 1. Initialize Audio/Voice Context on intentional user interaction
    SoundEffectService.init();
    SystemVoice.init();
    
    // 2. Play Haptic and Button Sound
    HapticService.light();
    SoundEffectService.playMissionStart();

    if (proposedWorkout) {
      startWorkout(proposedWorkout);
    }
    setViewState('active');
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);

    // 3. Play Voice (wait a bit for sound effect)
    setTimeout(() => {
      const protocolName = activeWorkout ? activeWorkout.workoutName : proposedWorkout?.workoutName;
      playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.startWorkout(protocolName || 'Protocol')));
      
      setTimeout(() => {
        const firstExId = (activeWorkout || proposedWorkout)?.exercises[0]?.exerciseId;
        if (firstExId) {
          const def = getExerciseById(firstExId);
          if (def) {
            playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.startExercise(1, def.voiceName)));
            
            setTimeout(() => {
              const currentEx = (activeWorkout || proposedWorkout)?.exercises[0];
              const firstSet = currentEx?.sets[0];
              if (firstSet) {
                 const type = def.movementType === 'repetition' ? 'reps' : 'time';
                 const amount = type === 'reps' ? firstSet.targetReps || 0 : firstSet.targetDuration || 0;
                 playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.startSet(1, type, amount)));
              }
            }, 3500);
          }
        }
      }, 4000);
    }, 800);
  };

  const handleCompleteSet = () => {
    if (!activeWorkout) return;
    
    // 1. Button Press Haptic & Sound
    HapticService.confirm();
    SoundEffectService.playConfirm();

    updateActiveSet(currentExerciseIndex, currentSetIndex, { completed: true });
    
    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    const isLastSet = currentSetIndex >= currentEx.sets.length - 1;
    const isLastExercise = currentExerciseIndex >= activeWorkout.exercises.length - 1;

    setTimeout(() => {
      if (isLastSet && isLastExercise) {
        completeActiveWorkout();
        setViewState('summary');
        SoundEffectService.playMissionComplete();
        setTimeout(() => playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.workoutComplete())), 800);
      } else if (isLastSet) {
        const exDef = getExerciseById(currentEx.exerciseId);
        setRestTimeLeft(exDef?.defaultRest || 60);
        setIsResting(true);
        setViewState('rest');
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSetIndex(0);
        
        SoundEffectService.playNotification();
        setTimeout(() => playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.setComplete())), 500);
      } else {
        const exDef = getExerciseById(currentEx.exerciseId);
        setRestTimeLeft(exDef?.defaultRest || 60);
        setIsResting(true);
        setViewState('rest');
        setCurrentSetIndex(prev => prev + 1);
        
        SoundEffectService.playNotification();
        setTimeout(() => playVoice(SystemVoice.getRandomPhrase(SystemVoice.getPhrases.setComplete())), 500);
      }
    }, 400); // Delay UI transition slightly after click sound
  };

  const skipRest = () => {
    HapticService.light();
    SoundEffectService.playButton();
    setIsResting(false);
    setRestTimeLeft(0);
    setViewState('active');
    SystemVoice.cancel();
    playNextSetVoice();
  };

  const getPreviousPerformance = (exerciseId: string) => {
    for (const session of workoutHistory) {
      const ex = session.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.some(s => s.completed)) {
        return ex.sets.find(s => s.completed);
      }
    }
    return null;
  };

  const renderSensoryControls = () => (
    <div style={{
      position: 'absolute', top: '16px', right: '16px',
      display: 'flex', alignItems: 'center', gap: '16px',
    }}>
      <button 
        onClick={() => {
          HapticService.selection();
          setSoundsEnabled(!soundsEnabled);
          if (!soundsEnabled) {
             // Will play after state updates
             setTimeout(() => SoundEffectService.playClick(), 50);
          }
        }}
        style={{ background: 'none', border: 'none', color: soundsEnabled ? 'var(--text-secondary)' : 'var(--text-dim)', cursor: 'pointer' }}
      >
        {soundsEnabled ? <Zap size={20} /> : <ZapOff size={20} />}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isSpeaking ? 'var(--accent-cyan)' : (voiceEnabled ? 'var(--text-secondary)' : 'var(--text-dim)') }}>
        {isSpeaking && <span className={styles.labelDim} style={{ color: 'var(--accent-cyan)' }}>SYSTEM</span>}
        <button 
          onClick={() => {
            HapticService.selection();
            SoundEffectService.playClick();
            setVoiceEnabled(!voiceEnabled);
            if (voiceEnabled) SystemVoice.cancel();
          }}
          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          {voiceEnabled ? <Volume2 size={20} className={isSpeaking ? 'pulse-anim' : ''} /> : <VolumeX size={20} />}
        </button>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className={styles.systemOuterFrame} style={{ position: 'relative' }}>
      {renderSensoryControls()}
      <div className={styles.statusTitleBox}>TODAY'S MISSION</div>
      
      <div style={{ display: 'flex', gap: '4px', margin: '16px 0', overflowX: 'auto', paddingBottom: '8px' }}>
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => {
          const plan = weeklyPlan.find(p => p.dayOfWeek === day);
          const isToday = day === todayStr;
          return (
            <div key={day} style={{
              flex: '1', minWidth: '40px', padding: '8px 4px', textAlign: 'center',
              backgroundColor: isToday ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-surface)',
              border: isToday ? '1px solid var(--accent-cyan)' : 'var(--border-thin)',
              color: isToday ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.7rem'
            }}>
              <div>{day}</div>
              <div style={{ marginTop: '4px', fontSize: '0.6rem', color: plan?.isRestDay ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                {plan?.isRestDay ? 'REST' : 'WORK'}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {displayWorkout.workoutName}
        </h2>
        <div className={styles.labelDim} style={{ color: 'var(--accent-cyan)' }}>
          {displayWorkout.targetMuscles?.join(' • ')}
        </div>
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
                <span style={{ fontWeight: 'bold' }}>{def?.name}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '28px', marginTop: '4px' }}>
                  {def?.muscleGroup.toUpperCase()}
                </div>
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
        <Play size={20} /> {activeWorkout ? 'RESUME MISSION' : 'START MISSION'}
      </button>
      
      {activeWorkout && (
        <button 
          onClick={() => {
            HapticService.light();
            SoundEffectService.playButton();
            cancelActiveWorkout();
          }}
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
    
    const prevPerf = getPreviousPerformance(currentEx.exerciseId);

    return (
      <div className={styles.systemOuterFrame} style={{ minHeight: '70vh', position: 'relative' }}>
        {renderSensoryControls()}
        <div className={styles.statusTitleBox} style={{ color: 'var(--accent-alert)', borderColor: 'var(--accent-alert)' }}>
          MISSION IN PROGRESS
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>EXERCISE 0{currentExerciseIndex + 1} / 0{activeWorkout.exercises.length}</span>
          <span>SET {currentSetIndex + 1} / {currentEx.sets.length}</span>
        </div>

        <h2 className="system-title" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '16px' }}>
          {def?.name}
        </h2>

        {prevPerf && (
          <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            LAST SESSION: {prevPerf.actualReps || prevPerf.targetReps} REPS
          </div>
        )}

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
      <div className={styles.systemOuterFrame} style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {renderSensoryControls()}
        <Timer size={48} style={{ color: 'var(--text-secondary)', marginBottom: '24px' }} />
        <div className={styles.labelDim} style={{ letterSpacing: '4px' }}>RECOVERY PHASE</div>
        
        <div style={{ fontSize: '5rem', color: 'var(--accent-cyan)', textShadow: 'var(--system-glow)', fontFamily: 'var(--font-system)', margin: '24px 0' }}>
          {restTimeLeft}
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={() => {
              HapticService.selection();
              SoundEffectService.playClick();
              setRestTimeLeft(prev => prev + 30);
            }}
            style={{
              padding: '12px 24px', backgroundColor: 'transparent', 
              border: '1px solid var(--border-thin)', color: 'var(--text-primary)', 
              fontFamily: 'var(--font-system)', cursor: 'pointer'
            }}
          >
            +30 SEC
          </button>
          <button 
            onClick={skipRest}
            style={{
              padding: '12px 24px', backgroundColor: 'transparent', 
              border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', 
              fontFamily: 'var(--font-system)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            SKIP <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className={styles.systemOuterFrame} style={{ minHeight: '70vh', textAlign: 'center', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {renderSensoryControls()}
      <div className={styles.statusTitleBox} style={{ color: '#10b981', borderColor: '#10b981' }}>
        MISSION COMPLETE
      </div>
      
      <h2 className="system-title" style={{ fontSize: '2rem', marginTop: '24px', marginBottom: '8px' }}>
        {displayWorkout.workoutName}
      </h2>
      <div className={styles.labelDim}>ALL OBJECTIVES COMPLETE</div>
      
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
          onClick={() => { 
            HapticService.light();
            SoundEffectService.playButton();
            setViewState('overview'); 
            setProposedWorkout(null); 
          }}
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
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; color: var(--accent-cyan); }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse-anim {
          animation: pulse 1s infinite;
        }
      `}</style>
      {viewState === 'overview' && renderOverview()}
      {viewState === 'active' && renderActive()}
      {viewState === 'rest' && renderRest()}
      {viewState === 'summary' && renderSummary()}
    </div>
  );
};
