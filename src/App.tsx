import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { Home } from './features/main/Home';
import { Workout } from './features/main/Workout';
import { Nutrition } from './features/main/Nutrition';
import { Profile } from './features/main/Profile';
import { Activity } from './features/main/Activity';
import { DevActivity } from './features/main/DevActivity';
import { WorkoutSchedulerService } from './features/workout/WorkoutSchedulerService';
import { StepTrackingService } from './features/workout/StepTrackingService';
import { useActivityStore } from './store/useActivityStore';

const App: React.FC = () => {
  React.useEffect(() => {
    WorkoutSchedulerService.initialize();
    StepTrackingService.initialize();
    
    // We can't request notifications on mount without interaction in modern browsers,
    // so we'll wait for the user to interact with the scheduling UI later,
    // or we can request it if they interact with the profile page.

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        StepTrackingService.sync();
        useActivityStore.getState().checkRollover(StepTrackingService.source);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/onboarding" 
          element={<OnboardingFlow />} 
        />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="workout" element={<Workout />} />
          <Route path="activity" element={<Activity />} />
          <Route path="dev-activity" element={<DevActivity />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
