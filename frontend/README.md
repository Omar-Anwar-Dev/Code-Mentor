# AI-Powered Learning Platform - Frontend

A React + TypeScript frontend for an AI-powered learning and code review platform.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=https://api.platform.com
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_ENABLE_ANALYTICS=true
```

## 📁 Project Structure

```
src/
├── app/                # Redux store configuration
├── features/           # Feature-based modules
│   ├── auth/          # Authentication
│   ├── assessment/    # Skill assessments
│   ├── submissions/   # Code submissions
│   ├── learningPath/  # Learning paths
│   ├── dashboard/     # User dashboard
│   └── admin/         # Admin panel
├── components/        # Reusable components
│   ├── ui/           # UI primitives (Button, Input, Card, etc.)
│   ├── layout/       # Layout components
│   └── common/       # Common utilities
├── types/            # TypeScript types
├── styles/           # Global styles
└── router.tsx        # Route definitions
```

## ✨ Features

- **Authentication**: Email/Password and GitHub OAuth (static demo)
- **Adaptive Assessment**: 30-question skill tests with difficulty adjustment
- **Code Submissions**: GitHub URL or ZIP file upload
- **AI Feedback**: Comprehensive code review with charts and insights
- **Learning Path**: Personalized task progression
- **Admin Panel**: User and task management

## 🛠️ Tech Stack

- React 18 + TypeScript
- Vite
- Redux Toolkit + Redux Persist
- React Router v6
- Tailwind CSS
- Headless UI
- Recharts
- React Hook Form + Zod
- Lucide Icons

## 📝 Notes

This is a **static UI/UX demo** with mock data. No actual API calls are made. All authentication, submissions, and data are simulated for demonstration purposes.

## 👤 Demo Login

- **Learner**: Any email/password on the login page
- **Admin**: Switch to "Admin" tab on the login page

Both options will mock-login and redirect to the appropriate dashboard.
