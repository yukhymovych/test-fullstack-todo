import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { NotesListPage } from './pages/NotesListPage';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { ProtectedRoute } from './app/components/ProtectedRoute';
import { NotesLayout } from './app/layout/NotesLayout';
import { useAuth } from './app/contexts/AuthContext';
import './App.css';

function RootRedirect() {
  const { isAuthed } = useAuth();
  return <Navigate to={isAuthed ? '/notes' : '/login'} replace />;
}

function App() {
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
        <Route path=":id" element={<NoteEditorPage />} />
      </Route>
    </Routes>
  );
}

export default App;
