import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { useProfileStore } from '../../store/useProfileStore';
import styles from './MainLayout.module.css';

export const MainLayout: React.FC = () => {
  const isCompleted = useProfileStore((state) => state.profile.isCompleted);

  if (!isCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className={styles.layout}>
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};
