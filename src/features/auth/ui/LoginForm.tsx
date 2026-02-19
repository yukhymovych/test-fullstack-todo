import { Button } from '@/shared/ui';
import { FormField } from './FormField';
import type { LoginFormProps } from './LoginForm.types';

const containerStyle = { padding: '20px', maxWidth: '400px', margin: '50px auto' };
const errorStyle = { color: 'red', marginBottom: '15px' };
const submitButtonStyle = { marginRight: '10px' };

export function LoginForm({
  username,
  password,
  isRegister,
  error,
  isLoading,
  setUsername,
  setPassword,
  handleSubmit,
  toggleMode,
}: LoginFormProps) {
  return (
    <div style={containerStyle}>
      <h1>{isRegister ? 'Register' : 'Login'}</h1>
      <form onSubmit={handleSubmit}>
        <FormField
          id="username"
          type="text"
          label="Username"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          placeholder="3-32 characters"
        />
        <FormField
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder="6-72 characters"
        />
        {error && <div style={errorStyle}>{error}</div>}
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          style={submitButtonStyle}
        >
          {isLoading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
        </Button>
        <Button type="button" variant="secondary" onClick={toggleMode}>
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </Button>
      </form>
    </div>
  );
}
