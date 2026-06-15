import { useState } from 'react';

interface InputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
  error?: boolean;
  size?: 'S' | 'M' | 'L';
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
}

export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  hint,
  error = false,
  size = 'M',
  iconStart,
  iconEnd
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);

  // Size variants for d-Input
  const sizeStyles = {
    S: "paragraph-s py-[8px]",
    M: "paragraph-m py-[12px]",
    L: "paragraph-l py-[16px]"
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasTyped(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasTyped(true);
    if (onChange) onChange(e);
  };

  const getStateStyle = (): React.CSSProperties => {
    if (error) {
      return { border: '1px solid #FE2836', background: '#FFFFFF', color: '#0E1114', boxShadow: 'none' };
    }
    if (isFocused && hasTyped) {
      return { border: '1px solid #000000', background: '#FFFFFF', color: '#0E1114', boxShadow: '0 0 0 4px #C6ABFF' };
    }
    if (isFocused) {
      return { border: '1px solid #000000', background: '#FFFFFF', color: '#0E1114', boxShadow: '0 0 0 4px #91BAFF' };
    }
    if (isHovered) {
      return { border: '1px solid #000000', background: '#F3EEFF', color: '#0E1114', boxShadow: '2px 2px 0 0 #000000' };
    }
    return { border: '1px solid #000000', background: '#FFFFFF', color: '#0E1114', boxShadow: 'none' };
  };

  return (
    <div className="flex flex-col gap-[4px]">
      {label && (
        <label className="label-m-semibold" style={{ color: '#0E1114' }}>
          {label}
        </label>
      )}

      <div className="relative">
        {iconStart && (
          <div className="absolute left-[12px] top-1/2 -translate-y-1/2" style={{ color: '#0E1114' }}>
            {iconStart}
          </div>
        )}

        {iconEnd && (
          <div className="absolute right-[12px] top-1/2 -translate-y-1/2" style={{ color: '#0E1114' }}>
            {iconEnd}
          </div>
        )}

        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={getStateStyle()}
          className={`
            w-full
            ${sizeStyles[size]}
            ${iconStart ? 'pl-[40px] pr-[12px]' : iconEnd ? 'pl-[12px] pr-[40px]' : 'px-[12px]'}
            rounded-[8px]
            transition-all
            outline-none
            placeholder:text-[#8FA0AF]
          `}
        />
      </div>

      {hint && (
        <span className="label-xs" style={{ color: '#616C76' }}>
          {hint}
        </span>
      )}
    </div>
  );
}
