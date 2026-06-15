# Brisk Design System

This folder contains the complete Brisk Design System for use in Figma Make projects.

## Icon System

### Overview
- **Total Icons**: 1,067 icons
- **Location**: `/src/imports/icons/`
- **Component**: `Icon`
- **Type-safe**: Full TypeScript support with `IconName` type

### Usage

```tsx
import { Icon } from '@/BriskDesignSystem';

// Basic usage
<Icon name="Mail" />

// With custom size and color
<Icon name="Lock" size={20} color="var(--text/primary)" />

// With Tailwind classes
<Icon name="Eye" size={24} className="hover:opacity-70" />
```

### Available Icons

All icon names are type-safe through the `IconName` type. Some commonly used icons:

**Form & Input:**
- Mail, Lock, Eye, EyeClosed, EyeSlash
- User, Phone, Calendar, Clock
- Check, CheckCircle, X, XCircle

**Navigation:**
- ArrowLeft, ArrowRight, ArrowUp, ArrowDown
- ChevronLeft, ChevronRight, ChevronUp, ChevronDown
- CaretLeft, CaretRight, CaretDown, CaretUp

**Actions:**
- Plus, Minus, Edit, Trash, Copy
- Download, Upload, Share, Save
- Settings (Gear, GearSix, Nut)

**Status:**
- Info, Warning, WarningCircle
- CheckCircle, XCircle, Question
- Bell, BellSimple, Notification

**Search & Filter:**
- MagnifyingGlass (search)
- Funnel (filter)
- SlidersHorizontal, Sliders

**File & Document:**
- File, FileText, FilePdf, FileImage
- Folder, FolderOpen
- Download, Upload

**Social & Logos:**
- FacebookLogo, TwitterLogo, InstagramLogo
- GithubLogo, LinkedinLogo, GoogleLogo
- And 40+ more platform logos

### Icon Guidelines

1. **Use DS icons only** - Never use icons from external libraries like lucide-react, heroicons, etc.
2. **Type-safe names** - All icon names are validated by TypeScript
3. **Consistent sizing** - Default is 24px, adjust as needed for your design
4. **Color tokens** - Use DS color tokens: `var(--text/primary)`, `var(--text/secondary)`, etc.

### Finding Icons

To see all available icons, check:
- `/src/BriskDesignSystem/icons.ts` - Complete type-safe list
- `/src/imports/icons/` - All SVG files

### Example: Replace lucide-react Icons

**Before:**
```tsx
import { Mail, Lock, Eye } from 'lucide-react';

<Mail size={20} />
<Lock size={20} />
<Eye size={20} />
```

**After:**
```tsx
import { Icon } from '@/BriskDesignSystem';

<Icon name="Mail" size={20} />
<Icon name="Lock" size={20} />
<Icon name="Eye" size={20} />
```

## Flow Icons

### Overview
- **Total Flow Types**: 8 production workflows
- **Component**: `FlowIcon`
- **Sizes**: S (24px), M (36px), L (48px)
- **Type-safe**: Full TypeScript support with `FlowType`

### Usage

```tsx
import { FlowIcon } from '@/BriskDesignSystem';

// Active flow (started/complete)
<FlowIcon flow="Brief" size="M" />

// Inactive flow (not started - 50% opacity)
<FlowIcon flow="Script" size="S" active={false} />

// Large hero flow icon
<FlowIcon flow="Edits" size="L" />
```

### Available Flow Types

All flow types represent specific production workflows:

1. **Brief** 🟡 - Client goals, audience, tone, deliverables
2. **Script** 🟢 - Blueprint for video narrative
3. **Styleframes** 🔵 - Visual language lock (animation only)
4. **Storyboard** 🔴 - Scene-by-scene visual plan (animation only)
5. **Media** 🔵 - Raw ingredients: footage, brand assets
6. **Shoot** ⚫ - Filming requirements: crew, location, schedule
7. **Edits** 🔴 - Video construction: story, pacing, music, graphics
8. **Masters** 🟣 - Final delivery: exports, QC checks, captions

### Flow Icon Guidelines

1. **Never substitute** - Always use `FlowIcon` for production workflows, never generic icons
2. **Exact spelling** - Use correct flow names: "Edits" not "Edit", "Styleframes" not "Style Frames"
3. **Animation-only flows** - Styleframes and Storyboard are only for animation projects
4. **Active state** - Use `active={false}` to show 50% opacity for flows not yet started

### Sizes

- **S (24px)**: Tab labels, inline flow references
- **M (36px)**: Card headers, row identifiers (default)
- **L (48px)**: Hero/prominent flow identification

## Missing Components

The following components are referenced in the guidelines but not yet imported:

### Logo Components
- **Logo** - Full wordmark (180×56px)
- **Logomark** - Compact icon (24×16px)
- **Status**: ⚠️ Need to import from Figma DS file

To import Logo/Logomark, use the Figma Make import feature:
1. `Logo` component (node: `4424:67782`)
2. `Logomark` component (node: `4424:67787`)

## Design System Guidelines

Full design system documentation is in `/guidelines/`:
- `setup.md` - DS file and viewport info
- `foundations/` - Colors, typography, spacing, effects
- `components/` - Component specifications
- `brand/` - Logo and flow icons
