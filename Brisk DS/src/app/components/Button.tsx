interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  size?: 'S' | 'M' | 'L';
  onClick?: () => void;
  className?: string;
}

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'M',
  onClick,
  className = ''
}: ButtonProps) {
  // Radius: 8px (radius/s) for buttons
  const baseStyles = "transition-all border-[1px] cursor-pointer rounded-[8px]";

  // Size variants - using Label text styles
  const sizeStyles = {
    S: "label-s-semibold px-[12px] py-[8px]",
    M: "label-m-semibold px-[16px] py-[12px]",
    L: "label-l-semibold px-[24px] py-[16px]"
  };

  // Color and interaction variants - buttons get shadow on hover only (hard shadow: 4px 4px 0)
  // Using direct hex values to ensure proper rendering
  const variantStyles = {
    primary: "bg-[#8B2CFF] text-white border-black hover:bg-[#F3EEFF] hover:text-[#0E1114] hover:shadow-[4px_4px_0_#000000] active:bg-[#6625CD]",
    secondary: "bg-white text-[#0E1114] border-black hover:bg-[#F3EEFF] hover:shadow-[4px_4px_0_#000000] active:bg-[#DCCDFF]",
    tertiary: "bg-[#F3EEFF] text-[#0E1114] border-black hover:bg-[#F3EEFF] hover:shadow-[4px_4px_0_#000000] active:bg-[#DCCDFF]",
    ghost: "bg-transparent text-[#0E1114] border-transparent hover:bg-[#F3EEFF] active:bg-[#DCCDFF]"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
