# DRY Principle — Don't Repeat Yourself

## Mandatory Check Before Creating Any UI Element

Before writing ANY new component, element, or styling pattern:

1. **Search the codebase first.** Use Grep/Glob to check if a similar component, pattern, or utility already exists.
2. **Check `components/ui/`** for shared primitives (FormSection, RadioCard, SectionDivider, TogglePills, SelectableCard).
3. **Check `app/editor/controls/`** for existing form controls (ColorPickerControl, SliderControl, LabeledSlider).
4. **Reuse before creating.** If a matching component exists, import and use it — even if it needs minor props additions.
5. **Extract when duplicated.** If you find yourself writing the same pattern a second time, extract it into `components/ui/` immediately.

## Shared UI Primitives Live in `components/ui/`

All reusable, page-agnostic UI primitives belong in `components/ui/`:

| Component | Purpose |
|-----------|---------|
| `FormSection` | Label + content wrapper (replaces repeated `space-y-2` + label pattern) |
| `SectionDivider` | Labeled divider between sections |
| `RadioCard` | Selectable card with radio dot, label, description, and optional expandable content |
| `TogglePills` | Horizontally-wrapped pill buttons with single/multi-select and max enforcement |
| `SelectableCard` | Card with selected/unselected visual states (border, ring, checkmark) |

## Rules

- **Never duplicate a class pattern more than twice.** If you see `text-sm font-medium text-base-content/70` as a label, use `<FormSection>` instead.
- **Never build a new selection UI** without first checking if TogglePills, RadioCard, or SelectableCard already handles the pattern.
- **Page-specific components** stay in their `app/*/components/` directory. **Shared primitives** go in `components/ui/`.
- **Composition over props.** Prefer `children` over adding props flags that change behavior. Keep primitives small and composable.
