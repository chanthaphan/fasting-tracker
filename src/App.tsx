import { lazy, Suspense } from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/app-context';
import { useAppState } from './context/use-app-state';
import { BottomNav } from './components/layout/bottom-nav';
import { ErrorBoundary } from './components/layout/error-boundary';
import { SnapMealFab } from './components/food-log/snap-meal-fab';
import { UpdateToast } from './components/layout/update-toast';
import { useTheme } from './hooks/use-theme';
import { useMedicationReminders } from './hooks/use-medication-reminders';
import { IS_ARTIFACT } from './utils/artifact';

// Each page is its own chunk; the dashboard is the start_url so it loads first
const DashboardPage = lazy(() => import('./components/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })));
const FoodLogPage = lazy(() => import('./components/food-log/food-log-page').then((m) => ({ default: m.FoodLogPage })));
const FastingPage = lazy(() => import('./components/fasting/fasting-page').then((m) => ({ default: m.FastingPage })));
const WeightPage = lazy(() => import('./components/weight/weight-page').then((m) => ({ default: m.WeightPage })));
const ExercisePage = lazy(() => import('./components/exercise/exercise-page').then((m) => ({ default: m.ExercisePage })));
const HistoryPage = lazy(() => import('./components/history/history-page').then((m) => ({ default: m.HistoryPage })));
const CoachPage = lazy(() => import('./components/coach/coach-page').then((m) => ({ default: m.CoachPage })));
const ActiveWorkoutPage = lazy(() => import('./components/workout/active-workout-page').then((m) => ({ default: m.ActiveWorkoutPage })));
const AdultHomePage = lazy(() => import('./components/adult/adult-home-page').then((m) => ({ default: m.AdultHomePage })));
const MedicinePage = lazy(() => import('./components/medicine/medicine-page').then((m) => ({ default: m.MedicinePage })));
const BloodPressurePage = lazy(() => import('./components/blood-pressure/blood-pressure-page').then((m) => ({ default: m.BloodPressurePage })));
const AssistantPage = lazy(() => import('./components/adult/assistant-page').then((m) => ({ default: m.AssistantPage })));

/** Applies the saved theme to <html> on every route, not just the dashboard. */
function ThemeEffect() {
  useTheme();
  return null;
}

/** Medicine reminders run app-wide, whichever page is open. */
function ReminderEffect() {
  useMedicationReminders();
  return null;
}

function PageFallback() {
  return <div className="flex-1" aria-busy="true" />;
}

/**
 * The route table depends on the app mode: the adult (ผู้ใหญ่) mode has a
 * simplified home plus food, weight and medicine, and sends every other
 * path home; the standard mode has everything, including the health pair
 * (pills and blood pressure).
 */
function ModeRoutes() {
  const { state } = useAppState();
  if (state.appMode === 'adult') {
    return (
      <Routes>
        <Route path="/" element={<AdultHomePage />} />
        <Route path="/food" element={<FoodLogPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/medicine" element={<MedicinePage />} />
        {!IS_ARTIFACT && <Route path="/assistant" element={<AssistantPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/food" element={<FoodLogPage />} />
      <Route path="/fasting" element={<FastingPage />} />
      <Route path="/exercise" element={<ExercisePage />} />
      <Route path="/weight" element={<WeightPage />} />
      <Route path="/medicine" element={<MedicinePage />} />
      <Route path="/blood-pressure" element={<BloodPressurePage />} />
      <Route path="/history" element={<HistoryPage />} />
      {!IS_ARTIFACT && <Route path="/coach" element={<CoachPage />} />}
      <Route path="/workout" element={<ActiveWorkoutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** A Claude Artifact has no URL path of its own to route on, so it keeps the route in memory. */
const Router = IS_ARTIFACT ? MemoryRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <AppProvider>
        <ThemeEffect />
        <ReminderEffect />
        <div className="flex-1 flex flex-col min-h-0">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <ModeRoutes />
            </Suspense>
          </ErrorBoundary>
          {!IS_ARTIFACT && <SnapMealFab />}
          <UpdateToast />
          <BottomNav />
        </div>
      </AppProvider>
    </Router>
  );
}
