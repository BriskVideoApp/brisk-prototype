# Quiet filters and content tabs

Tom chose Quiet by purpose and authorised the shared DS additions on 19 October 2026. These are approved React extensions using existing Brisk tokens and quiet patterns, not a claim that the original kit supplied these exact wrappers or dimensions.

## List filters

Import `FilterGroup` and `FilterButton` from `Brisk DS/src/app/components/FilterGroup.tsx`.

```tsx
<FilterGroup aria-label="Client views">
  <FilterButton selected={status === 'All'} count={clients.length} onClick={() => setStatus('All')}>
    All
  </FilterButton>
</FilterGroup>
```

- A filter group is a named group of ordinary native buttons, not a tablist or form radio group. The consumer owns selection, filtering, counts, URL state and existing callbacks.
- Each button receives `selected` and exposes it as `aria-pressed`. Pass the same original `onClick`; no custom arrow-key selection is introduced. Enter, Space and Tab retain native button behaviour.
- Optional counts remain visible, including zero. The component does not calculate, clear, hide or summarise options.
- Native button attributes, events, refs and form associations pass through. Type defaults to `button`. Prefer native `disabled`; `aria-disabled` alone does not suppress a consumer handler.
- Groups wrap at narrow widths. Keep all options and counts; do not shrink text, clip choices or substitute an unapproved menu.

## Content tabs

Import `Tabs` from `Brisk DS/src/app/components/Tabs.tsx`.

```tsx
<Tabs
  label="Customer settings sections"
  value={activeTab}
  onValueChange={setActiveTab}
  options={[{ value: 'overview', label: 'Overview' }, { value: 'people', label: 'People' }]}
>
  {activeTab === 'overview' ? overviewContent : peopleContent}
</Tabs>
```

- Values must be unique and stable, and the controlled `value` must identify an enabled option. The consumer owns that value and renders the active content; the DS adds no stored state or persistence.
- The named horizontal tablist uses real buttons, one selected tab stop and stable per-instance ids. Tabs control one active tabpanel whose accessible label follows the selection. The panel is keyboard-focusable so text content remains reachable.
- Left/Right wrap through enabled options; Home/End go to the first/last enabled option. These keys focus and activate the next tab immediately for ordinary instant-rendered panels. Direction follows an explicit inherited `dir` attribute. Enter/Space use native button activation. Escape bubbles to existing dialog dismissal.
- The component does not manage a dialog, close a form, trigger an invitation or alter the consumer's other actions. Root native attributes/events/ref pass through. Existing children remain under the consumer's conditional rendering.

## Shared appearance

- All choices have at least 44px native targets and Label/S-semibold text. Counts use Label/XS. Use existing spacing, radius, colour and hard-shadow tokens.
- List-filter selection uses a soft lavender surface with dark purple text. Quiet content tabs use a purple underline on a shared hairline, without an enclosing frame or individual dividing borders.
- Hover uses a subtle lavender fill. Keyboard focus has a 4px DS blue outline and small hard shadow; pressing flattens the shadow. Disabled controls use the existing muted button tokens.
- Consumer classes may set width, maximum width, alignment or visibility only. Do not override the shared surfaces, text, spacing or states.

## Pilot and boundaries

The Client and People directory filters, notification-list filters and Chat Client settings Overview/People tabs are migrated. Preserve their option order, counts, selected values, search/sort/preview logic, role visibility, field values, actions and dialog focus/dismissal rules. People keeps its existing `view` query handling, unrelated URL parameters, view-specific columns and invitation defaults.

People profile tabs, Videos filters, segmented inline switches, Chat Internal/External tabs and project-status filters, Shoot modes/day selectors, media/editor controls, player tools and grouped sharing/review controls remain unchanged. No unused SegmentedControl wrapper or attached-panel styling is added by this pilot. Review those consumers before migrating them.
