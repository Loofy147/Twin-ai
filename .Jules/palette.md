## 2024-05-24 - Navigation Accessibility & Semantic HTML
**Learning:** Replacing non-semantic `div` elements with `button` for interactive branding (logos) ensures they are automatically added to the tab order and correctly identified by screen readers. Additionally, explicitly adding `aria-hidden="true"` to decorative Lucide icons prevents redundant or confusing screen reader announcements.
**Action:** Always audit navigation components for interactive `div`s and replace with `button` or `a`. Ensure icon-only buttons have descriptive `aria-label`s.
