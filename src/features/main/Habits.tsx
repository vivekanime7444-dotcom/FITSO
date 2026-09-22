import React, { useState } from 'react';
import { useHabitStore, getLocalISOString, getStartOfWeek, type Habit } from '../../store/useHabitStore';
import { HapticService } from '../workout/HapticService';
import { SoundEffectService } from '../workout/SoundEffectService';
import { SystemVoiceService } from '../workout/SystemVoiceService';
import { Plus, Check, Undo2, X, Activity, Calendar as CalendarIcon, Target } from 'lucide-react';
import styles from './MainScreens.module.css';

export const Habits: React.FC = () => {
  const { addHabit, updateHabit, deleteHabit, toggleCompletion, getHabitStats, getTodayHabits, completions } = useHabitStore();
  
  const [view, setView] = useState<'LIST' | 'CREATE' | 'EDIT' | 'HISTORY'>('LIST');
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [reminderTime, setReminderTime] = useState('');

  const handleToggle = (habit: Habit, completed: boolean) => {
    HapticService.selection();
    SoundEffectService.playClick();

    const targetDate = habit.frequency === 'DAILY' ? getLocalISOString() : getStartOfWeek();
    toggleCompletion(habit.id, targetDate);

    if (!completed) {
      setTimeout(() => {
        HapticService.confirm();
        SoundEffectService.playNotification();
        SystemVoiceService.announceCustom("Habit completed.", 200);
      }, 150);
    }
  };

  const openCreate = () => {
    setName('');
    setDescription('');
    setFrequency('DAILY');
    setWeeklyTarget(3);
    setReminderTime('');
    setView('CREATE');
  };

  const openEdit = (habit: Habit) => {
    setSelectedHabit(habit);
    setName(habit.name);
    setDescription(habit.description || '');
    setFrequency(habit.frequency);
    setWeeklyTarget(habit.weeklyTarget || 3);
    setReminderTime(habit.reminderTime || '');
    setView('EDIT');
  };

  const openHistory = (habit: Habit) => {
    setSelectedHabit(habit);
    setView('HISTORY');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    HapticService.confirm();
    
    if (view === 'CREATE') {
      addHabit({
        name,
        description,
        frequency,
        weeklyTarget: frequency === 'WEEKLY' ? weeklyTarget : undefined,
        reminderTime: reminderTime || undefined,
      });
    } else if (view === 'EDIT' && selectedHabit) {
      updateHabit(selectedHabit.id, {
        name,
        description,
        frequency,
        weeklyTarget: frequency === 'WEEKLY' ? weeklyTarget : undefined,
        reminderTime: reminderTime || undefined,
      });
    }
    
    setView('LIST');
  };

  const handleDelete = () => {
    if (selectedHabit && window.confirm("Are you sure you want to delete this habit? All history will be lost.")) {
      HapticService.light();
      deleteHabit(selectedHabit.id);
      setView('LIST');
    }
  };

  if (view === 'CREATE' || view === 'EDIT') {
    return (
      <div className={styles.screenContainer}>
        <div className={styles.systemOuterFrame}>
          <div className={styles.statusTitleBox}>
            {view === 'CREATE' ? 'CREATE HABIT' : 'EDIT HABIT'}
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div className={styles.labelDim} style={{ marginBottom: '8px' }}>HABIT NAME</div>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-thin)', color: '#fff' }}
                placeholder="e.g. Morning Stretch"
              />
            </div>

            <div>
              <div className={styles.labelDim} style={{ marginBottom: '8px' }}>DESCRIPTION (OPTIONAL)</div>
              <input 
                type="text" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-thin)', color: '#fff' }}
              />
            </div>

            <div>
              <div className={styles.labelDim} style={{ marginBottom: '8px' }}>FREQUENCY</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => { HapticService.light(); setFrequency('DAILY'); }}
                  style={{ flex: 1, padding: '12px', border: frequency === 'DAILY' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-thin)', background: frequency === 'DAILY' ? 'rgba(0, 240, 255, 0.1)' : 'transparent', color: frequency === 'DAILY' ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}
                >
                  DAILY
                </button>
                <button 
                  onClick={() => { HapticService.light(); setFrequency('WEEKLY'); }}
                  style={{ flex: 1, padding: '12px', border: frequency === 'WEEKLY' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-thin)', background: frequency === 'WEEKLY' ? 'rgba(0, 240, 255, 0.1)' : 'transparent', color: frequency === 'WEEKLY' ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}
                >
                  WEEKLY
                </button>
              </div>
            </div>

            {frequency === 'WEEKLY' && (
              <div>
                <div className={styles.labelDim} style={{ marginBottom: '8px' }}>WEEKLY TARGET</div>
                <input 
                  type="number" 
                  min="1" 
                  max="7"
                  value={weeklyTarget} 
                  onChange={e => setWeeklyTarget(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-thin)', color: '#fff' }}
                />
              </div>
            )}

            <div>
              <div className={styles.labelDim} style={{ marginBottom: '8px' }}>REMINDER TIME (OPTIONAL)</div>
              <input 
                type="time" 
                value={reminderTime} 
                onChange={e => setReminderTime(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-thin)', color: '#fff' }}
              />
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setView('LIST')}
                style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--text-secondary)' }}
              >
                CANCEL
              </button>
              <button 
                onClick={handleSave}
                style={{ flex: 1, padding: '16px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <Check size={18} /> SAVE HABIT
              </button>
            </div>

            {view === 'EDIT' && (
              <button 
                onClick={handleDelete}
                style={{ width: '100%', padding: '16px', marginTop: '16px', background: 'transparent', border: '1px solid var(--accent-alert)', color: 'var(--accent-alert)' }}
              >
                DELETE HABIT
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'HISTORY' && selectedHabit) {
    const stats = getHabitStats(selectedHabit.id);
    const recentCompletions = completions
      .filter(c => c.habitId === selectedHabit.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return (
      <div className={styles.screenContainer}>
        <div className={styles.systemOuterFrame}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className={styles.statusTitleBox} style={{ margin: 0 }}>HABIT HISTORY</div>
            <button onClick={() => setView('LIST')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
              <X size={24} />
            </button>
          </div>

          <h2 className="system-title" style={{ fontSize: '1.5rem', marginBottom: '8px', textAlign: 'center' }}>
            {selectedHabit.name}
          </h2>
          <div className={styles.labelDim} style={{ textAlign: 'center', marginBottom: '24px' }}>
            {selectedHabit.frequency}
          </div>

          <div className={styles.statsGrid} style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '24px' }}>
            <div className={styles.statItem} style={{ flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
              <span className={styles.statName}>CURRENT STREAK</span>
              <span className={styles.statValue} style={{ fontSize: '2rem', color: 'var(--accent-cyan)' }}>{stats.currentStreak}</span>
            </div>
            <div className={styles.statItem} style={{ flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
              <span className={styles.statName}>BEST STREAK</span>
              <span className={styles.statValue} style={{ fontSize: '2rem' }}>{stats.bestStreak}</span>
            </div>
          </div>
          
          <div className={styles.statItem} style={{ justifyContent: 'space-between', padding: '16px', marginBottom: '32px' }}>
             <span className={styles.statName}>TOTAL COMPLETIONS:</span>
             <span className={styles.statValue}>{stats.totalCompletions}</span>
          </div>

          <div className={styles.labelDim} style={{ marginBottom: '16px' }}>RECENT HISTORY</div>
          {recentCompletions.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-surface)' }}>
              NO HISTORY AVAILABLE
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentCompletions.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-surface)', borderLeft: '2px solid var(--accent-cyan)' }}>
                  <span style={{ color: '#fff' }}>{new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span style={{ color: 'var(--accent-cyan)' }}><Check size={18} /></span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
            <button 
              onClick={() => openEdit(selectedHabit)}
              style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--text-primary)' }}
            >
              EDIT HABIT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  const todayHabits = getTodayHabits();

  return (
    <div className={styles.screenContainer}>
      <div className={styles.systemOuterFrame} style={{ paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div className={styles.statusTitleBox} style={{ margin: 0 }}>PROTOCOL TRACKER</div>
          <button 
            onClick={openCreate}
            style={{ background: 'none', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '8px', borderRadius: '4px' }}
          >
            <Plus size={20} />
          </button>
        </div>

        {todayHabits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-thin)', marginTop: '24px' }}>
            <Target size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px' }} />
            <h3 style={{ color: '#fff', marginBottom: '8px' }}>NO ACTIVE HABITS</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>Create your first habit to begin your protocol.</p>
            <button 
              onClick={openCreate}
              style={{ padding: '12px 24px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}
            >
              CREATE HABIT
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {todayHabits.map(({ habit, completed, currentCount }) => {
              const stats = getHabitStats(habit.id);
              
              return (
                <div key={habit.id} style={{ 
                  padding: '16px', 
                  background: 'var(--bg-surface)', 
                  borderLeft: completed ? '3px solid #10b981' : '3px solid var(--accent-cyan)',
                  opacity: completed ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openHistory(habit)}>
                    <div style={{ fontSize: '1.1rem', color: completed ? '#10b981' : '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {habit.name}
                      {completed && <Check size={16} />}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>{habit.frequency}</span>
                      {habit.frequency === 'DAILY' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                           <Activity size={12} /> STREAK: {stats.currentStreak}
                        </span>
                      )}
                      {habit.frequency === 'WEEKLY' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                           <CalendarIcon size={12} /> {currentCount} / {habit.weeklyTarget}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleToggle(habit, completed)}
                    style={{ 
                      width: '48px', height: '48px', 
                      borderRadius: '50%', 
                      background: completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 240, 255, 0.05)',
                      border: completed ? '1px solid #10b981' : '1px solid var(--accent-cyan)',
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      color: completed ? '#10b981' : 'var(--accent-cyan)'
                    }}
                  >
                    {completed ? <Undo2 size={20} /> : <Check size={24} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
