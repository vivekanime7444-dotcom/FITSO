import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProfileStore } from './store/useProfileStore';
import { MainLayout } from './components/layout/MainLayout';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { Home } from './features/main/Home';
import { Workout } from './features/main/Workout';
import { Progress } from './features/main/Progress';
import { Profile } from './features/main/Profile';

const App: React.FC = () => {
  const isCompleted = useProfileStore((state) => state.profile.isCompleted);

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
          <Route path="progress" element={<Progress />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
