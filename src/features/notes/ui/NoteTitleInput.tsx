interface NoteTitleInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function NoteTitleInput({ value, onChange }: NoteTitleInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder="Note title"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 16px',
        fontSize: '40px',
        fontWeight: 'bold',
        marginBottom: '16px',
      }}
    />
  );
}
