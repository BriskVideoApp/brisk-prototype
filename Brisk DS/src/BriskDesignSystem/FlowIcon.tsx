import React from 'react';

const makeFlowIcon = (bg: string, label: string): React.FC => () => (
  <div
    className="border-2 border-solid border-[#0e1114] drop-shadow-[4px_4px_0px_#0e1114] relative size-full flex items-center justify-center"
    style={{ background: bg }}
    data-name={`Flow icon ${label}`}
  >
    <span className="text-[#0e1114]">{label}</span>
  </div>
);

const BriefIcon = makeFlowIcon('#fdce5d', 'B');
const ScriptIcon = makeFlowIcon('#c8f26b', 'Sc');
const StyleframesIcon = makeFlowIcon('#d6d3cd', 'St');
const StoryboardIcon = makeFlowIcon('#ff6b6b', 'Sb');
const MediaIcon = makeFlowIcon('#7ad9e8', 'M');
const ShootIcon = makeFlowIcon('#0e1114', 'Sh');
const EditsIcon = makeFlowIcon('#ffb3d1', 'E');
const MastersIcon = makeFlowIcon('#c9a8ff', 'Ms');

/**
 * Flow types available in Brisk DS
 * These represent specific production workflows
 */
export type FlowType =
  | 'Brief'
  | 'Script'
  | 'Styleframes'
  | 'Storyboard'
  | 'Media'
  | 'Shoot'
  | 'Edits'
  | 'Masters';

/**
 * Flow icon sizes
 * - S: Tab labels, inline references (24px)
 * - M: Card headers, row identifiers (36px)
 * - L: Hero/prominent identification (48px)
 */
export type FlowIconSize = 'S' | 'M' | 'L';

export interface FlowIconProps {
  /**
   * The flow type to display
   */
  flow: FlowType;
  /**
   * Icon size - maps to DS size variants
   * @default 'M'
   */
  size?: FlowIconSize;
  /**
   * Whether the flow is started/complete
   * - true: Full opacity (started or complete)
   * - false: 50% opacity (not started)
   * @default true
   */
  active?: boolean;
  className?: string;
}

const FLOW_COMPONENTS: Record<FlowType, React.ComponentType> = {
  Brief: BriefIcon,
  Script: ScriptIcon,
  Styleframes: StyleframesIcon,
  Storyboard: StoryboardIcon,
  Media: MediaIcon,
  Shoot: ShootIcon,
  Edits: EditsIcon,
  Masters: MastersIcon,
};

const SIZE_MAP: Record<FlowIconSize, string> = {
  S: 'w-[24px] h-[24px]',
  M: 'w-[36px] h-[36px]',
  L: 'w-[48px] h-[48px]',
};

/**
 * Brisk Design System Flow Icon Component
 *
 * Renders flow-specific icons for identifying production workflows.
 * Never substitute with generic icons - each flow has a unique visual identity.
 *
 * @example
 * ```tsx
 * import { FlowIcon } from '@/BriskDesignSystem';
 *
 * // Active flow (started/complete)
 * <FlowIcon flow="Brief" size="M" />
 *
 * // Inactive flow (not started)
 * <FlowIcon flow="Script" size="S" active={false} />
 *
 * // Large hero flow icon
 * <FlowIcon flow="Edits" size="L" />
 * ```
 */
export const FlowIcon: React.FC<FlowIconProps> = ({
  flow,
  size = 'M',
  active = true,
  className = '',
}) => {
  const IconComponent = FLOW_COMPONENTS[flow];
  const sizeClass = SIZE_MAP[size];
  const opacityClass = active ? 'opacity-100' : 'opacity-50';

  return (
    <div className={`${sizeClass} ${opacityClass} ${className}`}>
      <IconComponent />
    </div>
  );
};

/**
 * Flow metadata for reference
 * Color tokens from guidelines/brand/logo-flows.md
 */
export const FLOW_METADATA: Record<FlowType, {
  colorToken: string;
  description: string;
  animationOnly?: boolean;
}> = {
  Brief: {
    colorToken: '--extra/stars',
    description: 'Client goals, audience, tone, deliverables. Approval unlocks next stage.',
  },
  Script: {
    colorToken: '--extra/lime-secondary',
    description: 'Blueprint for video narrative. Locked after brief approval.',
  },
  Styleframes: {
    colorToken: '--illustration/shadow-dark',
    description: 'Visual language lock: typography, color, illustration style.',
    animationOnly: true,
  },
  Storyboard: {
    colorToken: '--btn/danger-secondary-click',
    description: 'Scene-by-scene visual plan before animation begins.',
    animationOnly: true,
  },
  Media: {
    colorToken: '--extra/cyanic-secondary',
    description: 'All raw ingredients: footage, brand assets, references.',
  },
  Shoot: {
    colorToken: '--item/dark-primary',
    description: 'When new filming is required. Plans crew, location, schedule.',
  },
  Edits: {
    colorToken: '--extra/pink-secondary',
    description: 'Video construction: story, pacing, music, graphics, polish.',
  },
  Masters: {
    colorToken: '--extra/purple-secondary',
    description: 'Final delivery: exports, QC checks, captions. Approval = project complete.',
  },
};
