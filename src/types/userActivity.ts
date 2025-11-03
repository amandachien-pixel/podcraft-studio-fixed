// 用戶活動記錄類型定義
export interface UserActivity {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  activityType: 'login' | 'script_generate' | 'project_create' | 'project_delete' | 'bible_create' | 'bible_delete' | 'export_script' | 'upload_file' | 'fetch_url';
  activityDetails: {
    description: string;
    data?: Record<string, unknown>;
    projectId?: string;
    bibleId?: string;
    scriptContent?: string;
    fileName?: string;
    url?: string;
    exportFormat?: 'pdf' | 'docx' | 'txt';
  };
  timestamp: Date;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ScriptRecord {
  id: string;
  userId: string;
  userEmail: string;
  projectId: string;
  projectTitle: string;
  bibleTitle: string;
  scriptContent: string;
  generationDate: Date;
  parameters: {
    topic: string;
    keyPoints: string;
    specificInstructions: string;
    referenceMaterial: string;
    model: string;
  };
  wordCount: number;
  duration?: number;
  isExported: boolean;
  exportHistory: Array<{
    format: 'pdf' | 'docx' | 'txt';
    exportDate: Date;
  }>;
}

export interface UserStatistics {
  userId: string;
  userEmail: string;
  userName: string;
  joinDate: Date;
  lastActivity: Date;
  totalLogins: number;
  totalScriptsGenerated: number;
  totalProjectsCreated: number;
  totalExports: number;
  totalWordsGenerated: number;
  averageSessionDuration: number;
  favoriteFormats: string[];
  monthlyActivity: Array<{
    month: string;
    scriptsGenerated: number;
    logins: number;
  }>;
}
