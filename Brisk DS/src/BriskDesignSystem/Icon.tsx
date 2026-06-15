import React from 'react';
import { IconName } from './icons';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Icon name from the Brisk DS icon library
   * Use the icon registry to see all available icons
   */
  name: IconName;
  /**
   * Icon size in pixels (default: 24)
   */
  size?: number;
  /**
   * Icon color - use DS color tokens
   * Example: "var(--text/primary)" or "#000000"
   */
  color?: string;
  className?: string;
}

/**
 * Brisk Design System Icon Component
 *
 * Renders SVG icons from the Brisk DS icon library.
 * All icons are located in /src/imports/icons/
 *
 * @example
 * ```tsx
 * import { Icon } from '@/BriskDesignSystem/Icon';
 *
 * // Basic usage
 * <Icon name="Mail" />
 *
 * // With custom size and color
 * <Icon name="Lock" size={20} color="var(--text/primary)" />
 * ```
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = 'currentColor',
  className = '',
  ...props
}) => {
  // Clean the icon name to match file names
  const cleanName = name.replace(/\s+/g, '');

  // Dynamically import the SVG
  const iconPath = `/src/imports/icons/${cleanName} (🔄 swap).svg`;

  return (
    <img
      src={iconPath}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{
        color,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...props.style
      }}
      {...props}
    />
  );
};
