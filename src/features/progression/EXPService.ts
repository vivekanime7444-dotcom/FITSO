import { useEXPStore, type EXPSourceType, type EXPTransaction } from '../../store/useEXPStore';
import { SystemVoiceService } from '../workout/SystemVoiceService';
import { HapticService } from '../workout/HapticService';

export const EXP_REWARDS = {
  WORKOUT_COMPLETE: 100,
  HABIT_COMPLETE: 10,
};

export class EXPService {
  
  // Calculate total EXP required to REACH a specific level
  // Level 1: 0
  // Level 2: 100
  // Level 3: 250
  // Level 4: 450
  public static getEXPRequiredForLevel(level: number): number {
    if (level <= 1) return 0;
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += 50 + (i * 50); // L1->L2 = 100, L2->L3 = 150, L3->L4 = 200
    }
    return total;
  }

  public static calculateLevelFromEXP(totalEXP: number): number {
    let level = 1;
    while (this.getEXPRequiredForLevel(level + 1) <= totalEXP) {
      level++;
    }
    return level;
  }

  public static getEXPProgress() {
    const { totalEXP, currentLevel } = useEXPStore.getState();
    const currentLevelBaseEXP = this.getEXPRequiredForLevel(currentLevel);
    const nextLevelBaseEXP = this.getEXPRequiredForLevel(currentLevel + 1);
    
    const expIntoCurrentLevel = totalEXP - currentLevelBaseEXP;
    const expNeededForNextLevel = nextLevelBaseEXP - currentLevelBaseEXP;
    const progressPercentage = Math.min(100, Math.max(0, (expIntoCurrentLevel / expNeededForNextLevel) * 100));
    
    return {
      currentLevel,
      totalEXP,
      expIntoCurrentLevel,
      expNeededForNextLevel,
      expToNextLevel: nextLevelBaseEXP - totalEXP,
      progressPercentage
    };
  }

  private static hasRewardBeenGranted(sourceType: EXPSourceType, sourceId: string): boolean {
    const { transactions } = useEXPStore.getState();
    return transactions.some(t => t.sourceType === sourceType && t.sourceId === sourceId);
  }

  private static awardEXP(sourceType: EXPSourceType, sourceId: string, amount: number, reason: string) {
    if (this.hasRewardBeenGranted(sourceType, sourceId)) {
      console.log(`[EXPService] Duplicate reward blocked for ${sourceType}:${sourceId}`);
      return;
    }

    const store = useEXPStore.getState();
    const newTotal = store.totalEXP + amount;
    const newLevel = this.calculateLevelFromEXP(newTotal);
    
    const tx: EXPTransaction = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sourceType,
      sourceId,
      amount,
      reason,
      createdAt: new Date().toISOString()
    };

    store._addTransaction(tx, newTotal, newLevel);

    console.log(`[EXPService] Awarded +${amount} EXP for ${reason}`);

    // Check for level up
    if (newLevel > store.currentLevel) {
      // Level Up!
      SystemVoiceService.announceCustom("Level up confirmed. New player level achieved.");
      HapticService.success();
      console.log(`[EXPService] LEVEL UP! Now Level ${newLevel}`);
    } else {
      // Just normal EXP
      if (sourceType === 'WORKOUT') {
         SystemVoiceService.announceCustom("Mission complete. EXP acquired.");
      } else if (sourceType === 'HABIT') {
         SystemVoiceService.announceCustom("Habit completed. EXP acquired.");
      }
      HapticService.success();
    }
  }

  public static awardWorkoutEXP(workoutSessionId: string, workoutName: string) {
    this.awardEXP('WORKOUT', `workout:${workoutSessionId}`, EXP_REWARDS.WORKOUT_COMPLETE, `Completed ${workoutName}`);
  }

  public static awardHabitEXP(habitId: string, date: string, habitName: string) {
    this.awardEXP('HABIT', `habit:${habitId}:${date}`, EXP_REWARDS.HABIT_COMPLETE, `Completed Habit: ${habitName}`);
  }
}
