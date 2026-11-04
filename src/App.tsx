import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import AppShell from './components/templates/AppShell';
import Spinner from './components/atoms/Spinner';
import AuthGate from './components/templates/AuthGate';
import { ArchiveProvider } from './state/archive';
import { AuthProvider } from './state/auth';
import { MetaProvider } from './state/meta';
import { PreviewProvider } from './state/preview';
import { SettingsProvider } from './state/settings';
import { ToastProvider } from './state/toast';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Files = lazy(() => import('./pages/Files'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Cleanup = lazy(() => import('./pages/Cleanup'));
const Sorter = lazy(() => import('./pages/Sorter'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Activity = lazy(() => import('./pages/Activity'));
const System = lazy(() => import('./pages/System'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Loading = () => (
  <div className="flex justify-center py-32 text-accent">
    <Spinner className="h-8 w-8" />
  </div>
);

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthGate>
        <ArchiveProvider>
          <MetaProvider>
            <HashRouter>
              <PreviewProvider>
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route element={<AppShell />}>
                      <Route index element={<Dashboard />} />
                      <Route path="files" element={<Files />} />
                      <Route path="gallery" element={<Gallery />} />
                      <Route path="cleanup" element={<Cleanup />} />
                      <Route path="sort" element={<Sorter />} />
                      <Route path="favorites" element={<Favorites />} />
                      <Route path="activity" element={<Activity />} />
                      <Route path="system" element={<System />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </Suspense>
              </PreviewProvider>
            </HashRouter>
          </MetaProvider>
        </ArchiveProvider>
          </AuthGate>
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
