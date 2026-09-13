import React, { useEffect, useState } from 'react';
import { useNutritionStore, type Meal } from '../../store/useNutritionStore';
import { CameraScanner } from './CameraScanner';
import { Camera, Utensils, Trash2, CheckCircle2 } from 'lucide-react';
import { HapticService } from '../workout/HapticService';
import styles from './MainScreens.module.css';

export const Nutrition: React.FC = () => {
  const { dailyNutrition, calorieGoal, proteinGoal, initializeToday, removeMeal } = useNutritionStore();
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    initializeToday();
  }, [initializeToday]);

  if (isScanning) {
    return <CameraScanner onClose={() => setIsScanning(false)} />;
  }

  const totals = dailyNutrition?.dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const meals = dailyNutrition?.meals || [];
  
  const calPercent = Math.min((totals.calories / calorieGoal) * 100, 100);
  const proPercent = Math.min((totals.protein / proteinGoal) * 100, 100);

  const getMealIcon = () => {
    return <Utensils size={18} style={{ color: 'var(--text-secondary)' }} />;
  };

  return (
    <div className={styles.screenContainer} style={{ paddingBottom: '120px' }}>
      <div className={styles.systemOuterFrame}>
        <div className={styles.statusTitleBox}>DAILY NUTRITION</div>
        
        {/* MACROS RING / BARS */}
        <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>ENERGY (KCAL)</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{Math.round(totals.calories)} / {calorieGoal}</span>
            </div>
            <div style={{ width: '100%', height: '12px', background: 'var(--surface-bg)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${calPercent}%`, height: '100%', background: 'var(--accent-cyan)', boxShadow: '0 0 10px var(--accent-cyan)' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>PROTEIN (G)</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{Math.round(totals.protein)} / {proteinGoal}</span>
            </div>
            <div style={{ width: '100%', height: '12px', background: 'var(--surface-bg)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${proPercent}%`, height: '100%', background: '#ff3366', boxShadow: '0 0 10px #ff3366' }} />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
             <div style={{ background: 'var(--surface-bg)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '4px' }}>CARBS</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: '#ffcc00' }}>{Math.round(totals.carbs)}g</div>
             </div>
             <div style={{ background: 'var(--surface-bg)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '4px' }}>FAT</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: '#cc33ff' }}>{Math.round(totals.fat)}g</div>
             </div>
          </div>
        </div>
      </div>

      {/* MEAL TIMELINE */}
      <div className={styles.systemOuterFrame}>
        <div className={styles.statusTitleBox}>MEAL LOG</div>
        
        {meals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
             <Utensils size={32} style={{ opacity: 0.5, marginBottom: '16px' }} />
             <div>NO MEALS DETECTED TODAY</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {meals.sort((a, b) => b.timestamp - a.timestamp).map((meal: Meal) => (
              <div key={meal.id} style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {getMealIcon()} {meal.type}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: '8px' }}>
                        {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button onClick={() => { HapticService.selection(); removeMeal(meal.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-alert)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {meal.items.map((item, idx) => (
                     <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{item.estimatedPortion}</span>
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          <div style={{ color: 'var(--text-primary)' }}>{Math.round(item.calories)} kcal</div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{item.confidence === 'HIGH' ? <CheckCircle2 size={10} style={{display:'inline', color:'#10b981'}}/> : ''} P:{Math.round(item.protein)} C:{Math.round(item.carbs)} F:{Math.round(item.fat)}</div>
                        </div>
                     </div>
                   ))}
                 </div>
                 
                 <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                    <span>TOTAL</span>
                    <span>{Math.round(meal.totalCalories)} KCAL</span>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB SCANNER */}
      <button 
        onClick={() => { HapticService.selection(); setIsScanning(true); }}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '64px',
          height: '64px',
          borderRadius: '32px',
          background: 'var(--accent-cyan)',
          color: '#000',
          border: 'none',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        <Camera size={32} />
      </button>
    </div>
  );
};
