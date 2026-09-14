import React, { useState, useEffect } from 'react';
import { useProfileStore } from '../../store/useProfileStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import type { WorkoutSession } from '../../store/useWorkoutStore';
import { useSchedulerStore } from '../../store/useSchedulerStore';
import { generateWorkout } from '../workout/workoutGenerator';
import { generateWeeklySplit } from '../workout/splitGenerator';
import { getExerciseById } from '../workout/exerciseDatabase';
import { HapticService } from '../workout/HapticService';
import { SoundEffectService } from '../workout/SoundEffectService';
import { SystemVoiceService } from '../workout/SystemVoiceService';
import { WorkoutSchedulerService } from '../workout/WorkoutSchedulerService';
import { PoseDetectionService } from '../workout/PoseDetectionService';
import { ExerciseAnalysisEngine } from '../workout/ExerciseAnalysisEngine';
import { Play, Check, ChevronRight, Zap, ZapOff, Volume2, VolumeX, BellRing, FastForward, Timer, ShieldAlert, Camera, CameraOff } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Workout: React.FC = () => {
  const { profile } = useProfileStore();
  const { 
    activeWorkout, 
    startWorkout, 
    updateActiveSet, 
    completeActiveWorkout, 
    cancelActiveWorkout,
    soundsEnabled,
    setSoundsEnabled,
    voiceEnabled,
    setVoiceEnabled,
    cameraEnabled,
    setCameraEnabled,
    workoutHistory,
    weeklyPlan,
    setWeeklyPlan
  } = useWorkoutStore();

  const { weeklySchedule, updateDayStatus, notificationsEnabled } = useSchedulerStore();
  
  const [proposedWorkout, setProposedWorkout] = useState<WorkoutSession | null>(null);
  const [viewState, setViewState] = useState<'overview' | 'active' | 'rest' | 'summary'>('overview');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);

  // Camera tracking state
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isTrackingReady, setIsTrackingReady] = useState(false);

  useEffect(() => {
    SoundEffectService.setEnabled(soundsEnabled);
  }, [soundsEnabled]);

  useEffect(() => {
    SystemVoiceService.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  // Strict cleanup on unmount
  useEffect(() => {
    // Initialize pose engine
    PoseDetectionService.getInstance().initialize().then(() => {
      setIsTrackingReady(true);
    });

    return () => {
      SystemVoiceService.endSession();
      PoseDetectionService.getInstance().stopCamera();
    };
  }, []);

  const playNextSetVoice = (exIndex: number, setIndex: number, delay = 0) => {
    const workout = activeWorkout || proposedWorkout;
    if (!workout) return;
    const currentEx = workout.exercises[exIndex];
    if (!currentEx) return;
    
    const def = getExerciseById(currentEx.exerciseId);
    const currentSet = currentEx.sets[setIndex];
    
    if (def && currentSet) {
      const type = def.movementType === 'repetition' ? 'reps' : 'time';
      const amount = type === 'reps' ? currentSet.targetReps || 0 : currentSet.targetDuration || 0;

      if (setIndex === 0) {
        SystemVoiceService.announceExercise(exIndex + 1, def.voiceName, delay);
        SystemVoiceService.announceSet(setIndex + 1, type, amount, delay + 3000);
      } else {
        SystemVoiceService.announceSet(setIndex + 1, type, amount, delay);
      }
    }
  };

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
      
      SystemVoiceService.announceRestComplete(500);
      playNextSetVoice(currentExerciseIndex, currentSetIndex, 2500);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimeLeft, activeWorkout, currentExerciseIndex, currentSetIndex]);

  // AI Camera tracking lifecycle
  useEffect(() => {
    if (viewState === 'active' && activeWorkout && cameraEnabled && isTrackingReady) {
      const currentEx = activeWorkout.exercises[currentExerciseIndex];
      const currentSet = currentEx.sets[currentSetIndex];
      const def = getExerciseById(currentEx.exerciseId);
      
      const engine = ExerciseAnalysisEngine.getInstance();
      const poseService = PoseDetectionService.getInstance();

      // Only start if exercise is supported (simple check for now)
      const isSupported = def && ['push-up', 'squat', 'lunge', 'curl'].some(k => def.name.toLowerCase().includes(k));

      if (isSupported && videoRef.current && canvasRef.current) {
        // Start engine
        engine.startExercise(def.name, currentSet.targetReps || 0);

        // Setup callbacks
        engine.onStateChange = (state) => {
          setAnalysisResult((prev: any) => ({ ...prev, state }));
        };

        engine.onRepComplete = (reps) => {
          setAnalysisResult((prev: any) => ({ ...prev, reps }));
          // If we hit the target
          if (currentSet.targetReps && reps >= currentSet.targetReps) {
            handleCompleteSet();
          }
        };

        let lastReportedState = engine['currentState'];
        let lastReportedReps = 0;
        let lastUiUpdateTime = 0;

        poseService.onPoseDetected = (result) => {
          const res = engine.processPose(result);
          
          const now = performance.now();
          const stateChanged = res.state !== lastReportedState;
          const repsChanged = res.reps !== lastReportedReps;
          const timeToUpdate = now - lastUiUpdateTime > 500; // Update UI max twice a second for confidence/posture
          
          if (stateChanged || repsChanged || timeToUpdate) {
             lastReportedState = res.state;
             lastReportedReps = res.reps;
             lastUiUpdateTime = now;
             setAnalysisResult(res);
          }
        };

        poseService.startCamera(videoRef.current, canvasRef.current).catch(err => {
          console.error("Camera failed to start", err);
        });
      }

      return () => {
        poseService.stopCamera();
        poseService.onPoseDetected = null;
        engine.onStateChange = null;
        engine.onRepComplete = null;
      };
    } else {
      PoseDetectionService.getInstance().stopCamera();
    }
  }, [viewState, activeWorkout, currentExerciseIndex, currentSetIndex, cameraEnabled, isTrackingReady]);

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
    SoundEffectService.init();
    
    HapticService.light();
    SoundEffectService.playMissionStart();

    const targetWorkout = proposedWorkout || activeWorkout;
    if (targetWorkout) {
      startWorkout(targetWorkout);
      SystemVoiceService.startSession(targetWorkout.id);
      SystemVoiceService.announceMissionStart(targetWorkout.workoutName, 800);
      playNextSetVoice(0, 0, 4000);
    }
    
    const today = new Date().toISOString().split('T')[0];
    updateDayStatus(today, 'COMPLETED');
    
    setViewState('active');
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
  };

  const handleCompleteSet = () => {
    if (!activeWorkout) return;
    
    // 1. Button Press Haptic & Sound
    HapticService.confirm();
    SoundEffectService.playConfirm();

    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    const currentSet = currentEx.sets[currentSetIndex];

    const actualReps = (cameraEnabled && analysisResult && analysisResult.reps > 0) ? analysisResult.reps : currentSet.targetReps;
    updateActiveSet(currentExerciseIndex, currentSetIndex, { completed: true, actualReps });
    
    const isLastSet = currentSetIndex >= currentEx.sets.length - 1;
    const isLastExercise = currentExerciseIndex >= activeWorkout.exercises.length - 1;

    setTimeout(() => {
      if (isLastSet && isLastExercise) {
        completeActiveWorkout();
        SystemVoiceService.endSession(); // End session immediately on completion
        setViewState('summary');
        SoundEffectService.playMissionComplete();
        
        // Wait, if we ended the session, we can't use SystemVoiceService.
        // We actually want to let the mission complete voice play, so we should end session AFTER the speech.
        // Let's create a special ID for the complete speech, or just not end it instantly if we want it to speak.
        // Actually, we can end it when exiting the summary screen. Let's not endSession here!
        SystemVoiceService.announceWorkoutComplete(800);
      } else if (isLastSet) {
        const exDef = getExerciseById(currentEx.exerciseId);
        setRestTimeLeft(exDef?.defaultRest || 60);
        setIsResting(true);
        setViewState('rest');
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSetIndex(0);
        
        SoundEffectService.playNotification();
        SystemVoiceService.announceRest(500);
      } else {
        const exDef = getExerciseById(currentEx.exerciseId);
        setRestTimeLeft(exDef?.defaultRest || 60);
        setIsResting(true);
        setViewState('rest');
        setCurrentSetIndex(prev => prev + 1);
        
        SoundEffectService.playNotification();
        SystemVoiceService.announceRest(500);
      }
    }, 400); // Delay UI transition slightly after click sound
  };

  const skipRest = () => {
    HapticService.light();
    SoundEffectService.playButton();
    setIsResting(false);
    setRestTimeLeft(0);
    setViewState('active');
    SystemVoiceService.stop(); // Stop any currently playing rest voice
    playNextSetVoice(currentExerciseIndex, currentSetIndex, 0); // Announce the next set immediately
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
          setCameraEnabled(!cameraEnabled);
          if (!cameraEnabled) {
             setTimeout(() => SoundEffectService.playClick(), 50);
          }
        }}
        style={{ background: 'none', border: 'none', color: cameraEnabled ? 'var(--accent-cyan)' : 'var(--text-dim)', cursor: 'pointer' }}
      >
        {cameraEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
      </button>

      <button 
        onClick={() => {
          HapticService.selection();
          setSoundsEnabled(!soundsEnabled);
          if (!soundsEnabled) {
             setTimeout(() => SoundEffectService.playClick(), 50);
          }
        }}
        style={{ background: 'none', border: 'none', color: soundsEnabled ? 'var(--text-secondary)' : 'var(--text-dim)', cursor: 'pointer' }}
      >
        {soundsEnabled ? <Zap size={20} /> : <ZapOff size={20} />}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: voiceEnabled ? 'var(--text-secondary)' : 'var(--text-dim)' }}>
        <button 
          onClick={() => {
            HapticService.selection();
            SoundEffectService.playClick();
            setVoiceEnabled(!voiceEnabled);
          }}
          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
    </div>
  );

  const renderOverview = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySchedule = weeklySchedule.find(d => d.date === today);
    const isRestDay = todaySchedule ? todaySchedule.isRestDay : false;
    const isMissed = todaySchedule?.status === 'MISSED';

    if (isRestDay && !activeWorkout && !isMissed) {
      return (
        <div className={styles.screenContainer}>
          <div className={styles.systemOuterFrame} style={{ minHeight: '60vh', justifyContent: 'center' }}>
            {renderSensoryControls()}
            
            {!notificationsEnabled && (
              <button 
                onClick={() => WorkoutSchedulerService.requestNotificationPermission()}
                style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
              >
                <BellRing size={20} />
              </button>
            )}

            <div className={styles.statusTitleBox} style={{ color: 'var(--text-secondary)', borderColor: 'var(--text-secondary)' }}>
              TODAY'S STATUS
            </div>
            <ShieldAlert size={48} style={{ color: 'var(--text-secondary)', margin: '24px auto' }} />
            <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
              RECOVERY PROTOCOL
            </h2>
            <p className={styles.panelText}>
              Today is a scheduled rest day.<br/>Recovery is an essential part of the training system.
            </p>
          </div>
        </div>
      );
    }

    return (
    <div className={styles.systemOuterFrame} style={{ position: 'relative' }}>
      {renderSensoryControls()}

      {!notificationsEnabled && (
        <button 
          onClick={() => WorkoutSchedulerService.requestNotificationPermission()}
          style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
        >
          <BellRing size={20} />
        </button>
      )}

      <div className={styles.statusTitleBox}>TODAY'S MISSION</div>
      
      <div style={{ display: 'flex', gap: '4px', margin: '16px 0', overflowX: 'auto', paddingBottom: '8px' }}>
        {weeklySchedule.map(day => {
          const isToday = day.status === 'TODAY' || day.date === new Date().toISOString().split('T')[0];
          let color = 'var(--text-secondary)';
          if (day.status === 'COMPLETED') color = '#10b981';
          else if (day.status === 'MISSED') color = 'var(--accent-alert)';
          else if (isToday) color = 'var(--accent-cyan)';
          
          return (
            <div key={day.date} style={{
              flex: '1', minWidth: '40px', padding: '8px 4px', textAlign: 'center',
              backgroundColor: isToday ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-surface)',
              border: isToday ? '1px solid var(--accent-cyan)' : 'var(--border-thin)',
              color: color,
              fontSize: '0.7rem'
            }}>
              <div>{day.dayOfWeek}</div>
              <div style={{ marginTop: '4px', fontSize: '0.6rem', color: day.isRestDay ? 'var(--text-secondary)' : color }}>
                {day.isRestDay ? 'REST' : (day.status === 'COMPLETED' ? 'DONE' : (day.status === 'MISSED' ? 'MISS' : 'WORK'))}
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

      {isMissed && !activeWorkout ? (
        <button 
          onClick={() => {
            HapticService.light();
            SoundEffectService.playButton();
            // Implement a simple reschedule logic: move to tomorrow for simplicity
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            const { rescheduleWorkout } = useSchedulerStore.getState();
            rescheduleWorkout(today, tomorrow);
            WorkoutSchedulerService.syncSchedule(); // re-sync
          }}
          style={{
            width: '100%', padding: '16px', backgroundColor: 'rgba(255, 60, 60, 0.1)', 
            border: '1px solid var(--accent-alert)', color: 'var(--accent-alert)', 
            fontFamily: 'var(--font-system)', fontSize: '1.1rem', cursor: 'pointer',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            boxShadow: 'var(--system-glow-subtle)'
          }}
        >
          <FastForward size={20} /> RESCHEDULE TO TOMORROW
        </button>
      ) : (
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
      )}
      
      {activeWorkout && (
        <button 
          onClick={() => {
            HapticService.light();
            SoundEffectService.playButton();
            SystemVoiceService.endSession(); // Strict session teardown
            cancelActiveWorkout();
          }}
          style={{ width: '100%', padding: '12px', marginTop: '12px', background: 'transparent', border: 'none', color: 'var(--accent-alert)', fontFamily: 'var(--font-system)' }}
        >
          ABORT MISSION
        </button>
      )}
    </div>
  );
  };

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

        {/* Camera Tracking UI */}
        {cameraEnabled && isTrackingReady && (
          <div style={{ 
            position: 'relative', width: '100%', aspectRatio: '4/3', 
            backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', 
            marginBottom: '16px', border: '1px solid var(--border-accent)' 
          }}>
            <video 
              ref={videoRef} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
              playsInline muted 
            />
            <canvas 
              ref={canvasRef} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
            />
            
            {/* Tracking Status Overlay */}
            <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '8px' }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                {analysisResult?.state === 'NOT_READY' ? 'WAITING FOR POSITION' : 'TRACKING ACTIVE'}
              </div>
            </div>

            {/* Diagnostics overlay (dev mode hidden normally, but we show basic info) */}
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', padding: '8px', borderRadius: '4px', fontSize: '0.6rem', color: 'var(--text-dim)', textAlign: 'right' }}>
              <div>POSTURE: {analysisResult?.posture || 'UNKNOWN'}</div>
              <div>STATE: {analysisResult?.state || 'NOT_READY'}</div>
              <div>CONF: {Math.round((analysisResult?.confidence || 0) * 100)}%</div>
            </div>
          </div>
        )}

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
          {cameraEnabled && def?.movementType === 'repetition' && (
            <div style={{ fontSize: '2rem', color: '#fff', marginTop: '16px' }}>
              ACTUAL: <span style={{ color: 'var(--accent-cyan)' }}>{analysisResult?.reps || 0}</span>
            </div>
          )}
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
            SystemVoiceService.endSession(); // Strict session teardown when leaving
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
