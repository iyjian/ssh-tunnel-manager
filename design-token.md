# AI Minimal Flat Design Tokens

---

## 1. Color System

### 1.1 Neutral (Structure Layer)

--color-bg-page: #F4F7FB;
--color-bg-surface: #FFFFFF;
--color-bg-subtle: #F1F5F9;
--color-border-default: #E2E8F0;
--color-border-strong: #CBD5E1;
--color-divider: #E5EAF2;

--color-shadow-soft: rgba(15, 23, 42, 0.04);

---

### 1.2 Text Colors

--color-text-primary: #0B1220;
--color-text-secondary: #334155;
--color-text-tertiary: #64748B;
--color-text-disabled: #94A3B8;
--color-text-inverse: #FFFFFF;

---

### 1.3 AI Accent (Tech Cyan-Blue Hybrid)

--color-primary-50:  #ECFEFF;
--color-primary-100: #CFFAFE;
--color-primary-200: #A5F3FC;
--color-primary-300: #67E8F9;
--color-primary-400: #22D3EE;
--color-primary-500: #06B6D4;   /* Primary */
--color-primary-600: #0891B2;
--color-primary-700: #0E7490;
--color-primary-800: #155E75;
--color-primary-900: #164E63;

--color-primary-hover: #0891B2;
--color-primary-active: #0E7490;

---

### 1.4 Functional Colors

Success:
--color-success-500: #16A34A;
--color-success-bg:  #DCFCE7;

Warning:
--color-warning-500: #F59E0B;
--color-warning-bg:  #FEF3C7;

Error:
--color-error-500: #DC2626;
--color-error-bg:  #FEE2E2;

Info:
--color-info-500: #0EA5E9;
--color-info-bg:  #E0F2FE;

---

## 2. Typography

### Font Family

--font-family-base: "Inter", "Segoe UI", "PingFang SC", sans-serif;
--font-family-mono: "JetBrains Mono", monospace;

### Font Sizes

--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-md: 16px;
--font-size-lg: 18px;
--font-size-xl: 20px;
--font-size-2xl: 24px;

### Font Weights

--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;

---

## 3. Spacing System (8px Grid)

--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 40px;
--space-8: 48px;

---

## 4. Radius

--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;

Recommended:
Cards → 8px
Buttons → 6px
Tags → 4px

---

## 5. Elevation (Minimal Flat — very subtle)

--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
--shadow-md: 0 2px 6px rgba(15, 23, 42, 0.06);

Rule:
No heavy shadow.
No glow.
No gradient.

---

## 6. Component Tokens

### Button

Primary:
background: var(--color-primary-500);
color: #FFFFFF;
hover: var(--color-primary-600);

Secondary:
background: #FFFFFF;
border: 1px solid var(--color-primary-500);
color: var(--color-primary-600);

Ghost:
background: transparent;
color: var(--color-primary-600);

---

### Card

background: #FFFFFF;
border: 1px solid var(--color-border-default);
border-radius: 8px;
box-shadow: var(--shadow-sm);

---

### Table

Header background: var(--color-bg-subtle);
Row hover: #F8FAFC;
Border: var(--color-border-default);

---

### Tag (AI Style)

background: var(--color-primary-100);
color: var(--color-primary-700);
border-radius: 4px;

---

## 7. Interaction States

Hover:
opacity: 0.9;

Active:
transform: scale(0.98);

Disabled:
opacity: 0.5;
cursor: not-allowed;

Transition:
all 0.2s ease;
