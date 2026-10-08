# Task Priority System & Visual Indicators Implementation Report

## Executive Summary
This document provides a comprehensive technical and functional specification of the **3-Tier Priority System (Low, Medium, High)** implemented across the **Don't Forget** Personal Daily Command Center, with particular emphasis on **TasksView** and its visual indicators for high-priority items.

---

## 1. Objectives & Scope
The goal of this update is to give users immediate, visual clarity on their most critical obligations without cognitive overload or visual clutter ("anti-AI slop" design discipline). The system addresses three primary requirements:
1. **Clear 3-Tier Taxonomy**: Standardizing tasks into **High**, **Medium**, and **Low** priority tiers.
2. **High-Impact Visual Indicators**: Introducing unmistakable visual cues for High-Priority tasks (striking badges, flame icons, vibrant accent borders, ambient warmth tints, custom checkbox focus rings, and urgent attention banners).
3. **App-Wide Harmony**: Ensuring seamless filtering, dynamic counters, quick-action reprioritization, modal creation, and cross-view synchronicity (Today dashboard, Calendar agenda, and Global Search).

---

## 2. Priority Taxonomy & Semantics

| Priority Level | Visual Icon | Design Tokens & Badges | Semantics & Intended Usage |
| :--- | :---: | :--- | :--- |
| **High** | 🔥 `Flame` | Crimson / Rose (`#f43f5e`), `border-l-[5px]`, `ring-1 ring-rose-500/15`, `bg-rose-100 text-rose-700` badge | **Urgent & Critical**: Must be addressed today. Immediate impact on exams, projects, or essential deadlines. |
| **Medium** | ⚡ `Zap` / `Minus` | Amber (`#f59e0b`), `border-l-[4px]`, `bg-amber-50 text-amber-800` badge | **Standard**: Important daily coursework, lecture attendance, routines, or scheduled milestones. |
| **Low** | 🌱 `ArrowDown` | Cool Slate (`#64748b`), `border-l-[3px]`, `bg-slate-100 text-slate-600` badge | **Nice to Have / Low Impact**: Minor follow-ups, optional notes, errands, or non-urgent reminders. |

---

## 3. Visual Indicator Architecture for High-Priority Items

To make high-priority items instantly distinguishable at a glance, a multi-layered visual hierarchy was established:

### 3.1. Accent Border & Surface Treatment
- **Heavy Left Accent Border**: A 5px thick crimson left border (`border-l-[5px] border-l-rose-500 dark:border-l-rose-500`) anchors the card.
- **Ambient Gradient Surface**: Rather than a flat, monotonous card background, high-priority tasks use a subtle warm horizontal gradient:
  - Light mode: `bg-gradient-to-r from-rose-50/40 via-white to-white`
  - Dark mode: `dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900`
- **Subtle Focus Ring**: `ring-1 ring-rose-500/15 border-rose-200 dark:border-rose-900/60` adds depth and draws peripheral focus.

### 3.2. Striking High-Priority Badge
- Rendered right next to the task title:
  ```tsx
  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-md border border-rose-300 dark:border-rose-800 shrink-0 shadow-2xs">
    <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 fill-rose-600 dark:fill-rose-400" />
    <span>High Priority</span>
  </span>
  ```

### 3.3. Interactive Action Checkbox
- When unchecked, the completion box is bordered in crimson red (`border-2 border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 ring-2 ring-rose-500/15 hover:border-rose-600`), contrasting with standard slate checkboxes.
- Tapping completes the task, striking through the title and lowering opacity to 75% so completed items gracefully step back.

### 3.4. Metadata Line Formatting
- The unboxed metadata separator (`·`) highlights priority with the flame icon:
  - `🔥 High Priority` in bold crimson (`text-rose-600 dark:text-rose-400 font-bold`).
  - `⚡ Medium Priority` in amber (`text-amber-600 dark:text-amber-400 font-semibold`).
  - `🌱 Low Priority` in muted slate (`text-slate-500 dark:text-slate-400`).

### 3.5. Urgent Attention Callout Banner
- If there are uncompleted High-Priority tasks scheduled for or overdue on the active date, a prominent banner appears at the top of TasksView:
  - Displays: `"X High-Priority Tasks Need Attention — Urgent & important action items due on or before today"`.
  - Includes a 1-click **"Focus High"** button that immediately activates the High Priority filter.

---

## 4. TasksView Filter & Sorting Controls

### 4.1. Real-Time Dynamic Priority Counters
The segmented filter bar displays real-time task counts dynamically computed based on active status and context filters:
- **All (N)**
- **High (N)** with `Flame` icon and crimson highlight
- **Medium (N)** with `Minus` icon and amber highlight
- **Low (N)** with `ArrowDown` icon and emerald highlight

### 4.2. Multi-Criteria Sorting Engine
Added a dropdown sorter (`Sort:`):
1. **Priority (High → Low)**: High priority items float to the top, followed by Medium, then Low. Completed items sink to the bottom.
2. **Due Date**: Chronological date order.
3. **Title (A-Z)**: Alphabetical ordering.

### 4.3. 1-Click Priority Switcher in Context Popover
Clicking the `MoreVertical` (3 dots) menu on any task reveals an instant priority adjustment grid:
- `[ High 🔥 ]`
- `[ Med ⚡ ]`
- `[ Low 🌱 ]`
Users can change task priority with a single click without opening the edit dialog.

---

## 5. Modal & Form Enhancements

### 5.1. QuickAddModal (`src/components/QuickAddModal.tsx`)
- Updated the Priority dropdown with clear descriptors:
  - `🔥 High (Urgent & Important)`
  - `⚡ Medium (Standard)`
  - `🌱 Low (Nice to have)`
- Default task priority is set to `Medium`.

### 5.2. Task Edit Modal (`src/components/tasks/TasksView.tsx`)
- Added full support for switching between High, Medium, and Low.
- Clean validation and instantaneous state update via `updateTask`.

---

## 6. App-Wide Integration

### 6.1. Today Dashboard (`src/components/today/TodayView.tsx`)
- Section 5 rebranded to **High-Priority Tasks** with flame badge, red accent borders, and completion fraction counter (`X / Total`).
- Backward compatibility: catches both `'High'` and legacy `'Major'` tasks.

### 6.2. Calendar View (`src/components/calendar/CalendarView.tsx`)
- The selected day agenda displays high-priority tasks with the crimson left border and `🔥 High` badge.

### 6.3. Global Search (`src/components/SearchModal.tsx`)
- Real-time search displays the `🔥 High` priority badge on search hits, allowing users to spot high-priority items directly from the search overlay.

---

## 7. Data Storage & Backward Compatibility Migration

### 7.1. TypeScript Type Definitions (`src/types/index.ts`)
```typescript
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Major' | 'Minor';
```
Maintains union compatibility with legacy types while establishing `'Low' | 'Medium' | 'High'` as standard.

### 7.2. Automated Migration Engine (`src/utils/storage.ts`)
When `loadAppData()` executes:
- Any existing tasks with `priority === 'Major'` are automatically migrated to `'High'`.
- Any existing tasks with `priority === 'Minor'` are automatically migrated to `'Low'`.
- Missing or invalid priority values fallback safely to `'Medium'`.
- Default seed tasks updated to demonstrate a realistic mix of High, Medium, and Low priorities.

---

## 8. Verification & Build Integrity
- **Compilation**: Verified via `compile_applet`.
- **Linting**: Verified with zero TypeScript or JSX syntax errors.
- **Responsive Design**: Tested with mobile touch targets ($44\text{px}+$ touch targets, safe padding).
