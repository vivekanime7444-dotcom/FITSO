export type RepState = 
  | 'WAITING_FOR_POSITION'
  | 'READY'
  | 'TOWARD_TARGET'
  | 'TARGET_APPROACHING'
  | 'TARGET_CONFIRMED'
  | 'TOWARD_START'
  | 'START_APPROACHING'
  | 'REP_COMPLETE';

export class RepStateMachine {
  private state: RepState = 'WAITING_FOR_POSITION';
  private stateEntryTime: number = 0;
  
  private config = {
    readyHoldMs: 1000,
    targetHoldMs: 150,
    startHoldMs: 150,
    romThresholdStart: 15,
    romThresholdTarget: 85,
    romTargetConfirm: 90,
    romStartConfirm: 10
  };

  public onRepComplete: (() => void) | null = null;
  public onStateChange: ((state: RepState) => void) | null = null;

  public reset() {
    this.changeState('WAITING_FOR_POSITION');
  }

  public update(isPostureValid: boolean, rom: number | null, now: number): RepState {
    if (!isPostureValid || rom === null) {
      this.changeState('WAITING_FOR_POSITION', now);
      return this.state;
    }

    const timeInState = now - this.stateEntryTime;

    switch (this.state) {
      case 'WAITING_FOR_POSITION':
        if (rom <= this.config.romThresholdStart) {
          this.changeState('READY', now);
        }
        break;

      case 'READY':
      case 'REP_COMPLETE':
        if (rom > this.config.romThresholdStart) {
          if (timeInState >= this.config.readyHoldMs || this.state === 'REP_COMPLETE') {
             this.changeState('TOWARD_TARGET', now);
          } else {
             // Moved before ready hold was complete, reset
             this.changeState('WAITING_FOR_POSITION', now);
          }
        } else {
          // Keep updating entry time if we drop out of the ready zone?
          // No, as long as we are in the ready zone (rom < 15), we accumulate time.
        }
        break;

      case 'TOWARD_TARGET':
        if (rom >= this.config.romThresholdTarget) {
          this.changeState('TARGET_APPROACHING', now);
        } else if (rom <= this.config.romThresholdStart) {
          // Aborted rep
          this.changeState('READY', now);
        }
        break;

      case 'TARGET_APPROACHING':
        if (rom >= this.config.romTargetConfirm) {
          if (timeInState >= this.config.targetHoldMs) {
            this.changeState('TARGET_CONFIRMED', now);
          }
        } else if (rom < this.config.romThresholdTarget) {
          // Didn't hit target deep enough or bounced too early
          this.changeState('TOWARD_TARGET', now);
        }
        break;

      case 'TARGET_CONFIRMED':
        if (rom < this.config.romThresholdTarget) {
          this.changeState('TOWARD_START', now);
        }
        break;

      case 'TOWARD_START':
        if (rom <= this.config.romThresholdStart) {
          this.changeState('START_APPROACHING', now);
        } else if (rom >= this.config.romThresholdTarget) {
          // Reversed back to bottom
          this.changeState('TARGET_APPROACHING', now);
        }
        break;

      case 'START_APPROACHING':
        if (rom <= this.config.romStartConfirm) {
          if (timeInState >= this.config.startHoldMs) {
            if (this.onRepComplete) this.onRepComplete();
            this.changeState('REP_COMPLETE', now);
          }
        } else if (rom > this.config.romThresholdStart) {
          this.changeState('TOWARD_START', now);
        }
        break;
    }

    return this.state;
  }

  private changeState(newState: RepState, now: number = performance.now()) {
    if (this.state !== newState) {
      this.state = newState;
      this.stateEntryTime = now;
      if (this.onStateChange) this.onStateChange(newState);
    }
  }

  public getState(): RepState {
    return this.state;
  }
}
