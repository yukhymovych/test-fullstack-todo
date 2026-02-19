import { useRedirectIfAuthed } from '../features/auth/model/useRedirectIfAuthed';
import { useLoginForm } from '../features/auth/model/useLoginForm';
import { LoginForm } from '../features/auth/ui/LoginForm';

export function LoginPage() {
  useRedirectIfAuthed();
  const formProps = useLoginForm();

  return <LoginForm {...formProps} />;
}
