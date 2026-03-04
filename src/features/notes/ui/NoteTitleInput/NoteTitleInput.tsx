import type { NoteTitleInputProps } from './NoteTitleInput.types';
import './NoteTitleInput.css';

export function NoteTitleInput({ value, onChange }: NoteTitleInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder="Note title"
      className="note-title-input"
    />
  );
}
