import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { NotesListPage } from './pages/NotesListPage';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { TrashPage } from './pages/TrashPage';
import { LearningSessionPage } from './pages/LearningSessionPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './app/components/ProtectedRoute';
import { NotesLayout } from './app/layout/NotesLayout';
import { LearningLayout } from './app/layout/LearningLayout';
import { useAuth } from './app/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useSyncUiLanguageToServer } from '@/features/settings/model/useSyncUiLanguageToServer';
import './App.css';

function RootRedirect() {
  const { isAuthed, isLoading, isApiReady } = useAuth();
  const { t } = useTranslation('common');

  if (isLoading || (isAuthed && !isApiReady)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('status.loading')}</div>
      </div>
    );
  }

  return <Navigate to={isAuthed ? '/notes' : '/login'} replace />;
}

function App() {
  useSyncUiLanguageToServer();
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <NotesLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<NotesListPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="trash" element={<TrashPage />} />
        <Route path="trash/:id" element={<TrashPage />} />
        <Route path=":id" element={<NoteEditorPage />} />
      </Route>
      <Route
        path="/learning"
        element={
          <ProtectedRoute>
            <LearningLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LearningSessionPage />} />
      </Route>
    </Routes>
  );
}

export default App;
