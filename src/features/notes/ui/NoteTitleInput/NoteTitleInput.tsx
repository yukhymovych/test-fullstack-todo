import { useEffect, useRef } from 'react';
import type { NoteTitleInputProps } from './NoteTitleInput.types';
import './NoteTitleInput.css';

export function NoteTitleInput({ value, onChange }: NoteTitleInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        e.currentTarget.style.height = '0px';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        onChange(e);
      }}
      placeholder="Note title"
      className="note-title-input"
      rows={1}
      aria-label="Note title"
    />
  );
}
