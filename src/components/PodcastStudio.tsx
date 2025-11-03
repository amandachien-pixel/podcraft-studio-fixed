'use client';

import { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '@/lib/firebase';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import {
  LogOut,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  FileText,
  Download,
  Sparkles,
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { userActivityService } from '@/lib/userActivityService';
import { ClientFormattedDate } from './ClientFormattedDate';

// API Configuration
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const AVAILABLE_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-exp-1206',
];

// Types
interface ShowBible {
  id: string;
  userId: string;
  title: string;
  description: string;
  format: string;
  tone: string;
  targetAudience: string;
  duration: string;
  sections: string;
  hostInfo: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  userId: string;
  bibleId: string;
  bibleTitle: string;
  title: string;
  topic: string;
  keyPoints: string;
  specificInstructions: string;
  referenceMaterial: string;
  generatedScript: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function PodcastStudio() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'bibleEditor' | 'projectEditor'>('dashboard');

  // Show Bibles
  const [showBibles, setShowBibles] = useState<ShowBible[]>([]);
  const [editingBible, setEditingBible] = useState<ShowBible | null>(null);

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Script Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        userActivityService.logLogin(
          user.uid,
          user.email || 'unknown',
          user.displayName || 'Unknown User'
        );
        loadUserData(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load user data
  const loadUserData = async (userId: string) => {
    try {
      // Load Show Bibles
      const biblesQuery = query(
        collection(db, 'show_bibles'),
        where('userId', '==', userId)
      );
      const biblesSnapshot = await getDocs(biblesQuery);
      const biblesData = biblesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as ShowBible[];
      setShowBibles(biblesData);

      // Load Projects
      const projectsQuery = query(
        collection(db, 'projects'),
        where('userId', '==', userId)
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Project[];
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('載入資料時發生錯誤');
    }
  };

  // Auth functions
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('登入成功！');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('登入失敗，請重試');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowBibles([]);
      setProjects([]);
      setCurrentView('dashboard');
      toast.success('已登出');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('登出失敗');
    }
  };

  // Show Bible CRUD
  const createOrUpdateBible = async (bibleData: Partial<ShowBible>) => {
    if (!user) return;

    try {
      if (editingBible?.id) {
        // Update existing
        const bibleRef = doc(db, 'show_bibles', editingBible.id);
        await updateDoc(bibleRef, {
          ...bibleData,
          updatedAt: Timestamp.now()
        });
        toast.success('節目聖經已更新');
      } else {
        // Create new
        await addDoc(collection(db, 'show_bibles'), {
          ...bibleData,
          userId: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('節目聖經已創建');

        await userActivityService.logActivity(
          user.uid,
          user.email || '',
          user.displayName || '',
          'bible_create',
          { description: `創建節目聖經: ${bibleData.title}` }
        );
      }

      await loadUserData(user.uid);
      setCurrentView('dashboard');
      setEditingBible(null);
    } catch (error) {
      console.error('Error saving bible:', error);
      toast.error('儲存失敗');
    }
  };

  const deleteBible = async (bibleId: string) => {
    if (!user || !confirm('確定要刪除此節目聖經嗎？')) return;

    try {
      await deleteDoc(doc(db, 'show_bibles', bibleId));
      toast.success('節目聖經已刪除');

      await userActivityService.logActivity(
        user.uid,
        user.email || '',
        user.displayName || '',
        'bible_delete',
        { description: '刪除節目聖經', bibleId }
      );

      await loadUserData(user.uid);
    } catch (error) {
      console.error('Error deleting bible:', error);
      toast.error('刪除失敗');
    }
  };

  // Project CRUD
  const createOrUpdateProject = async (projectData: Partial<Project>) => {
    if (!user) return;

    try {
      if (editingProject?.id) {
        // Update existing
        const projectRef = doc(db, 'projects', editingProject.id);
        await updateDoc(projectRef, {
          ...projectData,
          updatedAt: Timestamp.now()
        });
        toast.success('項目已更新');
      } else {
        // Create new
        await addDoc(collection(db, 'projects'), {
          ...projectData,
          userId: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('項目已創建');

        await userActivityService.logActivity(
          user.uid,
          user.email || '',
          user.displayName || '',
          'project_create',
          { description: `創建項目: ${projectData.title}`, projectId: editingProject?.id }
        );
      }

      await loadUserData(user.uid);
      setCurrentView('dashboard');
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('儲存失敗');
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user || !confirm('確定要刪除此項目嗎？')) return;

    try {
      await deleteDoc(doc(db, 'projects', projectId));
      toast.success('項目已刪除');

      await userActivityService.logActivity(
        user.uid,
        user.email || '',
        user.displayName || '',
        'project_delete',
        { description: '刪除項目', projectId }
      );

      await loadUserData(user.uid);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('刪除失敗');
    }
  };

  // ⭐ 關鍵修復 1 & 2: AI Script Generation with increased token limit and completeness check
  const generateScript = async (project: Project) => {
    if (!user) return;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error('API Key 未設置，請檢查環境變數');
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading('正在生成腳本...');

    try {
      const bible = showBibles.find(b => b.id === project.bibleId);
      if (!bible) {
        toast.error('找不到對應的節目聖經');
        return;
      }

      const prompt = `
你是一位專業的播客腳本撰寫者。請根據以下資訊，創作一份完整的播客節目腳本。

【節目聖經資訊】
- 節目名稱：${bible.title}
- 節目描述：${bible.description}
- 節目格式：${bible.format}
- 語調風格：${bible.tone}
- 目標受眾：${bible.targetAudience}
- 節目時長：${bible.duration}
- 節目架構：${bible.sections}
- 主持人資訊：${bible.hostInfo}

【本集主題】
- 單集標題：${project.title}
- 主題：${project.topic}
- 重點內容：${project.keyPoints}
- 特殊指示：${project.specificInstructions}
- 參考資料：${project.referenceMaterial}

請生成一份完整的播客腳本，包含：
1. 開場白（吸引聽眾注意）
2. 主題介紹
3. 詳細內容（根據重點展開）
4. 互動環節（如有）
5. 總結與結語
6. 結束語（呼籲行動、下集預告等）

**重要：請務必完整撰寫整個腳本，確保有明確的結尾。腳本長度應該充足，至少 3000-5000 字。**
`;

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 32000,  // ✅ 關鍵修復 1: 從 4000 提高到 32000
        }
      };

      const response = await fetch(
        `${API_BASE_URL}${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const scriptContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!scriptContent) {
        toast.error('生成失敗，未收到腳本內容');
        return;
      }

      // ✅ 關鍵修復 2: 腳本完整性檢查
      const wordCount = scriptContent.length;
      const hasEnding = /結束|再見|謝謝收聽|下次見|\[完\]|END|結語|總結/i.test(scriptContent);

      if (wordCount < 500) {
        toast.error('⚠️ 腳本生成失敗或過短，請重試');
      } else if (wordCount < 1500) {
        toast.error(`⚠️ 腳本較短（僅 ${wordCount} 字），可能不完整。建議重新生成或補充內容。`, {
          duration: 6000,
          icon: '⚠️'
        });
      } else if (!hasEnding && wordCount < 5000) {
        toast.error(`⚠️ 腳本可能未完整生成（${wordCount} 字）。請檢查結尾或考慮重新生成。`, {
          duration: 6000,
          icon: '⚠️'
        });
      } else if (wordCount >= 5000 && !hasEnding) {
        toast.success(`腳本已生成（${wordCount} 字），請檢查結尾是否完整。`, {
          duration: 5000
        });
      } else {
        toast.success(`✅ 腳本生成成功！（${wordCount} 字）`, {
          duration: 4000
        });
      }

      // Update project with generated script
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        generatedScript: scriptContent,
        updatedAt: Timestamp.now()
      });

      // Log activity and save script record
      await userActivityService.logScriptGeneration(
        user.uid,
        user.email || '',
        user.displayName || '',
        project.id,
        wordCount
      );

      await userActivityService.saveScriptRecord(
        user.uid,
        user.email || '',
        project.id,
        project.title,
        bible.title,
        scriptContent,
        {
          topic: project.topic,
          keyPoints: project.keyPoints,
          specificInstructions: project.specificInstructions,
          referenceMaterial: project.referenceMaterial,
          model: selectedModel
        }
      );

      await loadUserData(user.uid);
    } catch (error) {
      console.error('Error generating script:', error);
      toast.error('生成腳本時發生錯誤，請重試');
    } finally {
      setIsGenerating(false);
      toast.dismiss(loadingToast);
    }
  };

  // Export functions
  const exportAsPDF = async (project: Project) => {
    if (!user || !project.generatedScript) return;

    try {
      const doc = new jsPDF();

      // Set font (using built-in fonts as custom fonts require additional setup)
      doc.setFontSize(16);
      doc.text(project.title, 20, 20);

      doc.setFontSize(12);
      const lines = doc.splitTextToSize(project.generatedScript, 170);
      doc.text(lines, 20, 35);

      doc.save(`${project.title}.pdf`);

      await userActivityService.logExport(
        user.uid,
        user.email || '',
        user.displayName || '',
        project.id,
        'pdf'
      );

      toast.success('已匯出為 PDF');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('匯出 PDF 失敗');
    }
  };

  const exportAsDOCX = async (project: Project) => {
    if (!user || !project.generatedScript) return;

    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: project.title,
                  bold: true,
                  size: 32
                })
              ]
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({
                  text: project.generatedScript,
                  size: 24
                })
              ]
            })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${project.title}.docx`);

      await userActivityService.logExport(
        user.uid,
        user.email || '',
        user.displayName || '',
        project.id,
        'docx'
      );

      toast.success('已匯出為 DOCX');
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      toast.error('匯出 DOCX 失敗');
    }
  };

  const exportAsTXT = (project: Project) => {
    if (!user || !project.generatedScript) return;

    try {
      const blob = new Blob([project.generatedScript], { type: 'text/plain' });
      saveAs(blob, `${project.title}.txt`);

      userActivityService.logExport(
        user.uid,
        user.email || '',
        user.displayName || '',
        project.id,
        'txt'
      );

      toast.success('已匯出為 TXT');
    } catch (error) {
      console.error('Error exporting TXT:', error);
      toast.error('匯出 TXT 失敗');
    }
  };

  // UI Components
  const LoginScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PodcastStudio</h1>
          <p className="text-gray-600">AI 驅動的播客腳本生成系統</p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          使用 Google 登入
        </button>
      </div>
    </div>
  );

  const Header = () => (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">PodcastStudio</h1>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {user?.displayName || user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            登出
          </button>
        </div>
      </div>
    </header>
  );

  const Dashboard = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-700 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">重要提示</h3>
            <p className="text-sm text-yellow-800">
              本系統已升級 Token 限制至 32,000，並添加腳本完整性檢查。如腳本過短或不完整，系統會自動提示。
            </p>
          </div>
        </div>
      </div>

      {/* Show Bibles Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            節目聖經
          </h2>
          <button
            onClick={() => {
              setEditingBible(null);
              setCurrentView('bibleEditor');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增聖經
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {showBibles.map(bible => (
            <div key={bible.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{bible.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{bible.description}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingBible(bible);
                    setCurrentView('bibleEditor');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  編輯
                </button>
                <button
                  onClick={() => deleteBible(bible.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  刪除
                </button>
              </div>
            </div>
          ))}

          {showBibles.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              尚無節目聖經，點擊「新增聖經」開始創建
            </div>
          )}
        </div>
      </section>

      {/* Projects Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            單集項目
          </h2>
          <button
            onClick={() => {
              if (showBibles.length === 0) {
                toast.error('請先創建節目聖經');
                return;
              }
              setEditingProject(null);
              setCurrentView('projectEditor');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增項目
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {projects.map(project => (
            <div key={project.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{project.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">節目聖經: {project.bibleTitle}</p>
                  <p className="text-sm text-gray-700">{project.topic}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingProject(project);
                      setCurrentView('projectEditor');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    編輯
                  </button>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    刪除
                  </button>
                </div>
              </div>

              {project.generatedScript ? (
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">已生成腳本 ({project.generatedScript.length} 字)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportAsPDF(project)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                      <button
                        onClick={() => exportAsDOCX(project)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        DOCX
                      </button>
                      <button
                        onClick={() => exportAsTXT(project)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        TXT
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded max-h-48 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap">
                    {project.generatedScript.substring(0, 500)}...
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => generateScript(project)}
                  disabled={isGenerating}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? '生成中...' : '生成腳本'}
                </button>
              )}
            </div>
          ))}

          {projects.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              尚無項目，點擊「新增項目」開始創建
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const ShowBibleEditor = () => {
    const [formData, setFormData] = useState({
      title: editingBible?.title || '',
      description: editingBible?.description || '',
      format: editingBible?.format || '',
      tone: editingBible?.tone || '',
      targetAudience: editingBible?.targetAudience || '',
      duration: editingBible?.duration || '',
      sections: editingBible?.sections || '',
      hostInfo: editingBible?.hostInfo || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      createOrUpdateBible(formData);
    };

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingBible ? '編輯節目聖經' : '新增節目聖經'}
            </h2>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setEditingBible(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                節目名稱 *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="輸入節目名稱"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                節目描述 *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="描述節目的主要內容和目標"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  節目格式
                </label>
                <input
                  type="text"
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例：訪談、獨白、多人對談"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  語調風格
                </label>
                <input
                  type="text"
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例：輕鬆幽默、專業嚴謹"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目標受眾
                </label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例：20-35歲都市上班族"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  節目時長
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例：30-45分鐘"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                節目架構
              </label>
              <textarea
                value={formData.sections}
                onChange={(e) => setFormData({ ...formData, sections: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="例：開場 (2分鐘) → 主題介紹 (5分鐘) → 深入探討 (20分鐘) → 總結 (3分鐘)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                主持人資訊
              </label>
              <textarea
                value={formData.hostInfo}
                onChange={(e) => setFormData({ ...formData, hostInfo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="主持人背景、風格等資訊"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                儲存
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('dashboard');
                  setEditingBible(null);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ProjectEditor = () => {
    const [formData, setFormData] = useState({
      bibleId: editingProject?.bibleId || (showBibles[0]?.id || ''),
      title: editingProject?.title || '',
      topic: editingProject?.topic || '',
      keyPoints: editingProject?.keyPoints || '',
      specificInstructions: editingProject?.specificInstructions || '',
      referenceMaterial: editingProject?.referenceMaterial || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const selectedBible = showBibles.find(b => b.id === formData.bibleId);
      if (!selectedBible) {
        toast.error('請選擇節目聖經');
        return;
      }

      createOrUpdateProject({
        ...formData,
        bibleTitle: selectedBible.title,
        generatedScript: editingProject?.generatedScript || ''
      });
    };

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingProject ? '編輯項目' : '新增項目'}
            </h2>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setEditingProject(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇節目聖經 *
              </label>
              <select
                required
                value={formData.bibleId}
                onChange={(e) => setFormData({ ...formData, bibleId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {showBibles.map(bible => (
                  <option key={bible.id} value={bible.id}>
                    {bible.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                單集標題 *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="輸入單集標題"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                主題 *
              </label>
              <textarea
                required
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="描述本集的主要主題"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                重點內容
              </label>
              <textarea
                value={formData.keyPoints}
                onChange={(e) => setFormData({ ...formData, keyPoints: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="列出本集要討論的重點（一行一個）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                特殊指示
              </label>
              <textarea
                value={formData.specificInstructions}
                onChange={(e) => setFormData({ ...formData, specificInstructions: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="任何特殊要求或指示"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                參考資料
              </label>
              <textarea
                value={formData.referenceMaterial}
                onChange={(e) => setFormData({ ...formData, referenceMaterial: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="貼上參考資料、連結或內容"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                儲存
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('dashboard');
                  setEditingProject(null);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Header />

      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'bibleEditor' && <ShowBibleEditor />}
      {currentView === 'projectEditor' && <ProjectEditor />}
    </div>
  );
}
