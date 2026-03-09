/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Beaker, 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  Database, 
  History, 
  Loader2, 
  LogOut, 
  Plus, 
  QrCode, 
  Save, 
  Settings, 
  Trash2, 
  User,
  AlertCircle,
  RefreshCw,
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  Calendar as CalendarIcon,
  Calculator,
  ChevronLeft,
  X,
  TrendingUp,
  Activity,
  Layers,
  Users,
  Search,
  FileText,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Thermometer,
  Scan,
  Calendar,
  Clock,
  Microscope,
  Dna,
  Atom,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// --- Types ---

interface Reagent {
  format: string;
  process: string;
  reagentName: string;
  componentName: string;
  amount: number;
}

interface ComponentEntry {
  name: string;
  amount: number;
  checked: boolean;
}

interface LogEntry {
  reagentName: string;
  components: ComponentEntry[];
  timestamp: string;
  isFullyChecked: boolean;
  isExpanded?: boolean;
}

interface UserInfo {
  name: string;
  email: string;
  picture: string;
}

interface ScheduleData {
  sheetName: string;
  currentSheetId: number;
  upcomingSheetId: number;
  schedule: Array<{
    date: string;
    day1: { "96": string, "384": string };
    day2: string;
    wash: string[];
    utilization: number[]; // GT1, GT2, GT3, GT4
  }>;
  stats: {
    weeklySamples: number;
    monthlySamples: number;
    weeklyUtilization: number[];
  };
  announcements: string[];
}

interface Task {
  category: string;
  task: string;
  completed: boolean;
  assignee?: string;
}

interface Issue {
  date: string;
  type: string;
  description: string;
  status: string;
  reporter: string;
  estimatedCause?: string;
  followUpAction?: string;
  photo?: string;
}

interface ChipQCData {
  date: string;
  chipId: string;
  total: number;
  fail: number;
  genderMismatch: number;
  validation: string;
  issue: string;
}

interface FailedChip {
  id: number;
  date: string;
  chipId: string;
  description: string;
  coordinates: string;
  chipType: string;
  expiryDate: string;
  dnaConcentration: number;
  dqc: number;
  callRate: number;
  qcCallRate: number;
  results: string; // JSON string
  photoUrl: string;
  createdAt?: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

type View = 'dashboard' | 'schedule' | 'reagent-prep' | 'chq-board' | 'issues' | 'timeline';

// --- Components ---

const TimerModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [inputMinutes, setInputMinutes] = useState('0');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, timeLeft]);

  const startTimer = () => {
    if (timeLeft === 0) {
      const seconds = parseInt(inputMinutes) * 60;
      if (seconds > 0) setTimeLeft(seconds);
      else return;
    }
    setIsRunning(true);
  };

  const pauseTimer = () => setIsRunning(false);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] shadow-2xl w-full max-w-xs overflow-hidden border border-stone-200 p-8">
        <div className="flex justify-between items-center mb-8">
          <span className="text-sm font-bold uppercase tracking-widest text-stone-400">Timer</span>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-all"><X className="w-5 h-5 text-stone-400" /></button>
        </div>
        
        <div className="flex flex-col items-center justify-center mb-10">
          {timeLeft > 0 || isRunning ? (
            <div className="text-6xl font-light tracking-tighter text-stone-900 mb-2">{formatTime(timeLeft)}</div>
          ) : (
            <div className="flex items-baseline gap-2 mb-2">
              <input 
                type="number" 
                value={inputMinutes} 
                onChange={(e) => setInputMinutes(e.target.value)}
                className="text-6xl font-light tracking-tighter text-stone-900 w-24 text-center focus:outline-none bg-transparent"
              />
              <span className="text-xl text-stone-400 font-medium">min</span>
            </div>
          )}
          <div className="w-48 h-1 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-orange-500"
              initial={{ width: '0%' }}
              animate={{ width: isRunning ? '100%' : '0%' }}
              transition={{ duration: timeLeft, ease: 'linear' }}
            />
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button 
            onClick={resetTimer}
            className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold hover:bg-stone-200 transition-all"
          >
            Reset
          </button>
          {isRunning ? (
            <button 
              onClick={pauseTimer}
              className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-200 transition-all"
            >
              Pause
            </button>
          ) : (
            <button 
              onClick={startTimer}
              className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all"
            >
              Start
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const CalculatorModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(equation + display);
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden border border-stone-200"
      >
        <div className="p-4 bg-white border-b border-stone-100 text-stone-900 flex justify-between items-center">
          <span className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-stone-400"><Calculator className="w-4 h-4" /> Calculator</span>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-lg transition-all text-stone-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 bg-stone-50 text-right">
          <div className="text-xs text-stone-400 h-4 mb-1">{equation}</div>
          <div className="text-3xl font-mono font-bold text-stone-900 truncate">{display}</div>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4">
          {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'].map(btn => (
            <button
              key={btn}
              onClick={() => {
                if (btn === '=') calculate();
                else if (['+', '-', '*', '/'].includes(btn)) handleOperator(btn);
                else handleNumber(btn);
              }}
              className={`h-12 rounded-xl font-mono font-bold text-lg transition-all active:scale-95 ${
                btn === '=' ? 'bg-emerald-600 text-white col-span-1' : 
                ['+', '-', '*', '/'].includes(btn) ? 'bg-stone-200 text-stone-900' : 'bg-white border border-stone-200 text-stone-600'
              }`}
            >
              {btn}
            </button>
          ))}
          <button onClick={clear} className="col-span-4 h-12 bg-red-50 text-red-600 rounded-xl font-bold mt-2 border border-red-100">CLEAR</button>
        </div>
      </motion.div>
    </div>
  );
};

// Helper to parse #p format (e.g., P1-3 -> 3, A1 -> 1)
function parsePlateCount(pStr: string): number {
  if (!pStr) return 0;
  const match = pStr.match(/[PA](\d+)(?:-(\d+))?/i);
  if (!match) return 0;
  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : start;
  return end - start + 1;
}

const SCHEDULE_SPREADSHEET_ID = '1hfq2hqZgfwSOySR8KDtVh9Y4Flrb6RYbEgIOdcHUsII';

const RECURRING_TASKS = {
  "Reagent Prep": [
    "Day 1_96",
    "Day 1_384",
    "Day 2_AM",
    "Day 2_PM",
    "Stbl, Lig",
    "S1, S2"
  ],
  "Experiment Prep": [
    "DNA input 사진 촬영 및 업로드",
    "DNA pellet 사진 촬영 및 업로드",
    "Chip 바코드 등록",
    "Sample sheet 업로드",
    "Transfer",
    "M1_96, M4 at RT",
    "M1_384 at RT",
    "M2 at RT",
    "M1_96 at 4°C",
    "M2 at 4°C"
  ],
  "Wash": [
    "Wash - 🌅",
    "Wash - 🌞",
    "Wash - 🌙"
  ],
  "Hyb": [
    "Hyb - 🌅",
    "Hyb - 🌞",
    "Hyb - 🌙",
    "주간 hyb 일정 수립"
  ],
  "기타": [
    "Rescan/chip 보관",
    "QC_OD",
    "CHQ",
    "재실험/재채취 기록"
  ]
};

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chipQCData, setChipQCData] = useState<ChipQCData[]>([]);
  
  // Reagent Prep State
  const [selectedProcess, setSelectedProcess] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [batchSize, setBatchSize] = useState<string>('');
  const [lot1, setLot1] = useState<string>('');
  const [lot2, setLot2] = useState<string>('');
  const [operators, setOperators] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [washSlot, setWashSlot] = useState<'Total' | '#1' | '#2' | '#3'>('Total');
  const [scheduleWeek, setScheduleWeek] = useState<'CURRENT' | 'UPCOMING'>('CURRENT');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeLotField, setActiveLotField] = useState<'lot1' | 'lot2'>('lot1');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [alarmsEnabled, setAlarmsEnabled] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [failedChips, setFailedChips] = useState<FailedChip[]>([]);
  const [chipQCWorkspace, setChipQCWorkspace] = useState<any[]>([]);
  const [activeProfileEmoji, setActiveProfileEmoji] = useState('🧪');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [pelletPhoto, setPelletPhoto] = useState<string>('');
  const [timelineChipP, setTimelineChipP] = useState('');
  const [timelineChipB, setTimelineChipB] = useState('');
  const [completionTime, setCompletionTime] = useState('');
  const [personIcons, setPersonIcons] = useState<Record<string, any>>({
    'Person A': User,
    'Person B': Beaker,
    'Person C': FlaskConical
  });

  // UI State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isStatsDetailOpen, setIsStatsDetailOpen] = useState(false);
  const [statsDetailType, setStatsDetailType] = useState<'weekly' | 'monthly'>('weekly');
  const [issueFilters, setIssueFilters] = useState({ type: 'All', start: '', end: '' });
  const [chipQCFilters, setChipQCFilters] = useState({ start: '', end: '' });
  const [issueTab, setIssueTab] = useState<'log' | 'stats'>('log');
  const [reportModal, setReportModal] = useState<{ open: boolean, type: 'weekly' | 'monthly', content: string }>({ open: false, type: 'weekly', content: '' });
  const [reportLoading, setReportLoading] = useState(false);
  const [newIssue, setNewIssue] = useState({ 
    type: 'GT1', 
    description: '', 
    status: 'Open',
    estimatedCause: '',
    followUpAction: '',
    photo: ''
  });
  const [newTask, setNewTask] = useState({ category: 'GM', task: '' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const issueTypes = [
    'GT1', 'GT2', 'GT3', 'GT4', 'GTS', 
    'MC1', 'MC2', 'Day 1', 'Day 2_AM', 'Day 2_PM', 
    'Wash RGT', 'QC_OD', 'Hyb', 'Chip result', 'Human Error'
  ];

  // --- Auth & Data Fetching ---

  useEffect(() => {
    checkAuth();
    
    const handleFocus = () => {
      console.log("Window focused, checking auth...");
      checkAuth();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      const data = await res.json();
      console.log("Auth status check:", data);
      setIsAuthenticated(data.isAuthenticated);
      if (data.isAuthenticated) {
        fetchUserInfo();
        fetchAllData();
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const res = await fetch('/api/auth/user', { credentials: 'include' });
      if (res.status === 401) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.error("Failed to fetch user info", e);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch('/api/reagents', { credentials: 'include' }),
        fetch('/api/schedule', { credentials: 'include' }),
        fetch('/api/issues', { credentials: 'include' }),
        fetch('/api/tasks', { credentials: 'include' }),
        fetch('/api/chip-qc', { credentials: 'include' }),
        fetch('/api/calendar/events', { credentials: 'include' }),
        fetch('/api/chip-qc/failed', { credentials: 'include' }),
        fetch('/api/chip-qc/workspace', { credentials: 'include' })
      ]);
      
      const isUnauthorized = responses.some(res => res.status === 401);
      if (isUnauthorized) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const [reagentsData, sData, issuesData, tasksData, chipData, calEvents, failedChipsData, workspaceData] = await Promise.all(
        responses.map(res => res.json())
      );
      
      if (reagentsData && Array.isArray(reagentsData.reagents)) {
        setReagents(reagentsData.reagents);
      }
      
      setScheduleData(sData);
      setIssues(Array.isArray(issuesData) ? issuesData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setChipQCData(Array.isArray(chipData) ? chipData : []);
      setCalendarEvents(Array.isArray(calEvents) ? calEvents : []);
      setFailedChips(Array.isArray(failedChipsData) ? failedChipsData : []);
      setChipQCWorkspace(Array.isArray(workspaceData) ? workspaceData : []);
    } catch (e) {
      console.error("Failed to fetch data", e);
      setIssues([]);
      setTasks([]);
      setChipQCData([]);
    } finally {
      setLoading(false);
    }
  };

  const addCalendarEvent = async (summary: string, start: string, end: string) => {
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, start, end })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error("Failed to add calendar event", e);
    }
  };

  const deleteCalendarEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/events/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error("Failed to delete calendar event", e);
    }
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(url, 'google_auth', `width=${width},height=${height},left=${left},top=${top}`);
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsAuthenticated(true);
        fetchUserInfo();
        fetchAllData();
        window.removeEventListener('message', handleMessage);
      }
    };
    window.addEventListener('message', handleMessage);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setIsAuthenticated(false);
    setUser(null);
    setReagents([]);
    setScheduleData(null);
    setIssues([]);
  };

  const handleToggleTask = (taskName: string, completed: boolean, assignee?: string) => {
    const category = Object.entries(RECURRING_TASKS).find(([_, items]) => items.includes(taskName))?.[0] || 'Misc';
    const existingTask = tasks.find(t => t.task === taskName);
    
    if (!existingTask && completed) {
      const newTask = { category, task: taskName, completed: true, assignee };
      setTasks(prev => [...prev, newTask]);
    } else if (existingTask) {
      setTasks(prev => prev.map(t => t.task === taskName ? { ...t, completed, assignee: assignee || t.assignee } : t));
    }
  };

  // --- Reagent Prep Logic ---

  useEffect(() => {
    if (selectedProcess) {
      const today = new Date();
      const todayIdx = today.getDay() - 1; // 0 is Mon, 5 is Sat
      const todayEntry = scheduleData?.schedule?.[todayIdx];

      let calculatedBatch: number | '' = '';

      if (todayEntry) {
        if (selectedProcess === 'Day 1') {
          if (selectedFormat === '96') {
            calculatedBatch = parsePlateCount(todayEntry.day1['96']);
          } else if (selectedFormat === '384') {
            calculatedBatch = parsePlateCount(todayEntry.day1['384']);
          }
        } else if (selectedProcess.startsWith('Day 2')) {
          calculatedBatch = parsePlateCount(todayEntry.day2);
        } else if (selectedProcess === 'Wash RGT' || selectedProcess === 'Ligation Enzyme') {
          if (selectedProcess === 'Wash RGT' && washSlot !== 'Total') {
            const slotIdx = parseInt(washSlot.replace('#', '')) - 1;
            calculatedBatch = parsePlateCount(todayEntry.wash[slotIdx]);
          } else {
            calculatedBatch = todayEntry.wash.reduce((acc, p) => acc + parsePlateCount(p), 0);
          }
        }
      }

      setBatchSize(calculatedBatch === 0 ? '' : String(calculatedBatch));

      // Filter reagents
      const filtered = reagents.filter(r => {
        if (selectedProcess === 'Day 2_PM' && r.reagentName === 'Fragmentation M.M') {
          return false;
        }
        if (selectedProcess.startsWith('Day 2') && r.reagentName === 'Fragmentation M.M') {
          return r.process.startsWith('Day 2');
        }
        if (selectedProcess.startsWith('Day 2')) {
          return r.process === selectedProcess && (selectedFormat ? r.format === selectedFormat : true);
        }
        if (selectedProcess === 'Wash RGT' || selectedProcess === 'Ligation Enzyme') {
          return r.process === selectedProcess;
        }
        return r.process === selectedProcess && (selectedFormat ? r.format === selectedFormat : true);
      });

      const grouped: Record<string, ComponentEntry[]> = {};
      filtered.forEach(r => {
        if (!grouped[r.reagentName]) grouped[r.reagentName] = [];
        
        // Merge components with same name if they exist
        const existing = grouped[r.reagentName].find(c => c.name === r.componentName);
        if (existing && (selectedProcess.startsWith('Day 2') || selectedProcess === 'Wash RGT' || selectedProcess === 'Ligation Enzyme')) {
          existing.amount += r.amount;
        } else {
          grouped[r.reagentName].push({
            name: r.componentName,
            amount: r.amount,
            checked: false
          });
        }
      });

      setLogs(Object.entries(grouped).map(([name, components]) => ({
        reagentName: name,
        components,
        timestamp: '',
        isFullyChecked: false
      })));
    }
  }, [selectedProcess, selectedFormat, reagents, scheduleData, washSlot]);

  const toggleComponentCheck = (reagentIndex: number, componentIndex: number) => {
    const newLogs = [...logs];
    const reagent = newLogs[reagentIndex];
    reagent.components[componentIndex].checked = !reagent.components[componentIndex].checked;
    
    const allChecked = reagent.components.every(c => c.checked);
    if (allChecked && !reagent.isFullyChecked) {
      reagent.isFullyChecked = true;
      reagent.timestamp = new Date().toLocaleTimeString();
    } else if (!allChecked) {
      reagent.isFullyChecked = false;
      reagent.timestamp = '';
    }
    
    setLogs(newLogs);
  };

  const handleSaveLogs = async () => {
    const checkedLogs = logs.filter(l => l.isFullyChecked);
    if (selectedProcess !== 'Ligation Enzyme' && !lot1) {
      alert("Please enter at least the primary Lot #.");
      return;
    }

    setIsLogging(true);
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: selectedFormat,
          process: selectedProcess,
          batch: batchSize,
          manualAmount,
          washSlot: selectedProcess === 'Wash RGT' ? washSlot : undefined,
          user: user?.name || user?.email,
          operators: user?.name || "Unknown", // Automatically use current user as operator
          lot1,
          lot2,
          logs: checkedLogs.map(l => ({
            reagent: l.reagentName,
            timestamp: l.timestamp
          }))
        })
      });
      if (res.ok) {
        alert("Log saved successfully!");
        setSelectedProcess('');
        setLogs([]);
        setLot1('');
        setLot2('');
        setOperators('');
        setManualAmount('');
      }
    } catch (e) {
      alert("Failed to save log.");
    } finally {
      setIsLogging(false);
    }
  };

  // --- Issue Tracker Logic ---

  const handleAddIssue = async () => {
    if (!newIssue.description) return;
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newIssue,
          date: new Date().toLocaleDateString(),
          reporter: user?.name || user?.email
        })
      });
      if (res.ok) {
        setNewIssue({ 
          type: 'GT1', 
          description: '', 
          status: 'Open',
          estimatedCause: '',
          followUpAction: '',
          photo: ''
        });
        fetchAllData();
      }
    } catch (e) {
      alert("Failed to log issue.");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewIssue(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Stats Calculation ---

  const stats = useMemo(() => {
    const schedule = scheduleData?.schedule || [];
    const currentIssues = Array.isArray(issues) ? issues : [];
    
    // Filter issues by date range if set
    const filteredIssues = currentIssues.filter(issue => {
      if (!issueFilters.start || !issueFilters.end) return true;
      const issueDate = new Date(issue.date);
      const start = new Date(issueFilters.start);
      const end = new Date(issueFilters.end);
      return issueDate >= start && issueDate <= end;
    });

    const issueStats = filteredIssues.reduce((acc: any, issue) => {
      if (issue && issue.type) {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
      }
      return acc;
    }, {});

    const issueData = Object.entries(issueStats).map(([name, value]) => ({ name, value }));

    return { issueData };
  }, [scheduleData, issues, issueFilters]);

  // --- Camera & OCR ---

  const startCamera = (field: 'lot1' | 'lot2') => {
    setActiveLotField(field);
    setShowCamera(true);
    try {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      }).then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (e) {
      alert("Could not access camera.");
      setShowCamera(false);
    }
  };

  const captureAndOcr = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setOcrLoading(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            { text: "Extract the Lot number from this reagent box label. Return only the code." },
            { inlineData: { mimeType: "image/jpeg", data: base64Image } }
          ]
        }]
      });
      const text = response.text?.trim();
      if (text && text !== 'NOT_FOUND') {
        if (activeLotField === 'lot1') setLot1(text);
        else setLot2(text);
        setShowCamera(false);
      }
    } catch (e) {
      alert("OCR failed.");
    } finally {
      setOcrLoading(false);
    }
  };

  // --- Render Helpers ---

  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const generateAiSummary = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'daily', data: { stats: scheduleData?.stats, issues, announcements: scheduleData?.announcements } })
      });
      const data = await res.json();
      setAiSummary(data.report);
    } catch (e) {
      console.error("AI Summary failed", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (scheduleData && !aiSummary) generateAiSummary();
  }, [scheduleData]);

  const renderDashboard = () => {
    return (
      <div className="space-y-8 pb-20">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'weekly', label: 'Weekly Samples', value: scheduleData?.stats?.weeklySamples || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { id: 'monthly', label: 'Monthly Samples', value: scheduleData?.stats?.monthlySamples || 0, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { id: 'chq', label: 'CHQ Incomplete', value: chipQCWorkspace.filter(c => c[3] !== 'Completed').length, icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50' },
            { id: 'issues', label: 'Active Issues', value: issues.filter(i => i.status === 'Open').length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(stat => (
            <div 
              key={stat.id}
              className="bg-white border border-stone-200 p-4 rounded-[24px] text-left shadow-sm"
            >
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-xl font-bold text-stone-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* AI Summary & Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> AI Experiment Summary
              </h2>
              <button 
                onClick={generateAiSummary}
                disabled={isAiLoading}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="p-8 flex-1 overflow-y-auto max-h-[400px] prose prose-stone prose-sm max-w-none">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-stone-400 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="font-medium">Generating AI insights...</p>
                </div>
              ) : aiSummary ? (
                <ReactMarkdown>{aiSummary}</ReactMarkdown>
              ) : (
                <p className="text-stone-400 italic">No summary available. Click refresh to generate.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" /> Announcements
              </h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto max-h-[400px]">
              {scheduleData?.announcements && scheduleData.announcements.length > 0 ? (
                <div className="space-y-4">
                  {scheduleData.announcements.map((ann, i) => (
                    <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <p className="text-sm text-stone-600 font-medium">{ann}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 py-10">
                  <p className="text-sm font-medium italic">No announcements</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Checklist & Recent Issues */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-[32px] shadow-sm p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Daily Checklist
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setIsAddTaskOpen(true)} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Person A', 'Person B', 'Person C'].map((person, idx) => {
                const PersonIcon = personIcons[person] || User;
                const availableIcons = [User, Beaker, FlaskConical, Microscope, Dna, Atom];
                
                return (
                  <div 
                    key={person} 
                    className="bg-white rounded-3xl p-6 border border-stone-100 min-h-[400px] flex flex-col shadow-sm"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedTask) {
                        handleToggleTask(draggedTask, false, person);
                        setDraggedTask(null);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <button 
                        onClick={() => {
                          const currentIdx = availableIcons.indexOf(PersonIcon);
                          const nextIdx = (currentIdx + 1) % availableIcons.length;
                          setPersonIcons(prev => ({ ...prev, [person]: availableIcons[nextIdx] }));
                        }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold transition-all hover:scale-110 active:scale-95 ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                      >
                        <PersonIcon className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">{person}</h3>
                        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest">Assigned Tasks</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      {tasks.filter(t => t.assignee === person).map(task => (
                        <div 
                          key={task.task}
                          onClick={() => handleToggleTask(task.task, !task.completed, person)}
                          className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                            task.completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-stone-100 hover:border-stone-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-stone-200'
                            }`}>
                              {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-medium ${task.completed ? 'text-emerald-700 line-through' : 'text-stone-600'}`}>
                              {task.task}
                            </span>
                          </div>
                        </div>
                      ))}
                      {tasks.filter(t => t.assignee === person).length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-stone-300 border-2 border-dashed border-stone-100 rounded-2xl py-10">
                          <p className="text-[10px] font-bold uppercase tracking-widest">Drag tasks here</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-[32px] shadow-sm p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-500" /> Recent Issues
              </h2>
              <button 
                onClick={() => setView('issues')}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px]">
              {issues.slice(0, 5).map((issue, idx) => (
                <div key={idx} className="p-4 bg-stone-50 border border-stone-100 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      issue.status === 'Open' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {issue.type}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">{issue.date}</span>
                  </div>
                  <p className="text-xs text-stone-600 font-medium line-clamp-2">{issue.description}</p>
                </div>
              ))}
              {issues.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 py-10">
                  <p className="text-sm font-medium italic">No recent issues</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setView('reagent-prep');
                // Or some quick record modal
              }}
              className="mt-8 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              <Plus className="w-5 h-5" /> Quick Record Entry
            </button>
          </div>
        </div>

        {/* Task Template */}
        <div className="mt-12 pt-8 border-t border-stone-100">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-6">Recurring Tasks Template (Drag to assign)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {Object.entries(RECURRING_TASKS).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">{category}</h4>
                <div className="flex flex-col gap-2">
                  {items.map(task => (
                    <div 
                      key={task} 
                      draggable
                      onDragStart={() => setDraggedTask(task)}
                      className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-600 cursor-grab active:cursor-grabbing hover:border-stone-400 transition-all shadow-sm"
                    >
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSchedule = () => {
    return (
      <div className="space-y-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-stone-400" /> Weekly Schedule
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setScheduleWeek('CURRENT')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${scheduleWeek === 'CURRENT' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-400'}`}
                >
                  Current
                </button>
                <button 
                  onClick={() => setScheduleWeek('UPCOMING')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${scheduleWeek === 'UPCOMING' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-400'}`}
                >
                  Upcoming
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[600px] bg-white">
              <iframe 
                src={`https://docs.google.com/spreadsheets/d/${SCHEDULE_SPREADSHEET_ID}/preview?rm=minimal&gid=${scheduleWeek === 'CURRENT' ? scheduleData?.currentSheetId : scheduleData?.upcomingSheetId}`}
                className="w-full h-full border-none"
                title="Schedule Preview"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-[32px] p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-stone-900">Day 1 Recording</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Batch Count</label>
                  <input 
                    type="number" 
                    placeholder="Enter batch count..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Finish Time</label>
                  <input 
                    type="time" 
                    value={completionTime}
                    onChange={e => setCompletionTime(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                  Save Record
                </button>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-[32px] p-8 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-stone-900">Alarms</h3>
                <button 
                  onClick={() => setAlarmsEnabled(!alarmsEnabled)}
                  className={`p-2 rounded-xl transition-all ${alarmsEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}
                >
                  {alarmsEnabled ? <Clock className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-stone-600">Day 2 AM</span>
                  <span className="text-sm font-bold text-stone-900">09:00 AM</span>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-stone-600">Wash Slot</span>
                  <span className="text-sm font-bold text-stone-900">11:30 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmojiPicker = () => {
    if (!isEmojiPickerOpen) return null;
    const emojis = ['👨‍🔬', '👩‍🔬', '🧪', '🧬', '🔬', '🧫', '🌡️', '💻', '📊', '⚡', '🔥', '✨', '🌟', '🚀', '🤖', '🧠', '💡', '🌈', '🍀', '💎'];
    return (
      <div className="fixed inset-0 bg-stone-200/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-white">
            <h2 className="text-2xl font-bold text-stone-900">Choose Your Avatar</h2>
            <button onClick={() => setIsEmojiPickerOpen(false)} className="p-2 text-stone-400 hover:text-stone-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-8 grid grid-cols-5 gap-4">
            {emojis.map(emoji => (
              <button 
                key={emoji}
                onClick={() => {
                  setActiveProfileEmoji(emoji);
                  setIsEmojiPickerOpen(false);
                }}
                className={`w-14 h-14 text-2xl flex items-center justify-center rounded-2xl transition-all ${
                  activeProfileEmoji === emoji ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-white hover:bg-stone-50 text-stone-600'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderTimeline = () => {
    return (
      <div className="space-y-8 pb-20">
        <div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-2">Chip Timeline</h1>
          <p className="text-stone-500 font-medium">Search for a specific chip's journey</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-[32px] shadow-sm p-8">
          <div className="flex flex-wrap gap-4 items-end mb-10">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Chip #P</label>
              <input 
                type="text" 
                placeholder="e.g. P1-4" 
                value={timelineChipP}
                onChange={e => setTimelineChipP(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all w-40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Chip #b</label>
              <input 
                type="text" 
                placeholder="e.g. B123" 
                value={timelineChipB}
                onChange={e => setTimelineChipB(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all w-40"
              />
            </div>
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">Search Timeline</button>
          </div>

          {timelineChipP && timelineChipB ? (
            <div className="relative pl-12 space-y-12 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-100">
              {[
                { step: 'Day 1 Preparation', date: '2024-05-20', time: '09:30 AM', status: 'Completed', icon: Beaker },
                { step: 'Wash & Day 2 AM', date: '2024-05-21', time: '10:15 AM', status: 'Completed', icon: Activity },
                { step: 'Day 2 PM', date: '2024-05-21', time: '02:45 PM', status: 'Completed', icon: FlaskConical },
                { step: 'Hyb Start', date: '2024-05-21', time: '04:00 PM', status: 'Completed', icon: Thermometer },
                { step: 'Scanning', date: '2024-05-22', time: '11:00 AM', status: 'Pending', icon: Scan },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-[45px] top-0 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${item.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="bg-white border border-stone-100 rounded-2xl p-6 hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-stone-900">{item.step}</h3>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-stone-500 font-medium">
                      <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {item.date}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-stone-400 bg-white rounded-3xl border border-stone-100">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">Enter Chip #P and #b to view its timeline</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCHQBoard = () => {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-2">CHQ Board</h1>
            <p className="text-stone-500 font-medium">Chip QC & Issue Tracking</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              <Save className="w-5 h-5" /> Save CHQ Data
            </button>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-[32px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="p-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">Status</th>
                  <th className="p-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">Wash Date</th>
                  <th className="p-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">Barcode</th>
                  <th className="p-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">#b</th>
                  <th className="p-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">#p</th>
                  <th className="p-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">Memo / Issue</th>
                  <th className="p-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {chipQCWorkspace.map((row, i) => (
                  <tr key={i} className="hover:bg-stone-50 transition-colors">
                    <td className="p-6">
                      <select 
                        defaultValue={row[3]}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md outline-none ${
                          row[3] === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="p-6 text-sm text-stone-600">{row[0]}</td>
                    <td className="p-6 text-sm font-mono text-stone-900">{row[1]}</td>
                    <td className="p-6 text-sm text-stone-600">{row[2]}</td>
                    <td className="p-6 text-sm text-stone-600">{row[4]}</td>
                    <td className="p-6">
                      <input 
                        type="text" 
                        defaultValue={row[5]}
                        placeholder="Add memo..."
                        className="bg-transparent border-none p-0 text-sm focus:ring-0 w-full text-stone-600" 
                      />
                    </td>
                    <td className="p-6 text-sm text-stone-400">{row[6]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderIssues = () => {
    const filteredIssues = issues.filter(issue => {
      const matchesType = issueFilters.type === 'All' || issue.type === issueFilters.type;
      return matchesType;
    });

    return (
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-2">Issue Log</h1>
            <p className="text-stone-500 font-medium">Track and analyze lab issues</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIssueTab('log')}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${issueTab === 'log' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-stone-100 text-stone-400'}`}
            >
              Log
            </button>
            <button 
              onClick={() => setIssueTab('stats')}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${issueTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-stone-100 text-stone-400'}`}
            >
              Statistics
            </button>
          </div>
        </div>

        {issueTab === 'log' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-stone-200 rounded-[32px] p-8 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-stone-900">New Issue</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Process / Equipment</label>
                    <select 
                      value={newIssue.type}
                      onChange={e => setNewIssue({...newIssue, type: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Description</label>
                    <textarea 
                      value={newIssue.description}
                      onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px]"
                      placeholder="What happened?"
                    />
                  </div>
                  <button 
                    onClick={handleAddIssue}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    Log Issue
                  </button>
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-[32px] p-8 shadow-sm">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-6">Filters</h3>
                <div className="space-y-4">
                  <select 
                    value={issueFilters.type}
                    onChange={e => setIssueFilters({...issueFilters, type: e.target.value})}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
                  >
                    <option value="All">All Processes</option>
                    {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {filteredIssues.map((issue, idx) => (
                <div key={idx} className="bg-white border border-stone-200 rounded-[32px] p-8 shadow-sm hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {issue.type}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        issue.status === 'Open' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {issue.status}
                      </span>
                    </div>
                    <span className="text-xs text-stone-400 font-medium">{issue.date}</span>
                  </div>
                  <p className="text-stone-600 font-medium mb-4">{issue.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                    <User className="w-3 h-3" /> Reported by {issue.reporter}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-[32px] p-10 shadow-sm">
            <h3 className="text-xl font-bold text-stone-900 mb-10">Issue Statistics</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueTypes.map(t => ({ name: t, count: issues.filter(i => i.type === t).length }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#a8a29e' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#a8a29e' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReagentPrep = () => {
    return (
    <div className="space-y-8 pb-20">
      {/* Config */}
      <section className="bg-white rounded-[32px] p-10 shadow-sm border border-stone-200 space-y-10">
        <div className="space-y-6">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 1. Select Process
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { id: 'Day 1', label: 'Day 1' },
              { id: 'Day 2_AM', label: 'Day 2_AM' },
              { id: 'Day 2_PM', label: 'Day 2_PM' },
              { id: 'Wash RGT', label: 'Wash RGT' },
              { id: 'Ligation Enzyme', label: 'Ligation Enzyme' },
            ].map(proc => (
              <button
                key={proc.id}
                onClick={() => {
                  setSelectedProcess(proc.id);
                  setSelectedFormat('');
                  setManualAmount('');
                  if (proc.id !== 'Wash RGT') setWashSlot('Total');
                }}
                className={`flex flex-col items-center justify-center p-6 rounded-[24px] border-2 transition-all ${
                  selectedProcess === proc.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-stone-100 text-stone-600 hover:border-stone-300'
                }`}
              >
                <span className="text-sm font-bold">{proc.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {(selectedProcess === 'Day 1' || selectedProcess.startsWith('Day 2')) && (
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 2. Select Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['96', '384'].map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    className={`py-5 rounded-[20px] border-2 font-bold transition-all ${
                      selectedFormat === fmt ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-stone-100 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedProcess === 'Wash RGT' && (
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 2. Select Slot
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['#1', '#2', '#3', 'Total'].map(slot => (
                  <button
                    key={slot}
                    onClick={() => setWashSlot(slot as any)}
                    className={`py-5 rounded-[20px] border-2 font-bold transition-all ${
                      washSlot === slot ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-stone-100 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 3. {selectedProcess === 'Day 1' ? 'Batch ID & Completion Time' : 'Batch (#p)'}
            </label>
            {selectedProcess === 'Day 1' ? (
              <div className="flex items-center gap-4">
                <input 
                  type="text"
                  placeholder="Batch (e.g. P1-4)"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  className="flex-1 bg-white border-2 border-stone-100 rounded-[20px] px-6 py-5 focus:outline-none focus:border-indigo-500 transition-all font-medium h-[70px]"
                />
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setCompletionTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
                    className="px-6 h-[70px] bg-indigo-600 text-white rounded-[20px] font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                  >
                    <Clock className="w-5 h-5" /> Record Time
                  </button>
                  {completionTime && (
                    <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-bold">{completionTime}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-stone-100 rounded-[20px] px-8 py-5 font-mono font-bold text-indigo-600 h-[70px] flex items-center text-xl shadow-inner">
                {scheduleData?.schedule?.[new Date().getDay() - 1]?.[selectedProcess === 'Day 1' ? 'day1' : (selectedProcess.startsWith('Day 2') ? 'day2' : 'wash')]?.[selectedFormat === '384' ? '384' : '96'] || 
                 (selectedProcess === 'Wash RGT' ? scheduleData?.schedule?.[new Date().getDay() - 1]?.wash.join(', ') : '') || 
                 (selectedProcess.startsWith('Day 2') ? scheduleData?.schedule?.[new Date().getDay() - 1]?.day2 : '') ||
                 (selectedProcess === 'Day 1' ? (selectedFormat === '96' ? scheduleData?.schedule?.[new Date().getDay() - 1]?.day1['96'] : scheduleData?.schedule?.[new Date().getDay() - 1]?.day1['384']) : '')
                }
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 4. {selectedProcess === 'Ligation Enzyme' ? 'Manual Amount (mL)' : (selectedProcess === 'Day 2_PM' ? 'DNA Pellet Photo' : 'Kit Lot #')}
            </label>
            <div className="relative">
              {selectedProcess === 'Ligation Enzyme' ? (
                <input 
                  type="number"
                  placeholder="Enter mL"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full bg-white border-2 border-stone-100 rounded-[20px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all font-medium h-[70px]"
                />
              ) : selectedProcess === 'Day 2_PM' ? (
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 bg-stone-50 border-2 border-dashed border-stone-200 rounded-[20px] h-[70px] cursor-pointer hover:bg-stone-100 transition-all">
                    <Camera className="w-6 h-6 text-stone-400" />
                    <span className="text-sm text-stone-500 font-bold uppercase tracking-widest">Upload Pellet Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setPelletPhoto(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                  {pelletPhoto && (
                    <div className="relative w-[70px] h-[70px] rounded-[20px] overflow-hidden border-2 border-stone-200">
                      <img src={pelletPhoto} alt="Pellet" className="w-full h-full object-cover" />
                      <button onClick={() => setPelletPhoto('')} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <input 
                    type="text"
                    placeholder={
                      selectedProcess === 'Day 1' ? (selectedFormat === '96' ? 'M1_96' : 'M1_384') : 
                      selectedProcess === 'Day 2_AM' ? 'M2-1' : 
                      selectedProcess === 'Day 2_PM' ? 'M2-2' : 
                      selectedProcess === 'Wash RGT' ? 'M4-1' : 'Enter Lot #'
                    }
                    value={lot1}
                    onChange={(e) => setLot1(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-[20px] pl-8 pr-16 py-5 focus:outline-none focus:border-indigo-500 transition-all font-medium h-[70px]"
                  />
                  <button onClick={() => startCamera('lot1')} className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 hover:text-indigo-600">
                    <Camera className="w-7 h-7" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lot # 2 */}
        {(selectedProcess.startsWith('Day 2') || selectedProcess === 'Wash RGT') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Kit Lot # 2
              </label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder={selectedProcess.startsWith('Day 2') ? 'M2-2' : 'M4-2'}
                  value={lot2}
                  onChange={(e) => setLot2(e.target.value)}
                  className="w-full bg-stone-50 border-2 border-stone-100 rounded-[20px] pl-8 pr-16 py-5 focus:outline-none focus:border-indigo-500 transition-all font-medium h-[70px]"
                />
                <button onClick={() => startCamera('lot2')} className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 hover:text-indigo-600">
                  <Camera className="w-7 h-7" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Manual Amount Override (mL)
              </label>
              <input 
                type="number"
                placeholder="Enter manual amount if different"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="w-full bg-white border-2 border-stone-100 rounded-[20px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all font-medium h-[70px]"
              />
            </div>
          </div>
        )}
      </section>

      {/* Reagent List with Accordion */}
      <AnimatePresence mode="wait">
        {selectedProcess ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-xl font-bold text-stone-900">Preparation List</h2>
              <div className="flex items-center gap-3">
                <button className="p-2 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-stone-600">
                  <CalendarIcon className="w-5 h-5" />
                </button>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">View by Date</span>
              </div>
            </div>
            {logs.map((log, reagentIndex) => {
              const sumComponentAmounts = log.components.reduce((acc, c) => acc + c.amount, 0);
              const multiplier = Number(batchSize) || 0;
              const totalVolume = manualAmount ? parseFloat(manualAmount) : (sumComponentAmounts * multiplier);
              
              return (
                <div key={log.reagentName} className="bg-white rounded-[32px] border border-stone-200 overflow-hidden shadow-sm">
                  <div 
                    onClick={() => {
                      const newLogs = [...logs];
                      newLogs[reagentIndex].isExpanded = !newLogs[reagentIndex].isExpanded;
                      setLogs(newLogs);
                    }}
                    className={`p-6 flex items-center justify-between cursor-pointer transition-all ${log.isFullyChecked ? 'bg-emerald-50/50' : 'bg-stone-50/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${log.isFullyChecked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white border border-stone-200 text-stone-400 shadow-sm'}`}>
                        {log.isFullyChecked ? <CheckCircle2 className="w-6 h-6" /> : <Beaker className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900">{log.reagentName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{log.components.length} Components</span>
                          {log.timestamp && <span className="text-[10px] font-mono text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{log.timestamp}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">Total Volume</p>
                        <p className="text-lg font-mono font-bold text-stone-900">{totalVolume.toFixed(2)} mL</p>
                      </div>
                      <div className={`p-2 rounded-xl transition-transform ${log.isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5 text-stone-400" />
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {log.isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {log.components.map((comp, compIndex) => {
                            const compVol = manualAmount 
                              ? (comp.amount / sumComponentAmounts) * parseFloat(manualAmount)
                              : comp.amount * multiplier;
                            
                            return (
                              <div 
                                key={compIndex}
                                onClick={() => toggleComponentCheck(reagentIndex, compIndex)}
                                className={`p-5 rounded-[24px] border-2 transition-all cursor-pointer flex items-center justify-between ${
                                  comp.checked ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner' : 'bg-white border-stone-100 hover:border-stone-200 shadow-sm'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${comp.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-stone-200'}`}>
                                    {comp.checked && <CheckCircle2 className="w-4 h-4" />}
                                  </div>
                                  <span className="text-sm font-bold">{comp.name}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-mono font-bold">{compVol.toFixed(2)}</span>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase">mL</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            
            <div className="flex justify-end pt-8">
              <button
                onClick={handleSaveLogs}
                disabled={isLogging || logs.length === 0}
                className="bg-indigo-600 text-white px-12 py-5 rounded-[24px] font-bold flex items-center gap-3 hover:bg-indigo-700 disabled:opacity-50 shadow-2xl active:scale-95 transition-all shadow-indigo-200"
              >
                {isLogging ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                Save All Logs
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-32 bg-stone-50 rounded-[40px] border-2 border-dashed border-stone-200">
            <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Beaker className="w-10 h-10 text-stone-300" />
            </div>
            <p className="text-stone-400 font-bold text-lg">Select a process to start preparation</p>
            <p className="text-stone-300 text-sm mt-2">Choose from the options above to begin logging</p>
          </div>
        )}
      </AnimatePresence>
    </div>
    );
  };

  const renderAddTaskModal = () => {
    if (!isAddTaskOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-stone-900">Add New Task</h2>
            <button onClick={() => setIsAddTaskOpen(false)} className="p-2 hover:bg-stone-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {['GM', 'SR'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setNewTask(prev => ({ ...prev, category: cat }))}
                    className={`py-3 rounded-xl border font-bold transition-all ${newTask.category === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-stone-600 border-stone-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase">Task Description</label>
              <input 
                type="text" 
                value={newTask.task} 
                onChange={e => setNewTask(prev => ({ ...prev, task: e.target.value }))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none"
                placeholder="What needs to be done?"
              />
            </div>
            <button 
              onClick={async () => {
                if (!newTask.task) return;
                await fetch('/api/tasks/add', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newTask)
                });
                setIsAddTaskOpen(false);
                fetchAllData();
              }}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
            >
              Add Task
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderStatsDetailModal = () => {
    if (!isStatsDetailOpen) return null;

    const data = scheduleData?.schedule || [];
    const filtered = statsDetailType === 'weekly' ? data : data; // In a real app, you'd filter by month

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col border border-stone-200">
          <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-600" /> {statsDetailType === 'weekly' ? 'Weekly' : 'Monthly'} Sample Statistics
            </h2>
            <button onClick={() => setIsStatsDetailOpen(false)} className="p-2 hover:bg-stone-200 rounded-xl transition-all"><X className="w-6 h-6" /></button>
          </div>
          <div className="p-8 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filtered}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="day1.96" name="96 Format" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="day1.384" name="384 Format" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-stone-50 border border-stone-100">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Total Samples</p>
                  <p className="text-3xl font-bold text-stone-900">{statsDetailType === 'weekly' ? scheduleData?.stats?.weeklySamples : scheduleData?.stats?.monthlySamples}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">96 Format</p>
                    <p className="text-xl font-bold text-emerald-700">
                      {filtered.reduce((acc, d) => acc + (parsePlateCount(d.day1['96']) * 96), 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">384 Format</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {filtered.reduce((acc, d) => acc + (parsePlateCount(d.day1['384']) * 384), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">
                <tr>
                  <th className="pb-4">Date</th>
                  <th className="pb-4">96 Format (#p)</th>
                  <th className="pb-4">384 Format (#p)</th>
                  <th className="pb-4">Total Samples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((d, i) => {
                  const s96 = parsePlateCount(d.day1['96']) * 96;
                  const s384 = parsePlateCount(d.day1['384']) * 384;
                  return (
                    <tr key={i}>
                      <td className="py-4 text-sm font-medium text-stone-600">{d.date}</td>
                      <td className="py-4 text-sm font-mono text-stone-400">{d.day1['96'] || '-'}</td>
                      <td className="py-4 text-sm font-mono text-stone-400">{d.day1['384'] || '-'}</td>
                      <td className="py-4 text-sm font-bold text-stone-900">{s96 + s384}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderReportModal = () => {
    if (!reportModal.open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col border border-stone-200">
          <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white text-stone-900">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-emerald-400" /> AI {reportModal.type === 'weekly' ? 'Weekly' : 'Monthly'} Report
            </h2>
            <button onClick={() => setReportModal({ ...reportModal, open: false })} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="w-6 h-6" /></button>
          </div>
          <div className="p-8 overflow-y-auto prose prose-stone max-w-none">
            <div className="markdown-body">
              <ReactMarkdown>{reportModal.content}</ReactMarkdown>
            </div>
          </div>
          <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end">
            <button 
              onClick={() => {
                const blob = new Blob([reportModal.content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Lab_Report_${reportModal.type}_${new Date().toISOString().slice(0, 10)}.md`;
                a.click();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Save className="w-5 h-5" /> Download Report
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading && isAuthenticated === null) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-8 border border-stone-200"><Beaker className="w-10 h-10 text-emerald-600" /></div>
        <h1 className="text-3xl font-light tracking-tight text-stone-900 mb-2">Lab Dashboard</h1>
        <p className="text-stone-500 mb-12 max-w-xs">Connect your Google account to access lab schedules and logs.</p>
        <button onClick={handleLogin} className="w-full max-w-xs bg-indigo-600 text-white py-4 rounded-2xl font-medium shadow-lg flex items-center justify-center gap-3 hover:bg-indigo-700 transition-colors shadow-indigo-200"><Database className="w-5 h-5" /> Connect Google Sheets</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-900 font-sans pb-32">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><LayoutDashboard className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <h1 className="text-lg font-medium tracking-tight leading-none capitalize">{view.replace('-', ' ')}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsTimerOpen(true)} className="p-2 text-stone-400 hover:text-stone-600 bg-white border border-stone-100 rounded-lg shadow-sm"><History className="w-5 h-5" /></button>
          <button onClick={() => setIsCalcOpen(true)} className="p-2 text-stone-400 hover:text-stone-600 bg-white border border-stone-100 rounded-lg shadow-sm"><Calculator className="w-5 h-5" /></button>
          <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-stone-600"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div 
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && renderDashboard()}
            {view === 'schedule' && renderSchedule()}
            {view === 'reagent-prep' && renderReagentPrep()}
            {view === 'chq-board' && renderCHQBoard()}
            {view === 'issues' && renderIssues()}
            {view === 'timeline' && renderTimeline()}
          </motion.div>
        </AnimatePresence>

        {renderStatsDetailModal()}
        {renderReportModal()}
        {renderAddTaskModal()}
        {renderEmojiPicker()}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-stone-200 px-4 py-3 rounded-3xl shadow-2xl flex items-center gap-2 z-50">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'schedule', icon: CalendarIcon, label: 'Schedule' },
          { id: 'reagent-prep', icon: Beaker, label: 'Reagent' },
          { id: 'chq-board', icon: ClipboardList, label: 'CHQ Board' },
          { id: 'issues', icon: AlertTriangle, label: 'Issues' },
          { id: 'timeline', icon: Activity, label: 'Timeline' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all ${
              view === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-stone-400 hover:bg-stone-50'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {view === item.id && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Modals */}
      <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
      <TimerModal isOpen={isTimerOpen} onClose={() => setIsTimerOpen(false)} />
      
      <AnimatePresence>
        {showCamera && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black flex flex-col">
            <div className="relative flex-1 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[40px] border-black/40 flex items-center justify-center">
                <div className="w-64 h-40 border-2 border-emerald-500 rounded-2xl shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]" />
              </div>
              <button onClick={() => setShowCamera(false)} className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="bg-black p-8 flex flex-col items-center gap-6">
              <p className="text-white/60 text-sm">Align Lot # within the box</p>
              <button onClick={captureAndOcr} disabled={ocrLoading} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                {ocrLoading ? <Loader2 className="w-8 h-8 animate-spin text-stone-900" /> : <div className="w-16 h-16 border-4 border-stone-900 rounded-full" />}
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
