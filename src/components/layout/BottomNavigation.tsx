import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Activity, User } from 'lucide-react';
import styles from './BottomNavigation.module.css';

export const BottomNavigation: React.FC = () => {
  return (
    <div className={styles.navContainer}>
      <NavLink 
        to="/" 
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <Home size={24} />
        <span className={styles.label}>HOME</span>
      </NavLink>
      
      <NavLink 
        to="/workout" 
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <Dumbbell size={24} />
        <span className={styles.label}>WORKOUT</span>
      </NavLink>

      <NavLink 
        to="/progress" 
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <Activity size={24} />
        <span className={styles.label}>PROGRESS</span>
      </NavLink>

      <NavLink 
        to="/profile" 
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <User size={24} />
        <span className={styles.label}>PROFILE</span>
      </NavLink>
    </div>
  );
};
