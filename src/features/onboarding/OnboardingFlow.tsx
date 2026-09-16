import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore, type UserProfile } from '../../store/useProfileStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SelectableCard } from '../../components/ui/SelectableCard';
import { Card } from '../../components/ui/Card';
import { SoundEffectService } from '../workout/SoundEffectService';
import { HapticService } from '../workout/HapticService';
import { ChevronRight, ChevronLeft, Zap, Target, Dumbbell, Calendar, User } from 'lucide-react';
import styles from './Onboarding.module.css';

const STEPS = {
  INTRO: 0,
  PERSONAL_INFO: 1,
  EXPERIENCE: 2,
  GOAL: 3,
  EQUIPMENT: 4,
  SCHEDULE: 5,
  CONFIRMATION: 6
};

export const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { profile: storeProfile, updateProfile, completeOnboarding } = useProfileStore();
  
  const [step, setStep] = useState(STEPS.INTRO);
  
  // Local state to hold profile edits before confirming
  const [localProfile, setLocalProfile] = useState<UserProfile>(storeProfile);

  const nextStep = () => {
    SoundEffectService.playNavClick();
    HapticService.selection();
    setStep((s) => Math.min(s + 1, STEPS.CONFIRMATION));
  };
  
  const prevStep = () => {
    SoundEffectService.playNavClick();
    HapticService.selection();
    setStep((s) => Math.max(s - 1, STEPS.INTRO));
  };

  const updateLocal = (updates: Partial<UserProfile>) => {
    setLocalProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleComplete = () => {
    updateProfile(localProfile);
    completeOnboarding();
    navigate('/');
  };

  // --- Step Components ---

  const renderIntro = () => (
    <div className={`${styles.stepContainer} ${styles.centerContent} animate-fade-in`}>
      <div style={{
          position: 'absolute',
          top: '-18px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#030814',
          border: 'var(--border-thin)',
          padding: '4px 40px',
          fontFamily: 'var(--font-system)',
          fontSize: '1.2rem',
          fontWeight: 600,
          letterSpacing: '4px',
          color: 'var(--text-primary)',
          textShadow: 'var(--system-glow-subtle)',
          boxShadow: '0 0 10px rgba(0,0,0,0.8)'
        }}>SYSTEM</div>
      <div className={styles.systemMessage} style={{marginTop: '40px'}}>
        <span className="typewriter-text" style={{display: 'inline-block'}}>[ You have met all necessary conditions. ]</span>
      </div>
      <h1 className="system-title" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
        SECRET QUEST: COURAGE OF THE WEAK
      </h1>
      <Button onClick={nextStep} variant="primary">ACCEPT</Button>
    </div>
  );

  const renderPersonalInfo = () => {
    const isValid = localProfile.name.trim() !== '' && 
                    localProfile.age !== '' && 
                    localProfile.height !== '' && 
                    localProfile.weight !== '';

    return (
      <div className={`${styles.stepContainer} animate-slide-up`}>
        <div className={styles.header}>
          <User className={styles.headerIcon} />
          <h2 className="system-title">PLAYER STATS</h2>
        </div>
        <div className={styles.formGrid}>
          <Input 
            label="PLAYER NAME" 
            placeholder="Enter display name" 
            value={localProfile.name}
            onChange={(e) => updateLocal({ name: e.target.value })}
          />
          <Input 
            label="AGE" 
            type="number" 
            placeholder="e.g. 25" 
            value={localProfile.age}
            onChange={(e) => updateLocal({ age: e.target.value })}
          />
          <Input 
            label="HEIGHT" 
            type="number" 
            placeholder="e.g. 175" 
            suffix="cm"
            value={localProfile.height}
            onChange={(e) => updateLocal({ height: e.target.value })}
          />
          <Input 
            label="WEIGHT" 
            type="number" 
            placeholder="e.g. 70" 
            suffix="kg"
            value={localProfile.weight}
            onChange={(e) => updateLocal({ weight: e.target.value })}
          />
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={prevStep}><ChevronLeft /> BACK</Button>
          <Button onClick={nextStep} disabled={!isValid}>NEXT <ChevronRight /></Button>
        </div>
      </div>
    );
  };

  const renderExperience = () => {
    const isValid = localProfile.experienceLevel !== '';
    return (
      <div className={`${styles.stepContainer} animate-slide-up`}>
        <div className={styles.header}>
          <Zap className={styles.headerIcon} />
          <h2 className="system-title">CURRENT LEVEL</h2>
        </div>
        <div className={styles.cardsList}>
          <SelectableCard 
            title="BEGINNER"
            subtitle="Starting your journey"
            selected={localProfile.experienceLevel === 'Beginner'}
            onClick={() => updateLocal({ experienceLevel: 'Beginner' })}
          />
          <SelectableCard 
            title="INTERMEDIATE"
            subtitle="Building consistency"
            selected={localProfile.experienceLevel === 'Intermediate'}
            onClick={() => updateLocal({ experienceLevel: 'Intermediate' })}
          />
          <SelectableCard 
            title="ADVANCED"
            subtitle="Pushing your limits"
            selected={localProfile.experienceLevel === 'Advanced'}
            onClick={() => updateLocal({ experienceLevel: 'Advanced' })}
          />
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={prevStep}><ChevronLeft /> BACK</Button>
          <Button onClick={nextStep} disabled={!isValid}>NEXT <ChevronRight /></Button>
        </div>
      </div>
    );
  };

  const [physiqueState, setPhysiqueState] = useState<'IDLE'|'IMAGE_SELECTED'|'VALIDATING_REFERENCE'|'INVALID_REFERENCE'|'IMAGE_QUALITY_LOW'|'VALID_REFERENCE'|'ANALYSIS_COMPLETE'|'ERROR'>('IDLE');
  const [physiqueImage, setPhysiqueImage] = useState<string | null>(null);
  const [physiqueError, setPhysiqueError] = useState<string>('');
  const [physiqueDiagnostic, setPhysiqueDiagnostic] = useState<any>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Compress the image to max 800px width/height to avoid payload limits
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress heavily to ensure small payload (JPEG 0.6)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            setPhysiqueImage(compressedBase64);
            setPhysiqueState('IMAGE_SELECTED');
            HapticService.selection();
          } else {
            // Fallback if canvas fails
            setPhysiqueImage(reader.result as string);
            setPhysiqueState('IMAGE_SELECTED');
            HapticService.selection();
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const validateImage = async () => {
    if (!physiqueImage) return;
    
    setPhysiqueState('VALIDATING_REFERENCE');
    HapticService.selection();
    SoundEffectService.playClick();

    // Import dynamically to avoid top-level issues if needed, or static import at top.
    // Assuming static import will be added to the top of the file
    const { PhysiqueAnalysisService } = await import('../../services/PhysiqueAnalysisService');
    
    const { id, result } = await PhysiqueAnalysisService.analyzeImage(physiqueImage);
    
    setPhysiqueDiagnostic({ id, result });

    if (!result.referenceValid) {
      if (result.imageQuality === 'poor') {
        setPhysiqueState('IMAGE_QUALITY_LOW');
      } else {
        setPhysiqueState('INVALID_REFERENCE');
      }
      setPhysiqueError(result.reason || 'Unable to detect a clear usable physique reference.');
      HapticService.error();
      SoundEffectService.playError();
      return;
    }

    // Valid Reference -> Analysis Complete
    setPhysiqueState('VALID_REFERENCE');
    updateLocal({ 
      physiqueAnalysis: {
        referenceId: id,
        imageQuality: result.imageQuality,
        trainingEmphasis: result.trainingAnalysis?.trainingEmphasis || [],
        muscleGroups: result.trainingAnalysis?.muscleGroups || [],
        recommendedExerciseCategories: result.trainingAnalysis?.recommendedExerciseCategories || []
      }
    });
    
    setTimeout(() => {
       setPhysiqueState('ANALYSIS_COMPLETE');
       HapticService.confirm();
       SoundEffectService.playConfirm();
    }, 1500);
  };

  const resetPhysiqueFlow = () => {
    setPhysiqueImage(null);
    setPhysiqueState('IDLE');
    setPhysiqueError('');
  };

  const renderGoal = () => {
    const isPhysique = localProfile.primaryGoal === 'Physique Goal';
    
    let isValid = localProfile.primaryGoal !== '';
    if (isPhysique && physiqueState !== 'ANALYSIS_COMPLETE') {
      isValid = false;
    }

    const goals = ['Build Muscle', 'Build Strength', 'Improve Endurance', 'General Fitness', 'Physique Goal'] as const;
    
    return (
      <div className={`${styles.stepContainer} animate-slide-up`}>
        <div className={styles.header}>
          <Target className={styles.headerIcon} />
          <h2 className="system-title">PRIMARY QUEST</h2>
        </div>
        
        <div className={styles.cardsList}>
          {goals.map(goal => (
            <SelectableCard 
              key={goal}
              title={goal.toUpperCase()}
              selected={localProfile.primaryGoal === goal}
              onClick={() => {
                updateLocal({ primaryGoal: goal });
                if (goal !== 'Physique Goal') {
                  resetPhysiqueFlow();
                }
              }}
            />
          ))}
        </div>

        {isPhysique && (
          <div style={{ marginTop: '24px', padding: '16px', border: '1px solid var(--accent-cyan)', backgroundColor: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px' }}>
            <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '8px', fontSize: '1rem', letterSpacing: '2px' }}>PHYSIQUE REFERENCE</h3>
            
            {physiqueState === 'IDLE' && (
               <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>Upload a clear training/physique reference image.</p>
                  <label style={{ display: 'block', padding: '12px', textAlign: 'center', border: '1px dashed var(--accent-cyan)', cursor: 'pointer', color: 'var(--accent-cyan)' }}>
                     [ UPLOAD REFERENCE IMAGE ]
                     <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
               </div>
            )}

            {physiqueState === 'IMAGE_SELECTED' && (
              <div>
                <img src={physiqueImage!} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginBottom: '16px', borderRadius: '4px' }} />
                <Button onClick={validateImage} variant="primary" style={{ width: '100%', marginBottom: '8px' }}>ANALYZE IMAGE</Button>
                <Button onClick={resetPhysiqueFlow} variant="ghost" style={{ width: '100%' }}>CANCEL</Button>
              </div>
            )}

            {physiqueState === 'VALIDATING_REFERENCE' && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div className="pulse-anim" style={{ color: 'var(--accent-cyan)', marginBottom: '8px' }}>[ SCANNING IMAGE ]</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Validating physique reference...</p>
              </div>
            )}

            {(physiqueState === 'INVALID_REFERENCE' || physiqueState === 'IMAGE_QUALITY_LOW' || physiqueState === 'ERROR') && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--accent-alert)', marginBottom: '8px', fontWeight: 'bold' }}>REFERENCE REJECTED</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>{physiqueError}</p>
                <Button onClick={resetPhysiqueFlow} variant="outline" style={{ width: '100%', borderColor: 'var(--accent-alert)', color: 'var(--accent-alert)' }}>
                  [ UPLOAD ANOTHER IMAGE ]
                </Button>
              </div>
            )}

            {physiqueState === 'VALID_REFERENCE' && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ color: '#10b981', marginBottom: '8px', fontWeight: 'bold' }}>REFERENCE ACCEPTED</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Extracting training emphasis...</p>
              </div>
            )}

            {physiqueState === 'ANALYSIS_COMPLETE' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#10b981', marginBottom: '8px', fontWeight: 'bold' }}>ANALYSIS COMPLETE</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                  Emphasis: {localProfile.physiqueAnalysis?.trainingEmphasis.join(', ')}
                </p>
                <Button onClick={resetPhysiqueFlow} variant="ghost" style={{ fontSize: '0.8rem' }}>CHANGE IMAGE</Button>
              </div>
            )}

            {/* Development Diagnostics */}
            {physiqueDiagnostic && (
              <details style={{ marginTop: '16px', fontSize: '0.7rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-thin)', paddingTop: '8px' }}>
                <summary style={{ cursor: 'pointer' }}>DEV DIAGNOSTICS</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', overflowX: 'auto' }}>
                  {JSON.stringify(physiqueDiagnostic, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="ghost" onClick={prevStep}><ChevronLeft /> BACK</Button>
          <Button onClick={nextStep} disabled={!isValid}>NEXT <ChevronRight /></Button>
        </div>
      </div>
    );
  };

  const renderEquipment = () => {
    const equipmentOptions = ['No Equipment', 'Pull-up Bar', 'Dumbbells', 'Barbell'] as const;
    const isValid = localProfile.equipment.length > 0;

    const toggleEq = (eq: any) => {
      let newEq = [...localProfile.equipment];
      if (newEq.includes(eq)) {
        newEq = newEq.filter(e => e !== eq);
      } else {
        newEq.push(eq);
      }
      // If "No Equipment" is selected, clear others
      if (eq === 'No Equipment') {
        newEq = ['No Equipment'];
      } else if (eq !== 'No Equipment' && newEq.includes('No Equipment')) {
        newEq = newEq.filter(e => e !== 'No Equipment');
      }
      updateLocal({ equipment: newEq });
    };

    return (
      <div className={`${styles.stepContainer} animate-slide-up`}>
        <div className={styles.header}>
          <Dumbbell className={styles.headerIcon} />
          <h2 className="system-title">AVAILABLE INVENTORY</h2>
        </div>
        <div className={styles.cardsGrid}>
          {equipmentOptions.map(eq => (
            <SelectableCard 
              key={eq}
              title={eq.toUpperCase()}
              selected={localProfile.equipment.includes(eq)}
              onClick={() => toggleEq(eq)}
            />
          ))}
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={prevStep}><ChevronLeft /> BACK</Button>
          <Button onClick={nextStep} disabled={!isValid}>NEXT <ChevronRight /></Button>
        </div>
      </div>
    );
  };

    const renderSchedule = () => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
    const isValid = localProfile.trainingDays.length > 0 && localProfile.preferredWorkoutTime !== '';

    const toggleDay = (day: any) => {
      let newDays = [...localProfile.trainingDays];
      if (newDays.includes(day)) {
        newDays = newDays.filter(d => d !== day);
      } else {
        newDays.push(day);
      }
      updateLocal({ trainingDays: newDays, trainingDaysCount: newDays.length.toString() });
    };

    return (
      <div className={`${styles.stepContainer} animate-slide-up`}>
        <div className={styles.header}>
          <Calendar className={styles.headerIcon} />
          <h2 className="system-title">TRAINING SCHEDULE</h2>
        </div>
        
        <div className={styles.sectionTitle}>SELECT DAYS</div>
        <div className={styles.daysGrid}>
          {days.map(day => (
            <div 
              key={day} 
              className={`${styles.dayCircle} ${localProfile.trainingDays.includes(day) ? styles.dayActive : ''}`}
              onClick={() => toggleDay(day)}
            >
              {day}
            </div>
          ))}
        </div>

        <div className={styles.sectionTitle} style={{ marginTop: '24px' }}>PREFERRED TIME</div>
        <div style={{ marginBottom: '32px' }}>
          <Input 
            type="time" 
            value={localProfile.preferredWorkoutTime || '07:00'}
            onChange={(e) => updateLocal({ preferredWorkoutTime: e.target.value })}
            style={{ fontSize: '1.5rem', textAlign: 'center' }}
          />
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={prevStep}><ChevronLeft /> BACK</Button>
          <Button onClick={nextStep} disabled={!isValid}>NEXT <ChevronRight /></Button>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    return (
      <div className={`${styles.stepContainer} animate-slide-up`}>
        <h2 className="system-title" style={{ textAlign: 'center', marginBottom: '24px' }}>
          PLAYER PROFILE
        </h2>
        
        <Card glow className={styles.summaryCard}>
          <div className={styles.summarySection}>
            <h3>PLAYER</h3>
            <p>Name: <span className={styles.highlight}>{localProfile.name}</span></p>
            <p>Age: <span className={styles.highlight}>{localProfile.age}</span></p>
            <p>Height: <span className={styles.highlight}>{localProfile.height} cm</span></p>
            <p>Weight: <span className={styles.highlight}>{localProfile.weight} kg</span></p>
          </div>
          
          <div className={styles.summarySection}>
            <h3>EXPERIENCE</h3>
            <p className={styles.highlight}>{localProfile.experienceLevel}</p>
          </div>

          <div className={styles.summarySection}>
            <h3>PRIMARY GOAL</h3>
            <p className={styles.highlight}>{localProfile.primaryGoal}</p>
          </div>

          <div className={styles.summarySection}>
            <h3>EQUIPMENT</h3>
            <p className={styles.highlight}>{localProfile.equipment.join(', ')}</p>
          </div>

          <div className={styles.summarySection}>
            <h3>TRAINING</h3>
            <p><span className={styles.highlight}>{localProfile.trainingDays.length} days/week</span></p>
            <p>Preferred Time: <span className={styles.highlight}>{localProfile.preferredWorkoutTime}</span></p>
          </div>
        </Card>

        <div className={styles.footer} style={{ justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
          <Button variant="outline" onClick={() => setStep(STEPS.PERSONAL_INFO)}>EDIT</Button>
          <Button variant="primary" onClick={handleComplete}>CREATE PLAYER</Button>
        </div>
      </div>
    );
  };

  const steps = [
    renderIntro,
    renderPersonalInfo,
    renderExperience,
    renderGoal,
    renderEquipment,
    renderSchedule,
    renderConfirmation
  ];

  return (
    <div className={styles.onboardingLayout}>
      {step > STEPS.INTRO && step < STEPS.CONFIRMATION && (
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${((step) / (STEPS.CONFIRMATION - 1)) * 100}%` }} 
          />
        </div>
      )}
      <div className={styles.stepWrapper}>
        {steps[step]()}
      </div>
    </div>
  );
};
