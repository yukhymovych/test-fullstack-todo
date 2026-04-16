import type { KeyboardEvent, RefObject } from 'react';

interface SearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function SearchInput({
  value,
  placeholder,
  onChange,
  onKeyDown,
  inputRef,
}: SearchInputProps) {
  return (
    <div className="search-modal__input-wrap">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="search-modal__input"
      />
    </div>
  );
}
