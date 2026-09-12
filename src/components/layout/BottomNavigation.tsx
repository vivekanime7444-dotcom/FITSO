import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Activity, User } from 'lucide-react';
import { SoundEffectService } from '../../features/workout/SoundEffectService';
import { HapticService } from '../../features/workout/HapticService';
import styles from './BottomNavigation.module.css';

export const BottomNavigation: React.FC = () => {
  const playNavSound = () => {
    SoundEffectService.playNavClick();
    HapticService.selection();
  };

  return (
    <div className={styles.navContainer}>
      <NavLink 
        to="/" 
        onClick={playNavSound}
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <Home size={24} />
        <span className={styles.label}>HOME</span>
      </NavLink>
      
      <NavLink 
        to="/workout" 
        onClick={playNavSound}
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <Dumbbell size={24} />
        <span className={styles.label}>WORKOUT</span>
      </NavLink>

      <NavLink 
        to="/progress" 
        onClick={playNavSound}
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <Activity size={24} />
        <span className={styles.label}>PROGRESS</span>
      </NavLink>

      <NavLink 
        to="/profile" 
        onClick={playNavSound}
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <User size={24} />
        <span className={styles.label}>PROFILE</span>
      </NavLink>
    </div>
  );
};
