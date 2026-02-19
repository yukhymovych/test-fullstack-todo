export interface UseLoginFormReturn {
  username: string;
  password: string;
  isRegister: boolean;
  error: string | null;
  isLoading: boolean;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  toggleMode: () => void;
}
