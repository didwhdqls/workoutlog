import { useEffect } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DialogHost } from './components/Dialog';
import { Icon, type IconName } from './components/Icon';
import { RestTimer } from './components/RestTimer';
import { unlockAudio } from './lib/sound';
import { ActiveTime, ActiveWorkout } from './pages/ActiveWorkout';
import { ExerciseDetail, Library, VariantDetail } from './pages/Exercises';
import { History, WorkoutDetail } from './pages/History';
import { Home } from './pages/Home';
import { RoutineEdit, Routines } from './pages/Routines';
import { Settings } from './pages/Settings';
import { Stats } from './pages/Stats';
import { WorkoutEdit } from './pages/WorkoutEdit';
import { useStore } from './store';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/routines', label: '루틴', icon: 'list' },
  { to: '/exercises', label: '운동', icon: 'dumbbell' },
  { to: '/history', label: '기록', icon: 'calendar' },
  { to: '/stats', label: '통계', icon: 'chart' },
];

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = useStore((s) => s.active);
  const onWorkout = location.pathname === '/workout';
  const showLiveBar = !!active && !onWorkout;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // 앱 어디든 탭하면 알림음 오디오를 깨워 둠 (폰이 잠시 쉬게 한 오디오도 다시 살림)
  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio, { passive: true });
    return () => document.removeEventListener('pointerdown', unlockAudio);
  }, []);

  return (
    <div className={'app' + (showLiveBar ? ' has-bar' : '')}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workout" element={<ActiveWorkout />} />
        <Route path="/routines" element={<Routines />} />
        <Route path="/routines/:id" element={<RoutineEdit />} />
        <Route path="/exercises" element={<Library />} />
        <Route path="/exercises/:id" element={<ExerciseDetail />} />
        <Route path="/exercises/:id/v/:vid" element={<VariantDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<WorkoutDetail />} />
        <Route path="/history/:id/edit" element={<WorkoutEdit />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>

      {showLiveBar && (
        <div className="live-bar">
          <button className="live-bar-inner" onClick={() => navigate('/workout')}>
            <span className="live-dot" />
            <span className="grow ellipsis" style={{ fontWeight: 700 }}>
              {active.name}
            </span>
            <span className="small" style={{ opacity: 0.9 }}>
              <ActiveTime w={active} />
            </span>
            <Icon name="up" size={18} />
          </button>
        </div>
      )}

      <RestTimer overTab={!onWorkout} />
      <DialogHost />

      {!onWorkout && (
        <nav className="tabbar">
          <div className="tabbar-inner">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.to === '/'}>
                <Icon name={t.icon} size={23} />
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Shell />
    </HashRouter>
  );
}
