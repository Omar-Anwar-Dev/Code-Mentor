import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { LearningPath, LearningTask, RecommendedTask } from '@/shared/types';

const mockTasks: LearningTask[] = [
    {
        id: 'task-1',
        order: 1,
        title: 'JavaScript Fundamentals',
        description: 'Master core JavaScript concepts including variables, functions, and control flow.',
        category: 'JavaScript',
        difficulty: 1,
        estimatedTime: '2 hours',
        status: 'completed',
        score: 92,
        prerequisites: [],
        feedbackId: 'fb-task-1',
    },
    {
        id: 'task-2',
        order: 2,
        title: 'ES6+ Features',
        description: 'Learn modern JavaScript features including arrow functions, destructuring, and modules.',
        category: 'JavaScript',
        difficulty: 2,
        estimatedTime: '3 hours',
        status: 'completed',
        score: 88,
        prerequisites: ['task-1'],
        feedbackId: 'fb-task-2',
    },
    {
        id: 'task-3',
        order: 3,
        title: 'React Basics',
        description: 'Introduction to React components, JSX, and component lifecycle.',
        category: 'React',
        difficulty: 2,
        estimatedTime: '4 hours',
        status: 'completed',
        score: 85,
        prerequisites: ['task-2'],
        feedbackId: 'fb-task-3',
    },
    {
        id: 'task-4',
        order: 4,
        title: 'React Hooks',
        description: 'Master useState, useEffect, and custom hooks for state management.',
        category: 'React',
        difficulty: 3,
        estimatedTime: '3 hours',
        status: 'in_progress',
        prerequisites: ['task-3'],
    },
    {
        id: 'task-5',
        order: 5,
        title: 'TypeScript Introduction',
        description: 'Learn TypeScript basics including types, interfaces, and generics.',
        category: 'TypeScript',
        difficulty: 2,
        estimatedTime: '3 hours',
        status: 'not_started',
        prerequisites: ['task-2'],
    },
    {
        id: 'task-6',
        order: 6,
        title: 'React with TypeScript',
        description: 'Combine React and TypeScript for type-safe component development.',
        category: 'React',
        difficulty: 3,
        estimatedTime: '4 hours',
        status: 'not_started',
        prerequisites: ['task-4', 'task-5'],
    },
    {
        id: 'task-7',
        order: 7,
        title: 'State Management with Redux',
        description: 'Learn Redux Toolkit for global state management in React applications.',
        category: 'React',
        difficulty: 3,
        estimatedTime: '5 hours',
        status: 'not_started',
        prerequisites: ['task-6'],
    },
    {
        id: 'task-8',
        order: 8,
        title: 'REST API Integration',
        description: 'Connect your React app to backend APIs using fetch and axios.',
        category: 'Full Stack',
        difficulty: 2,
        estimatedTime: '3 hours',
        status: 'not_started',
        prerequisites: ['task-4'],
    },
    {
        id: 'task-9',
        order: 9,
        title: 'Node.js Fundamentals',
        description: 'Introduction to server-side JavaScript with Node.js.',
        category: 'Node.js',
        difficulty: 2,
        estimatedTime: '4 hours',
        status: 'not_started',
        prerequisites: ['task-2'],
    },
    {
        id: 'task-10',
        order: 10,
        title: 'Express.js API Development',
        description: 'Build RESTful APIs with Express.js and middleware.',
        category: 'Node.js',
        difficulty: 3,
        estimatedTime: '5 hours',
        status: 'not_started',
        prerequisites: ['task-9'],
    },
    {
        id: 'task-11',
        order: 11,
        title: 'Database Design with PostgreSQL',
        description: 'Learn relational database design and SQL queries.',
        category: 'Databases',
        difficulty: 3,
        estimatedTime: '4 hours',
        status: 'not_started',
        prerequisites: ['task-10'],
    },
    {
        id: 'task-12',
        order: 12,
        title: 'Authentication & Authorization',
        description: 'Implement JWT authentication and role-based access control.',
        category: 'Security',
        difficulty: 4,
        estimatedTime: '5 hours',
        status: 'not_started',
        prerequisites: ['task-10', 'task-11'],
    },
];

const mockRecommendedTasks: RecommendedTask[] = [
    {
        id: 'rec-1',
        title: 'Advanced React Patterns',
        description: 'Learn compound components, render props, and higher-order components.',
        category: 'React',
        difficulty: 4,
        estimatedTime: '4 hours',
        reason: 'You\'ve completed React basics with excellent scores!',
        priority: 'high',
        matchScore: 95,
    },
    {
        id: 'rec-2',
        title: 'Testing React Applications',
        description: 'Master Jest, React Testing Library, and end-to-end testing with Cypress.',
        category: 'Testing',
        difficulty: 3,
        estimatedTime: '5 hours',
        reason: 'Essential skill for professional React development.',
        priority: 'high',
        matchScore: 88,
    },
    {
        id: 'rec-3',
        title: 'CSS-in-JS with Styled Components',
        description: 'Explore component-scoped styling with styled-components.',
        category: 'CSS',
        difficulty: 2,
        estimatedTime: '2 hours',
        reason: 'Complements your React knowledge perfectly.',
        priority: 'medium',
        matchScore: 75,
    },
    {
        id: 'rec-4',
        title: 'GraphQL Fundamentals',
        description: 'Introduction to GraphQL queries, mutations, and subscriptions.',
        category: 'API',
        difficulty: 3,
        estimatedTime: '4 hours',
        reason: 'Modern alternative to REST APIs.',
        priority: 'low',
        matchScore: 65,
    },
];

const mockLearningPath: LearningPath = {
    id: 'path-1',
    trackId: '1',
    trackName: 'Full Stack Development',
    skillLevel: 'Intermediate',
    totalTasks: 12,
    completedTasks: 3,
    estimatedTime: '6-8 weeks',
    tasks: mockTasks,
};

interface LearningPathState {
    currentPath: LearningPath | null;
    recommendedTasks: RecommendedTask[];
    selectedTask: LearningTask | null;
    loading: boolean;
    error: string | null;
}

const initialState: LearningPathState = {
    currentPath: mockLearningPath,
    recommendedTasks: mockRecommendedTasks,
    selectedTask: null,
    loading: false,
    error: null,
};

const learningPathSlice = createSlice({
    name: 'learningPath',
    initialState,
    reducers: {
        setCurrentPath: (state, action: PayloadAction<LearningPath>) => {
            state.currentPath = action.payload;
        },
        setSelectedTask: (state, action: PayloadAction<LearningTask | null>) => {
            state.selectedTask = action.payload;
        },
        startTask: (state, action: PayloadAction<string>) => {
            if (state.currentPath) {
                state.currentPath.tasks = state.currentPath.tasks.map(task =>
                    task.id === action.payload ? { ...task, status: 'in_progress' as const } : task
                );
            }
        },
        completeTask: (state, action: PayloadAction<{ taskId: string; score: number }>) => {
            if (state.currentPath) {
                state.currentPath.tasks = state.currentPath.tasks.map(task =>
                    task.id === action.payload.taskId
                        ? { ...task, status: 'completed' as const, score: action.payload.score }
                        : task
                );
                state.currentPath.completedTasks = state.currentPath.tasks.filter(t => t.status === 'completed').length;
            }
        },
        addTaskToPath: (state, action: PayloadAction<LearningTask>) => {
            if (state.currentPath) {
                const newTask = {
                    ...action.payload,
                    order: state.currentPath.tasks.length + 1,
                };
                state.currentPath.tasks.push(newTask);
                state.currentPath.totalTasks = state.currentPath.tasks.length;
            }
        },
        addRecommendedToPath: (state, action: PayloadAction<string>) => {
            const recTask = state.recommendedTasks.find(t => t.id === action.payload);
            if (recTask && state.currentPath) {
                // Convert recommended task to learning task
                const newTask: LearningTask = {
                    id: recTask.id,
                    order: state.currentPath.tasks.length + 1,
                    title: recTask.title,
                    description: recTask.description,
                    category: recTask.category,
                    difficulty: recTask.difficulty,
                    estimatedTime: recTask.estimatedTime,
                    status: 'not_started',
                    prerequisites: [],
                };
                state.currentPath.tasks.push(newTask);
                state.currentPath.totalTasks = state.currentPath.tasks.length;
                // Remove from recommendations
                state.recommendedTasks = state.recommendedTasks.filter(t => t.id !== action.payload);
            }
        },
        setRecommendedTasks: (state, action: PayloadAction<RecommendedTask[]>) => {
            state.recommendedTasks = action.payload;
        },
    },
});

export const {
    setCurrentPath,
    setSelectedTask,
    startTask,
    completeTask,
    addTaskToPath,
    addRecommendedToPath,
    setRecommendedTasks,
} = learningPathSlice.actions;

export default learningPathSlice.reducer;
