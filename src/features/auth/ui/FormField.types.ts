import type { InputHTMLAttributes } from 'react';

export interface FormFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}
