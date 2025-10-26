# Components Guide - Sprint 3.0

Modern UI component library for Welcomedly built with Tailwind CSS.

## Overview

This guide documents all reusable UI components created as part of Sprint 3.0 UI/UX redesign. All components are built using EJS templates and Tailwind CSS utility classes.

## Quick Start

### 1. Build Tailwind CSS

```bash
npm run build:css
```

### 2. Include Tailwind in Your View

```html
<link rel="stylesheet" href="/css/output.css">
```

### 3. Use Components

```ejs
<%- include('components/button', { variant: 'primary', text: 'Click Me' }) %>
```

## Component Library

### Button Component

Location: `src/views/components/button.ejs`

Versatile button component with multiple variants, sizes, and states.

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `type`: 'button' | 'submit' | 'reset' (default: 'button')
- `disabled`: boolean (default: false)
- `fullWidth`: boolean (default: false)
- `icon`: string (optional) - Icon HTML
- `iconPosition`: 'left' | 'right' (default: 'left')
- `text`: string - Button text
- `onclick`: string (optional) - onClick handler
- `href`: string (optional) - If provided, renders as anchor
- `id`: string (optional)
- `classes`: string (optional) - Additional CSS classes

**Examples:**

```ejs
<!-- Primary button -->
<%- include('components/button', {
    variant: 'primary',
    text: 'Save Changes'
}) %>

<!-- Button with icon -->
<%- include('components/button', {
    variant: 'success',
    text: 'Submit',
    icon: '<svg>...</svg>',
    type: 'submit'
}) %>

<!-- Full width button -->
<%- include('components/button', {
    variant: 'primary',
    text: 'Sign Up',
    fullWidth: true
}) %>
```

---

### Card Component

Location: `src/views/components/card.ejs`

Container component with header, body, and footer sections.

**Props:**
- `title`: string (optional) - Card title
- `subtitle`: string (optional) - Card subtitle
- `headerActions`: string (optional) - HTML for header buttons
- `body`: string - Main card content (HTML)
- `footer`: string (optional) - Card footer content (HTML)
- `variant`: 'default' | 'hover' | 'glass' (default: 'default')
- `padding`: 'none' | 'sm' | 'md' | 'lg' (default: 'md')
- `classes`: string (optional)
- `id`: string (optional)

**Examples:**

```ejs
<!-- Basic card -->
<%- include('components/card', {
    title: 'User Profile',
    subtitle: 'Manage your account settings',
    body: '<p>Card content here</p>'
}) %>

<!-- Card with actions -->
<%- include('components/card', {
    title: 'Campaign Stats',
    headerActions: '<button class="btn-ghost">Edit</button>',
    body: '<div class="stats">...</div>',
    footer: '<p class="text-sm text-gray-500">Last updated: Today</p>'
}) %>

<!-- Hover card -->
<%- include('components/card', {
    variant: 'hover',
    body: '<p>This card has hover effects</p>'
}) %>
```

---

### Badge Component

Location: `src/views/components/badge.ejs`

Small label component for status indicators, tags, and counts.

**Props:**
- `text`: string - Badge text
- `variant`: 'primary' | 'success' | 'warning' | 'error' | 'gray' (default: 'gray')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `dot`: boolean (default: false) - Show status dot
- `icon`: string (optional) - Icon HTML
- `removable`: boolean (default: false) - Show remove button
- `onRemove`: string (optional) - onClick handler for remove
- `classes`: string (optional)
- `id`: string (optional)

**Examples:**

```ejs
<!-- Status badge with dot -->
<%- include('components/badge', {
    text: 'Online',
    variant: 'success',
    dot: true
}) %>

<!-- Simple badge -->
<%- include('components/badge', {
    text: 'New',
    variant: 'primary'
}) %>

<!-- Removable badge -->
<%- include('components/badge', {
    text: 'JavaScript',
    variant: 'gray',
    removable: true,
    onRemove: 'removeTag(this)'
}) %>
```

---

### Input Component

Location: `src/views/components/input.ejs`

Form input field with label, validation, and error states.

**Props:**
- `type`: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' (default: 'text')
- `name`: string - Input name
- `id`: string - Input ID
- `label`: string (optional) - Input label
- `placeholder`: string (optional)
- `value`: string (optional)
- `required`: boolean (default: false)
- `disabled`: boolean (default: false)
- `readonly`: boolean (default: false)
- `error`: string (optional) - Error message
- `helpText`: string (optional) - Help text
- `icon`: string (optional) - Left icon HTML
- `iconRight`: string (optional) - Right icon HTML
- `fullWidth`: boolean (default: true)
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `classes`: string (optional)
- `autocomplete`: string (optional)
- `pattern`: string (optional)
- `min`: string (optional)
- `max`: string (optional)

**Examples:**

```ejs
<!-- Text input with label -->
<%- include('components/input', {
    id: 'username',
    name: 'username',
    label: 'Username',
    placeholder: 'Enter username',
    required: true
}) %>

<!-- Input with error -->
<%- include('components/input', {
    id: 'email',
    name: 'email',
    type: 'email',
    label: 'Email',
    value: 'invalid-email',
    error: 'Please enter a valid email address'
}) %>

<!-- Input with help text -->
<%- include('components/input', {
    id: 'password',
    name: 'password',
    type: 'password',
    label: 'Password',
    helpText: 'Must be at least 8 characters',
    required: true
}) %>
```

---

## Design System

### Color Palette

**Primary (Blue):**
- `bg-primary-50` to `bg-primary-900`
- Main: `bg-primary-500` (#5B7FFF)

**Secondary (Purple):**
- `bg-secondary-50` to `bg-secondary-900`
- Main: `bg-secondary-500` (#7C3AED)

**Success (Green):**
- `bg-success-50` to `bg-success-900`
- Main: `bg-success-500` (#10B981)

**Warning (Yellow):**
- `bg-warning-50` to `bg-warning-900`
- Main: `bg-warning-500` (#F59E0B)

**Error (Red):**
- `bg-error-50` to `bg-error-900`
- Main: `bg-error-500` (#EF4444)

**Gray (Neutral):**
- `bg-gray-50` to `bg-gray-900`

### Typography

**Font Families:**
- Sans-serif: Inter (UI text)
- Monospace: JetBrains Mono (metrics, code)

**Usage:**
```html
<p class="font-sans">This is UI text</p>
<code class="font-mono">This is monospace</code>
```

### Spacing

Based on 4px system:
- `p-1` = 4px
- `p-2` = 8px
- `p-3` = 12px
- `p-4` = 16px
- `p-6` = 24px
- `p-8` = 32px

### Border Radius

- `rounded-sm` = 4px
- `rounded` = 8px (default)
- `rounded-md` = 12px
- `rounded-lg` = 16px
- `rounded-xl` = 20px

### Shadows

- `shadow-sm` - Subtle shadow
- `shadow` - Default shadow
- `shadow-md` - Medium shadow
- `shadow-lg` - Large shadow
- `shadow-xl` - Extra large shadow
- `shadow-glass` - Glass morphism effect

## Utility Classes

### Glass Morphism

```html
<div class="glass p-6">
    Glass effect background
</div>

<div class="glass-dark p-6">
    Dark glass effect
</div>
```

### Status Indicators

```html
<span class="status-online"></span> <!-- Green dot -->
<span class="status-busy"></span>   <!-- Red dot -->
<span class="status-away"></span>   <!-- Yellow dot -->
<span class="status-offline"></span> <!-- Gray dot -->
```

### Scrollbar

```html
<div class="scrollbar-thin overflow-y-auto">
    Content with custom scrollbar
</div>
```

### Text Gradients

```html
<h1 class="text-gradient-primary">Gradient Text</h1>
<h1 class="text-gradient-success">Success Gradient</h1>
```

### Animations

```html
<div class="animate-fade-in">Fades in</div>
<div class="animate-slide-in">Slides in from left</div>
<div class="animate-slide-up">Slides up from bottom</div>
```

## Component Showcase

Visit `/components` to see all components in action with live examples and code snippets.

**URL:** http://localhost:3000/components

## Development Workflow

### 1. Building CSS

**Production build (minified):**
```bash
npm run build:css
```

**Watch mode (development):**
```bash
npm run watch:css
```

### 2. Creating New Components

1. Create a new `.ejs` file in `src/views/components/`
2. Follow the existing component pattern (props, defaults, classes)
3. Add documentation in the component file header
4. Add examples to the showcase page
5. Update this guide

### 3. Using Components in Views

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- Include Tailwind output -->
    <link rel="stylesheet" href="/css/output.css">
</head>
<body>
    <!-- Use components -->
    <%- include('components/button', {
        variant: 'primary',
        text: 'My Button'
    }) %>
</body>
</html>
```

## Dark Mode Support

All components support dark mode via the `dark` class on the `<html>` or `<body>` tag:

```html
<html class="dark">
    <!-- Dark mode active -->
</html>
```

Components will automatically adapt their colors and styles.

## Best Practices

1. **Consistent Spacing:** Use the 4px spacing system (p-1, p-2, p-4, p-6, p-8)
2. **Color Usage:** Use semantic colors (primary, success, error) for actions and states
3. **Typography:** Use font-sans for UI, font-mono for metrics/code
4. **Shadows:** Use sparingly - cards use shadow-md, modals use shadow-xl
5. **Responsive:** Always consider mobile-first responsive design
6. **Accessibility:** Include proper labels, ARIA attributes, and keyboard navigation

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Need Help?

- View live examples: http://localhost:3000/components
- Check component source: `src/views/components/`
- Review Tailwind config: `tailwind.config.js`
- Read custom styles: `src/public/css/tailwind.css`
