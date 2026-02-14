import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { TodoPage } from './pages/TodoPage';
import { ProtectedRoute } from './app/components/ProtectedRoute';
import { useAuth } from './app/contexts/AuthContext';
import './App.css';

function RootRedirect() {
  const { isAuthed } = useAuth();
  return <Navigate to={isAuthed ? '/todos' : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <TodoPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
