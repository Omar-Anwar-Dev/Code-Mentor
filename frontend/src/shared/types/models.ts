// User model
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'Learner' | 'Admin';
    avatar?: string;
    hasCompletedAssessment: boolean;
    createdAt: string;
}

// Assessment models
export interface Track {
    id: string;
    name: string;
    description: string;
    icon: string;
    technologies: string[];
}

export interface Question {
    questionId: string;
    questionNumber: number;
    totalQuestions: number;
    questionText: string;
    options: QuestionOption[];
    difficulty: number;
    category: string;
    topic: string;
}

export interface QuestionOption {
    id: string;
    text: string;
}

export interface AnswerResponse {
    isCorrect: boolean;
    correctOption: string;
    explanation: string;
    nextDifficulty: number;
    questionsRemaining: number;
    currentScore: number;
}

export interface AssessmentResult {
    overallScore: number;
    skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    grade: string;
    categoryScores: CategoryScore[];
    strengths: string[];
    weaknesses: string[];
    recommendations: TaskRecommendation[];
}

export interface CategoryScore {
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
}

// Submission models
export interface Submission {
    id: string;
    taskId: string;
    taskTitle: string;
    submissionType: 'GitHub' | 'Upload';
    repositoryUrl?: string;
    branch?: string;
    fileName?: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
    createdAt: string;
    completedAt?: string;
}

export interface FeedbackReport {
    submissionId: string;
    overallScore: number;
    dimensions: FeedbackDimension[];
    strengths: FeedbackItem[];
    weaknesses: FeedbackItem[];
    quickWins: string[];
    codeIssues: CodeIssue[];
    aiInsights: AIInsight;
    recommendations: TaskRecommendation[];
    resources: LearningResource[];
}

export interface FeedbackDimension {
    name: string;
    score: number;
    maxScore: number;
}

export interface FeedbackItem {
    title: string;
    description: string;
}

export interface CodeIssue {
    id: string;
    file: string;
    line: number;
    endLine?: number;
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    rule: string;
    suggestion?: string;
    documentation?: string;
}

export interface AIInsight {
    summary: string;
    architectureReview: string;
    bestPractices: BestPracticeCheck[];
    detailedStrengths: DetailedFeedback[];
    detailedWeaknesses: DetailedFeedback[];
}

export interface BestPracticeCheck {
    practice: string;
    status: 'pass' | 'fail' | 'partial';
    comment: string;
}

export interface DetailedFeedback {
    title: string;
    description: string;
    examples?: string[];
}

// Learning Path models

// Project Details for comprehensive task information
export interface ProjectDetails {
    overview: string;
    objectives: string[];
    requirements: ProjectRequirement[];
    deliverables: ProjectDeliverable[];
    resources: LearningResource[];
    rubric: RubricItem[];
    submissions?: ProjectSubmission[];
}

export interface ProjectRequirement {
    id: string;
    title: string;
    description: string;
    type: 'technical' | 'knowledge' | 'tool';
}

export interface ProjectDeliverable {
    id: string;
    title: string;
    description: string;
    format: string;
    required: boolean;
}

export interface RubricItem {
    id: string;
    criterion: string;
    description: string;
    maxScore: number;
    score?: number;
    feedback?: string;
}

export interface ProjectSubmission {
    id: string;
    submittedAt: string;
    status: 'pending' | 'reviewed' | 'passed' | 'failed';
    score?: number;
}

export interface LearningPath {
    id: string;
    trackId: string;
    trackName: string;
    skillLevel: string;
    totalTasks: number;
    completedTasks: number;
    estimatedTime: string;
    tasks: LearningTask[];
    recommendedTasks?: RecommendedTask[];
}

export interface LearningTask {
    id: string;
    order: number;
    title: string;
    description: string;
    category: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    estimatedTime: string;
    status: 'not_started' | 'in_progress' | 'completed';
    score?: number;
    prerequisites: string[];
    projectDetails?: ProjectDetails;
    feedbackId?: string;
}

export interface RecommendedTask {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    estimatedTime: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    matchScore: number;
}

export interface TaskRecommendation {
    taskId: string;
    title: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    difficulty: number;
    estimatedTime: string;
    addedToPath?: boolean;
}

export interface LearningResource {
    id: string;
    title: string;
    type: 'article' | 'video' | 'documentation' | 'course';
    url: string;
    duration?: string;
    categories: string[];
}

// Dashboard models
export interface DashboardStats {
    totalSubmissions: number;
    averageScore: number;
    completedTasks: number;
    currentStreak: number;
    totalHoursLearning: number;
}

export interface ActivityItem {
    id: string;
    type: 'submission' | 'assessment' | 'task_completed' | 'achievement';
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

// Admin models
export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    totalSubmissions: number;
    averageScore: number;
    newUsersThisWeek: number;
    submissionsThisWeek: number;
}

export interface UserListItem {
    id: string;
    name: string;
    email: string;
    role: 'Learner' | 'Admin';
    status: 'active' | 'inactive' | 'suspended';
    createdAt: string;
    lastActive: string;
    completedTasks: number;
}
