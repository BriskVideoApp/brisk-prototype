import { useState } from 'react';
import { Check, Minus } from 'lucide-react';

interface CheckboxProps {
  label?: string;
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({
  label,
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false
}: CheckboxProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  // Checkbox states: Default, Hover, Disabled + Selection states (Unchecked, Checked, Indeterminate)
  const getCheckboxClasses = () => {
    if (disabled) {
      // Disabled: gray background, gray border
      return 'bg-[#F8F9FA] border-[#CDD5DE] cursor-not-allowed';
    }

    if (checked || indeterminate) {
      // Checked/Indeterminate: purple background, black border
      // Hover doesn't change checked state appearance
      return 'bg-[#8B2CFF] border-black';
    }

    if (isHovered) {
      // Hover (unchecked): purple background, black border
      return 'bg-[#F3EEFF] border-black';
    }

    // Default (unchecked): white background, black border
    return 'bg-white border-black';
  };

  return (
    <label
      className="flex items-center gap-[8px] cursor-pointer"
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
        />

        <div
          className={`
            w-5 h-5
            rounded-[4px]
            border-[1px]
            flex items-center justify-center
            transition-all
            ${getCheckboxClasses()}
          `}
        >
          {indeterminate && !disabled && (
            <Minus size={16} className="text-white" strokeWidth={3} />
          )}
          {checked && !indeterminate && !disabled && (
            <Check size={16} className="text-white" strokeWidth={3} />
          )}
        </div>
      </div>

      {label && (
        <span className={`label-s ${disabled ? 'text-[#8FA0AF]' : 'text-[#616C76]'}`}>
          {label}
        </span>
      )}
    </label>
  );
}
