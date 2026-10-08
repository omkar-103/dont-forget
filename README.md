# Don't Forget — Personal Daily Command Center

A high-performance personal daily command center and academic attendance management system with real-time MongoDB Atlas synchronization, priority-based task tracking, assignment deadlines, event management, and checklist workflows.

## Features

- **MongoDB Atlas Cloud Sync**: Direct cloud integration with MongoDB Atlas cluster storing subjects, attendance records, settings, and command center data.
- **Dynamic & Clean Workspace**: Completely dynamic data management with zero hardcoded static values.
- **Smart Attendance Management**: 75% criteria threshold alerts, bunk calculators, theory/practical breakdown, and attendance logging.
- **3-Tier Task Priority System**: High, Medium, and Low priorities with visual indicators and filtering.
- **Assignment & Event Tracking**: Real-time overdue and due date countdown calculations.
- **Checklists for College, Events & Travel**: Pre-organized packs with customizable items.
- **Zero-Friction Access**: Automatic unlock with optional private 8-digit security lock in settings.
- **Dark & Light Mode**: Seamless theming engine with Tailwind CSS.

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster URI

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your MongoDB connection string in `.env`:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.tbhl9le.mongodb.net/<database>?retryWrites=true&w=majority&appName=Cluster0"
MONGODB_DB_NAME="omkarparelkarwebsite"
PORT=3000
```

### 3. Install & Run
```bash
npm install --legacy-peer-deps
npm run dev
```

Visit `http://localhost:3000` to access the Command Center.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Motion
- **Backend**: Express, MongoDB Node Driver, tsx
