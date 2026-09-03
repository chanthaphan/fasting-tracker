import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/app-context';
import { BottomNav } from './components/layout/bottom-nav';
import { ErrorBoundary } from './components/layout/error-boundary';
import { SnapMealFab } from './components/food-log/snap-meal-fab';
import { useTheme } from './hooks/use-theme';

// Each page is its own chunk; the dashboard is the start_url so it loads first
const DashboardPage = lazy(() => import('./components/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })));
const FoodLogPage = lazy(() => import('./components/food-log/food-log-page').then((m) => ({ default: m.FoodLogPage })));
const FastingPage = lazy(() => import('./components/fasting/fasting-page').then((m) => ({ default: m.FastingPage })));
const WeightPage = lazy(() => import('./components/weight/weight-page').then((m) => ({ default: m.WeightPage })));
const ExercisePage = lazy(() => import('./components/exercise/exercise-page').then((m) => ({ default: m.ExercisePage })));
const HistoryPage = lazy(() => import('./components/history/history-page').then((m) => ({ default: m.HistoryPage })));
const CoachPage = lazy(() => import('./components/coach/coach-page').then((m) => ({ default: m.CoachPage })));
const ActiveWorkoutPage = lazy(() => import('./components/workout/active-workout-page').then((m) => ({ default: m.ActiveWorkoutPage })));

/** Applies the saved theme to <html> on every route, not just the dashboard. */
function ThemeEffect() {
  useTheme();
  return null;
}

function PageFallback() {
  return <div className="flex-1" aria-busy="true" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ThemeEffect />
        <div className="flex-1 flex flex-col min-h-0">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/food" element={<FoodLogPage />} />
                <Route path="/fasting" element={<FastingPage />} />
                <Route path="/exercise" element={<ExercisePage />} />
                <Route path="/weight" element={<WeightPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/coach" element={<CoachPage />} />
                <Route path="/workout" element={<ActiveWorkoutPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <SnapMealFab />
          <BottomNav />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
