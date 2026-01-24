# 🎨 Palette 2.0: UX & Accessibility Journal

## Core Principles
- **Micro-UX Matters:** Small improvements (ARIA labels, focus states, feedback) have massive cumulative impact.
- **Semantic HTML First:** Use `<button>` for actions, `<label>` for inputs.
- **Visibility & Feedback:** Never leave a user (or screen reader) wondering what happened or what's happening.

## Accessibility Patterns

### 1. Icon Buttons (WCAG 4.1.2 - Level A)
Always provide an `aria-label` for buttons that only contain an icon.
```tsx
// PALETTE: Screen reader users can identify the sync action - WCAG: 4.1.2 (A)
<button aria-label="Sync Contacts" className="...">
  <RefreshCw />
</button>
```

### 2. Live Feedback (WCAG 4.1.3 - Level AA)
Use `role="status"` and `aria-live="polite"` for non-critical status updates like Toasts or background sync indicators.
```tsx
// PALETTE: Screen reader announces sync status - WCAG: 4.1.3 (AA)
<div role="status" aria-live="polite" className="sr-only">
  {isSyncing ? 'Syncing contacts...' : 'Sync complete'}
</div>
```

### 3. Focus Visibility (WCAG 2.4.7 - Level AA)
Use `focus-visible` to ensure keyboard users have a clear visual indicator without affecting mouse users.
```tsx
// PALETTE: Keyboard users can see focus - WCAG: 2.4.7 (AA)
<button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ...">
  Action
</button>
```

### 4. Search Inputs (WCAG 4.1.2 - Level A)
Search fields must have an accessible name, even if they have a placeholder.
```tsx
// PALETTE: Screen readers identify the search purpose - WCAG: 4.1.2 (A)
<input aria-label="Search commands" placeholder="Type a command..." ... />
```

## Verification Methods
- **Unit Tests:** Use `@testing-library/react` to check for ARIA roles and labels (`getByRole('status')`, `getByLabelText('...')`).
- **Automated A11y Checks:** Use Playwright scripts to query for accessibility attributes and capture screenshots of focus states.
- **Manual Check:** Tab through the interface to verify focus order and visibility.
