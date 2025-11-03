import { db } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  limit
} from 'firebase/firestore';
import { UserActivity, ScriptRecord } from '@/types/userActivity';

class UserActivityService {
  private activitiesCollection = 'user_activities';
  private scriptsCollection = 'script_records';

  // Generate a session ID for the current session
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current session ID from sessionStorage (browser only)
  private getSessionId(): string {
    if (typeof window === 'undefined') return this.generateSessionId();

    let sessionId = sessionStorage.getItem('podcastStudioSessionId');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('podcastStudioSessionId', sessionId);
    }
    return sessionId;
  }

  // Log a user activity
  async logActivity(
    userId: string,
    userEmail: string,
    userName: string,
    activityType: UserActivity['activityType'],
    activityDetails: UserActivity['activityDetails']
  ): Promise<void> {
    try {
      const activity = {
        userId,
        userEmail,
        userName,
        activityType,
        activityDetails,
        timestamp: Timestamp.now(),
        sessionId: this.getSessionId(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
      };

      await addDoc(collection(db, this.activitiesCollection), activity);
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - logging should not break the app
    }
  }

  // Save a script record
  async saveScriptRecord(
    userId: string,
    userEmail: string,
    projectId: string,
    projectTitle: string,
    bibleTitle: string,
    scriptContent: string,
    parameters: ScriptRecord['parameters']
  ): Promise<string | null> {
    try {
      const wordCount = scriptContent.length;

      const scriptRecord = {
        userId,
        userEmail,
        projectId,
        projectTitle,
        bibleTitle,
        scriptContent,
        generationDate: Timestamp.now(),
        parameters,
        wordCount,
        isExported: false,
        exportHistory: []
      };

      const docRef = await addDoc(collection(db, this.scriptsCollection), scriptRecord);
      return docRef.id;
    } catch (error) {
      console.error('Error saving script record:', error);
      return null;
    }
  }

  // Get user activities
  async getUserActivities(userId: string, limitCount: number = 50): Promise<UserActivity[]> {
    try {
      const q = query(
        collection(db, this.activitiesCollection),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const activities: UserActivity[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate()
        } as UserActivity);
      });

      return activities;
    } catch (error) {
      console.error('Error getting user activities:', error);
      return [];
    }
  }

  // Get user script records
  async getUserScriptRecords(userId: string, limitCount: number = 20): Promise<ScriptRecord[]> {
    try {
      const q = query(
        collection(db, this.scriptsCollection),
        where('userId', '==', userId),
        orderBy('generationDate', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const scripts: ScriptRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scripts.push({
          id: doc.id,
          ...data,
          generationDate: data.generationDate.toDate(),
          exportHistory: data.exportHistory?.map((exp: { format: 'pdf' | 'docx' | 'txt'; exportDate: { toDate: () => Date } }) => ({
            ...exp,
            exportDate: exp.exportDate.toDate()
          })) || []
        } as ScriptRecord);
      });

      return scripts;
    } catch (error) {
      console.error('Error getting user script records:', error);
      return [];
    }
  }

  // Log login activity
  async logLogin(userId: string, userEmail: string, userName: string): Promise<void> {
    await this.logActivity(userId, userEmail, userName, 'login', {
      description: 'User logged in',
      data: { loginTime: new Date().toISOString() }
    });
  }

  // Log script generation
  async logScriptGeneration(
    userId: string,
    userEmail: string,
    userName: string,
    projectId: string,
    scriptLength: number
  ): Promise<void> {
    await this.logActivity(userId, userEmail, userName, 'script_generate', {
      description: `Generated script with ${scriptLength} characters`,
      projectId,
      data: { scriptLength }
    });
  }

  // Log export
  async logExport(
    userId: string,
    userEmail: string,
    userName: string,
    projectId: string,
    format: 'pdf' | 'docx' | 'txt'
  ): Promise<void> {
    await this.logActivity(userId, userEmail, userName, 'export_script', {
      description: `Exported script as ${format.toUpperCase()}`,
      projectId,
      exportFormat: format
    });
  }
}

export const userActivityService = new UserActivityService();
