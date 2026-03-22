import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/app-context';
import { BottomNav } from './components/layout/bottom-nav';
import { DashboardPage } from './components/dashboard/dashboard-page';
import { FoodLogPage } from './components/food-log/food-log-page';
import { FastingPage } from './components/fasting/fasting-page';
import { HistoryPage } from './components/history/history-page';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="flex-1 flex flex-col min-h-0">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/food" element={<FoodLogPage />} />
            <Route path="/fasting" element={<FastingPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
          <BottomNav />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
