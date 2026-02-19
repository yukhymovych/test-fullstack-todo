import type { FormFieldProps } from './FormField.types';

const fieldStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block' as const, marginBottom: '5px' };
const inputStyle = { padding: '8px', width: '100%', boxSizing: 'border-box' as const };

export function FormField({
  id,
  label,
  value,
  onChange,
  ...inputProps
}: FormFieldProps) {
  return (
    <div style={fieldStyle}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        {...inputProps}
      />
    </div>
  );
}
