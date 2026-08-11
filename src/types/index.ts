// 10,000-Foot View:
// Core TypeScript interfaces mapping our frontend models to the backend REST API payload structures.

export interface User {
  id: number;
  username: string;
  email: string;
  focus_limit: number;
  avatar_url?: string | null;
  created_at: string;
}

export interface Skill {
  id: number;
  user_id: number;
  name: string;
  target_hours: number;
  priority: number; // 1-5
  focus_minutes: number;
  break_minutes: number;
  total_seconds_logged: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  skill_id: number;
  user_id: number;
  duration_seconds: number;
  started_at: string;
  completed_at: string;
  was_completed: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface LevelInfo {
  name: string;
  badge: string;
  color: string;
  minHours: number;
  nextLevelName?: string;
  nextLevelHours?: number;
}
