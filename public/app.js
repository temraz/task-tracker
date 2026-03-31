const { useState, useMemo, useEffect, useRef, Fragment } = React;

const API_BASE = '/api';
const CATEGORIES = ["CEO Decision","Client Experience","Corporate Structure & Compliance","Financial Health","Growth & Revenue","People & Organization","Product & Innovation","Standardize & Automate"];
const DEPARTMENTS = ["R&D", "Product", "Marketing", "Sales", "Partner Success", "Partnerships", "Finance", "Legal", "CFD | HR", "Management", "Mission Control", "Monetization"];
const AVATAR_COLORS = ["#1B2A4A","#2E7D52","#1E5799","#7B241C","#6B46C1","#065F46","#92400E","#1E40AF","#7C3AED","#0F766E","#9D174D","#1D4ED8","#047857","#B45309","#374151"];
const STATUS_KEYS = ["Not Started","In Progress","Completed"];
const PRIORITY_CFG = {"Critical":{bg:"#F3E8FF",text:"#6B21A8",border:"#9333EA"},"High":{bg:"#FDECEA",text:"#7B241C",border:"#E74C3C"},"Medium":{bg:"#FEF3C7",text:"#7D4E00",border:"#F59E0B"},"Low":{bg:"#E8F8F5",text:"#1E8449",border:"#2ECC71"}};

// API Helper
const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
};

function PriorityBadge({ priority }) {
  const c = PRIORITY_CFG[priority] || PRIORITY_CFG["Medium"];
  return <span style={{background:c.bg,color:c.text,border:"1px solid "+c.border,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700}}>{priority}</span>;
}

function ProgressBar({ done, total }) {
  const pct = total === 0 ? 0 : Math.round((done/total)*100);
  const color = pct===100?"#28A745":pct>=50?"#2980B9":"#F59E0B";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:6,background:"#E2E8F0",borderRadius:3,overflow:"hidden"}}>
        <div style={{width:pct+"%",height:"100%",background:color,borderRadius:3}} />
      </div>
      <span style={{fontSize:11,fontWeight:700,color,minWidth:30}}>{pct}%</span>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [view, setView] = useState("dashboard");
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPerformance, setFilterPerformance] = useState("All");
  const [filterDue, setFilterDue] = useState("All");
  const [filterOwner, setFilterOwner] = useState("All");
  const [filterOKR, setFilterOKR] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({name:"",category:"",priority:"Medium",due_date:"",status:"Not Started",notes:"",is_okr:false,linked_department:""});
  const [editTask, setEditTask] = useState(null);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newOwner, setNewOwner] = useState({name:"",email:"",department:""});
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [activeCommentTask, setActiveCommentTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', username: '', password: '', name: '', department: '' });
  const [uploadMsg, setUploadMsg] = useState(null);
  const [showQuarterModal, setShowQuarterModal] = useState(false);
  const [uploadQuarter, setUploadQuarter] = useState(null);
  const uploadFileInputRef = useRef(null);
  const [allUsers, setAllUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({name:"",email:"",username:"",department:"",role:"user"});
  const [editingQuarter, setEditingQuarter] = useState(null);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [alertModal, setAlertModal] = useState(null); // {type: 'alert'|'confirm', title, message, onConfirm, onCancel}
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar open/close state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Mobile detection
  const [breadcrumbs, setBreadcrumbs] = useState([]); // Breadcrumb navigation
  const [showUserMenu, setShowUserMenu] = useState(false); // User dropdown menu
  const [showChangePassword, setShowChangePassword] = useState(false); // Change password modal
  const [changePasswordForm, setChangePasswordForm] = useState({currentPassword:"",newPassword:"",confirmPassword:""});
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // Close sidebar on mobile by default
      } else {
        setSidebarOpen(true); // Open sidebar on desktop by default
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const TODAY = new Date().toISOString().split("T")[0];
  const isOverdue = (t) => !!(t.due_date && t.due_date < TODAY && t.status !== "Completed");
  const daysOverdue = (t) => {
    if (!t.due_date || t.status === "Completed") return 0;
    const diff = Math.floor((new Date(TODAY) - new Date(t.due_date)) / 86400000);
    return diff > 0 ? diff : 0;
  };

  // Format date for display (e.g., "Mar 30, 2026")
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString; // Return original if error
    }
  };

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Load tasks when quarter changes
  useEffect(() => {
    if (selectedQuarter) {
      loadTasks();
    }
  }, [selectedQuarter, filterStatus, filterPriority, filterCategory, filterPerformance, filterDue, filterOwner, filterOKR, searchQ]);

  // Load all users when admin views users page
  useEffect(() => {
    if (view === 'users' && user?.role === 'admin') {
      loadAllUsers();
    }
  }, [view, user]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && !e.target.closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  // Browser history management - initialize from URL (only once on mount)
  useEffect(() => {
    if (!user) return; // Wait for user to be loaded
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlView = urlParams.get('view') || 'dashboard';
    const urlOwner = urlParams.get('owner');
    const urlStatus = urlParams.get('status');
    
    if (urlView !== view) {
      setView(urlView);
    }
    if (urlOwner) {
      const ownerId = parseInt(urlOwner);
      if (ownerId !== selectedOwner) {
        setSelectedOwner(ownerId);
      }
    } else if (selectedOwner) {
      setSelectedOwner(null);
    }
    if (urlStatus && urlStatus !== filterStatus) {
      setFilterStatus(urlStatus);
    }
  }, [user]); // Only run when user is loaded

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e) => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlView = urlParams.get('view') || 'dashboard';
      const urlOwner = urlParams.get('owner');
      const urlStatus = urlParams.get('status');
      
      setView(urlView);
      if (urlOwner) {
        setSelectedOwner(parseInt(urlOwner));
      } else {
        setSelectedOwner(null);
      }
      if (urlStatus) {
        setFilterStatus(urlStatus);
      } else {
        setFilterStatus("All");
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update breadcrumbs when view or owner changes
  useEffect(() => {
    const crumbs = [];
    
    // Always start with Dashboard
    crumbs.push({ label: 'Dashboard', view: 'dashboard', owner: null });
    
    if (view !== 'dashboard' && !selectedOwner) {
      // Main views
      const viewLabels = {
        'performance': 'Performance',
        'all': 'All Tasks',
        'overdue': 'Overdue',
        'users': 'Users',
        'quarters': 'Quarters'
      };
      if (viewLabels[view]) {
        crumbs.push({ label: viewLabels[view], view, owner: null });
      }
    } else if (selectedOwner && owner) {
      // Owner detail view
      crumbs.push({ label: owner.name, view: 'owner', owner: selectedOwner });
    }
    
    setBreadcrumbs(crumbs);
  }, [view, selectedOwner, owner]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    try {
      const res = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      if (res.success) {
        setUser(res.user);
        setShowLogin(false);
        setLoginForm({ email: '', password: '' });
        loadData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    try {
      const res = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerForm)
      });
      if (res.success) {
        setUser(res.user);
        setShowRegister(false);
        setRegisterForm({ email: '', username: '', password: '', name: '', department: '' });
        loadData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      const authCheck = await fetch('/api/auth/microsoft', { credentials: 'include' });
      if (authCheck.ok) {
        window.location.href = '/api/auth/microsoft';
      } else {
        const errorData = await authCheck.json();
        setError(`Microsoft OAuth not configured: ${errorData.message || errorData.error}`);
      }
    } catch (err) {
      setError('Unable to connect to Microsoft authentication.');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check auth
      const authRes = await apiCall('/auth/me').catch(() => null);
      if (!authRes || !authRes.user) {
        setLoading(false);
        setShowLogin(true);
        return;
      }
      setUser(authRes.user);

      // Load quarters
      try {
        const quartersRes = await apiCall('/quarters');
        const quartersList = quartersRes.quarters || [];
        setQuarters(quartersList);

        // Load current quarter
        if (quartersList.length > 0) {
          try {
            const currentRes = await apiCall('/quarters/current');
            if (currentRes.quarter) {
              setCurrentQuarter(currentRes.quarter);
              setSelectedQuarter(currentRes.quarter);
            } else if (quartersList.length > 0) {
              // If no current quarter, select the first one
              setSelectedQuarter(quartersList[0]);
            }
          } catch (err) {
            console.error('Error loading current quarter:', err);
            // Fallback to first quarter
            if (quartersList.length > 0) {
              setSelectedQuarter(quartersList[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error loading quarters:', err);
        setError('Failed to load quarters. Please refresh the page.');
      }

      // Load users (for team overview)
      try {
        const usersRes = await apiCall('/users');
        setUsers(usersRes.users || []);
      } catch (err) {
        console.error('Error loading users:', err);
        // Don't fail completely if users fail to load
        setUsers([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Load data error:', err);
      setError(err.message || 'Failed to load data');
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!selectedQuarter) return;
    try {
      const params = new URLSearchParams();
      // Only add quarter_id if not "all"
      if (selectedQuarter.id !== 'all') {
        params.append('quarter_id', selectedQuarter.id);
      }
      if (filterStatus !== "All") params.append('status', filterStatus);
      if (filterPriority !== "All") params.append('priority', filterPriority);
      if (filterCategory !== "All") params.append('category', filterCategory);
      if (filterOKR !== "All") params.append('is_okr', filterOKR === "Yes" ? "1" : "0");
      if (searchQ) params.append('search', searchQ);

      const res = await apiCall(`/tasks?${params}`);
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const loadComments = async (taskId) => {
    try {
      const res = await apiCall(`/comments/task/${taskId}`);
      setComments(prev => ({ ...prev, [taskId]: res.comments || [] }));
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const getStats = (ownerId) => {
    const t = ownerId ? tasks.filter(x=>x.owner_id===ownerId) : tasks;
    return {
      total:t.length,
      completed:t.filter(x=>x.status==="Completed").length,
      inProgress:t.filter(x=>x.status==="In Progress").length,
      notStarted:t.filter(x=>x.status==="Not Started").length,
      overdue:t.filter(x=>isOverdue(x)).length
    };
  };

  const global = getStats(null);
  const owner = users.find(o=>o.id===selectedOwner);
  const ownerStats = selectedOwner ? getStats(selectedOwner) : null;

  // Helper function to get fiscal year display for quarters
  // All quarters should show the fiscal year range format (e.g., "2025-2026")
  // Fiscal year starts June 30, so fiscal year 2025 spans from June 30, 2025 to June 29, 2026
  const getQuarterYearDisplay = (quarter) => {
    const fiscalYear = quarter.year; // Fiscal year from database (e.g., 2025)
    const fiscalEndYear = fiscalYear + 1; // Fiscal year always spans to next calendar year
    
    // Always show fiscal year range: fiscalYear-fiscalEndYear
    // Examples:
    // Q1 2025: June 30, 2025 - Sep 29, 2025 → "2025-2026" (fiscal year 2025)
    // Q2 2025: Sep 30, 2025 - Dec 29, 2025 → "2025-2026" (fiscal year 2025)
    // Q3 2025: Dec 30, 2025 - Mar 30, 2026 → "2025-2026" (fiscal year 2025)
    // Q4 2025: Mar 31, 2026 - Jun 29, 2026 → "2025-2026" (fiscal year 2025)
    return `${fiscalYear}-${fiscalEndYear}`;
  };

  // Calculate priority breakdown
  const priorityStats = useMemo(() => {
    const stats = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    tasks.forEach(t => {
      if (t.priority && stats.hasOwnProperty(t.priority)) {
        stats[t.priority]++;
      }
    });
    return stats;
  }, [tasks]);

  // Calculate deadline stats
  const deadlineStats = useMemo(() => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    let thisWeek = 0;
    let thisMonth = 0;

    tasks.forEach(t => {
      if (t.due_date) {
        const dueDate = new Date(t.due_date);
        if (dueDate <= endOfWeek) thisWeek++;
        if (dueDate <= endOfMonth) thisMonth++;
      }
    });

    return { thisWeek, thisMonth };
  }, [tasks]);

  // Calculate category breakdown
  const categoryStats = useMemo(() => {
    const stats = {};
    CATEGORIES.forEach(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      const completed = catTasks.filter(t => t.status === 'Completed').length;
      stats[cat] = { total: catTasks.length, completed };
    });
    return stats;
  }, [tasks]);

  // Calculate performance statistics
  const performanceStats = useMemo(() => {
    let filtered = tasks;
    if (filterOKR !== "All") {
      filtered = filtered.filter(t => filterOKR === "Yes" ? (t.is_okr === 1 || t.is_okr === true) : (t.is_okr !== 1 && t.is_okr !== true));
    }
    const rated = filtered.filter(t => t.performance).length;
    const onTrack = filtered.filter(t => t.performance === 'green').length;
    const atRisk = filtered.filter(t => t.performance === 'yellow').length;
    const offTrack = filtered.filter(t => t.performance === 'red').length;
    const unrated = filtered.length - rated;
    const onTrackPct = rated > 0 ? Math.round((onTrack / rated) * 100) : 0;
    const atRiskPct = rated > 0 ? Math.round((atRisk / rated) * 100) : 0;
    const offTrackPct = rated > 0 ? Math.round((offTrack / rated) * 100) : 0;
    return { rated, onTrack, atRisk, offTrack, unrated, total: filtered.length, onTrackPct, atRiskPct, offTrackPct };
  }, [tasks, filterOKR]);

  // Performance by owner
  const performanceByOwner = useMemo(() => {
    let filtered = tasks;
    if (filterOKR !== "All") {
      filtered = filtered.filter(t => filterOKR === "Yes" ? (t.is_okr === 1 || t.is_okr === true) : (t.is_okr !== 1 && t.is_okr !== true));
    }
    const ownerPerf = {};
    users.forEach(u => {
      const ownerTasks = filtered.filter(t => t.owner_id === u.id);
      const rated = ownerTasks.filter(t => t.performance).length;
      const onTrack = ownerTasks.filter(t => t.performance === 'green').length;
      const atRisk = ownerTasks.filter(t => t.performance === 'yellow').length;
      const offTrack = ownerTasks.filter(t => t.performance === 'red').length;
      ownerPerf[u.id] = {
        owner: u,
        total: ownerTasks.length,
        rated,
        onTrack,
        atRisk,
        offTrack
      };
    });
    return Object.values(ownerPerf).filter(p => p.total > 0).sort((a, b) => b.total - a.total);
  }, [tasks, users, filterOKR]);

  // Performance by category
  const performanceByCategory = useMemo(() => {
    let filtered = tasks;
    if (filterOKR !== "All") {
      filtered = filtered.filter(t => filterOKR === "Yes" ? (t.is_okr === 1 || t.is_okr === true) : (t.is_okr !== 1 && t.is_okr !== true));
    }
    const catPerf = {};
    CATEGORIES.forEach(cat => {
      const catTasks = filtered.filter(t => t.category === cat);
      const onTrack = catTasks.filter(t => t.performance === 'green').length;
      const atRisk = catTasks.filter(t => t.performance === 'yellow').length;
      const offTrack = catTasks.filter(t => t.performance === 'red').length;
      const rated = catTasks.filter(t => t.performance).length;
      if (catTasks.length > 0) {
        catPerf[cat] = { total: catTasks.length, rated, onTrack, atRisk, offTrack };
      }
    });
    return catPerf;
  }, [tasks, filterOKR]);

  // Off track and at risk tasks
  const offTrackTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.performance === 'red');
    if (filterOKR !== "All") {
      filtered = filtered.filter(t => filterOKR === "Yes" ? (t.is_okr === 1 || t.is_okr === true) : (t.is_okr !== 1 && t.is_okr !== true));
    }
    return filtered.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }, [tasks, filterOKR]);

  const atRiskTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.performance === 'yellow');
    if (filterOKR !== "All") {
      filtered = filtered.filter(t => filterOKR === "Yes" ? (t.is_okr === 1 || t.is_okr === true) : (t.is_okr !== 1 && t.is_okr !== true));
    }
    return filtered.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }, [tasks, filterOKR]);

  // Category colors for progress bars
  const categoryColors = {
    "CEO Decision": "#9333EA",
    "Client Experience": "#3B82F6",
    "Corporate Structure & Compliance": "#10B981",
    "Financial Health": "#F59E0B",
    "Growth & Revenue": "#EF4444",
    "People & Organization": "#9333EA",
    "Product & Innovation": "#EC4899",
    "Standardize & Automate": "#14B8A6"
  };

  const filteredTasks = useMemo(() => {
    let t = selectedOwner ? tasks.filter(x=>x.owner_id===selectedOwner) : tasks;
    
    // Apply filters
    if (filterOwner !== "All" && !selectedOwner) {
      t = t.filter(x => x.owner_id === parseInt(filterOwner));
    }
    if (filterCategory !== "All") {
      t = t.filter(x => x.category === filterCategory);
    }
    if (filterPriority !== "All") {
      t = t.filter(x => x.priority === filterPriority);
    }
    if (filterStatus !== "All") {
      t = t.filter(x => x.status === filterStatus);
    }
    if (filterPerformance !== "All") {
      if (filterPerformance === "Rated") {
        t = t.filter(x => x.performance && x.performance !== "");
      } else {
        t = t.filter(x => x.performance === filterPerformance);
      }
    }
    if (filterDue !== "All") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      
      if (filterDue === "Overdue") {
        t = t.filter(x => isOverdue(x));
      } else if (filterDue === "This Week") {
        t = t.filter(x => {
          if (!x.due_date) return false;
          const dueDate = new Date(x.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate >= today && dueDate <= endOfWeek;
        });
      } else if (filterDue === "This Month") {
        t = t.filter(x => {
          if (!x.due_date) return false;
          const dueDate = new Date(x.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate >= today && dueDate <= endOfMonth;
        });
      }
    }
    if (filterOKR !== "All") {
      t = t.filter(x => filterOKR === "Yes" ? (x.is_okr === true || x.is_okr === 1) : (x.is_okr !== true && x.is_okr !== 1));
    }
    if (searchQ) {
      t = t.filter(x => x.name.toLowerCase().includes(searchQ.toLowerCase()));
    }
    
    return [...t].sort((a,b)=>(isOverdue(b)?1:0)-(isOverdue(a)?1:0));
  }, [tasks, selectedOwner, filterOwner, filterCategory, filterPriority, filterStatus, filterPerformance, filterDue, filterOKR, searchQ]);

  const overdueTasks = useMemo(() => {
    let filtered = tasks.filter(t=>isOverdue(t));
    if (filterOKR !== "All") {
      filtered = filtered.filter(t => filterOKR === "Yes" ? (t.is_okr === 1 || t.is_okr === true) : (t.is_okr !== 1 && t.is_okr !== true));
    }
    return filtered.sort((a,b)=>daysOverdue(b)-daysOverdue(a));
  }, [tasks, filterOKR]);
  
  // Overdue by owner stats
  const overdueByOwner = useMemo(() => {
    const ownerMap = {};
    overdueTasks.forEach(t => {
      const owner = users.find(u => u.id === t.owner_id);
      if (owner) {
        if (!ownerMap[owner.id]) {
          ownerMap[owner.id] = { owner, count: 0 };
        }
        ownerMap[owner.id].count++;
      }
    });
    return Object.values(ownerMap).sort((a, b) => b.count - a.count);
  }, [overdueTasks, users, filterOKR]);
  
  // Custom alert/confirm helper functions
  const showAlert = (message, title = 'Alert') => {
    return new Promise((resolve) => {
      setAlertModal({
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setAlertModal(null);
          resolve(true);
        }
      });
    });
  };
  
  const showConfirm = (message, title = 'Confirm') => {
    return new Promise((resolve) => {
      setAlertModal({
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setAlertModal(null);
          resolve(true);
        },
        onCancel: () => {
          setAlertModal(null);
          resolve(false);
        }
      });
    });
  };

  const addTask = async () => {
    if (!newTask.name.trim() || !selectedQuarter) return;
    if (selectedQuarter.id === 'all') {
      await showAlert('Please select a specific quarter to add tasks. "All Quarters" view is read-only.', 'Info');
      return;
    }
    if (!newTask.due_date || !newTask.due_date.trim()) {
      await showAlert('Due date is required. Please select a due date for the task.', 'Validation Error');
      return;
    }
    if (!newTask.category || !newTask.category.trim()) {
      await showAlert('Category is required. Please select a category for the task.', 'Validation Error');
      return;
    }
    try {
      const taskData = {
        name: newTask.name,
        category: newTask.category,
        priority: newTask.priority || 'Medium',
        due_date: newTask.due_date,
        status: newTask.status || 'Not Started',
        notes: newTask.notes || null,
        is_okr: newTask.is_okr === true ? 1 : 0,
        linked_department: newTask.linked_department || null,
        quarter_id: selectedQuarter.id,
        owner_id: selectedOwner || null
      };
      console.log('Creating task with data:', taskData);
      await apiCall('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      setNewTask({name:"",category:"",priority:"Medium",due_date:"",status:"Not Started",notes:"",is_okr:false,linked_department:""});
      setShowAdd(false);
      loadTasks();
    } catch (err) {
      await showAlert('Error creating task: ' + err.message, 'Error');
    }
  };

  const updateTask = async (id, field, value) => {
    try {
      await apiCall(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value })
      });
      loadTasks();
    } catch (err) {
      await showAlert('Error updating task: ' + err.message, 'Error');
    }
  };

  const deleteTask = async (id) => {
    const confirmed = await showConfirm('Delete this task?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await apiCall(`/tasks/${id}`, { method: 'DELETE' });
      loadTasks();
    } catch (err) {
      await showAlert('Error deleting task: ' + err.message, 'Error');
    }
  };

  const saveEdit = async () => {
    if (!editTask || !editTask.name.trim()) return;
    try {
      const updateData = {
        ...editTask,
        is_okr: (editTask.is_okr === true || editTask.is_okr === 'true' || editTask.is_okr === 1) ? 1 : 0,
        linked_department: editTask.linked_department || null
      };
      console.log('Updating task with data:', updateData);
      await apiCall(`/tasks/${editTask.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      setEditTask(null);
      loadTasks();
    } catch (err) {
      await showAlert('Error saving task: ' + err.message, 'Error');
    }
  };

  const addOwner = async () => {
    if (!newOwner.name.trim() || !newOwner.email.trim()) return;
    try {
      await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify(newOwner)
      });
      setNewOwner({name:"",email:"",department:""});
      setShowAddOwner(false);
      loadData();
      await showAlert('User created and invitation email sent!', 'Success');
    } catch (err) {
      await showAlert('Error creating user: ' + err.message, 'Error');
    }
  };

  const loadAllUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const usersRes = await apiCall('/users');
      setAllUsers(usersRes.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const addUser = async () => {
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      await showAlert('Name and email are required', 'Validation Error');
      return;
    }
    try {
      await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify(newUserForm)
      });
      setNewUserForm({name:"",email:"",username:"",department:"",role:"user"});
      setShowAddUser(false);
      loadAllUsers();
      await showAlert('User created successfully!', 'Success');
    } catch (err) {
      await showAlert('Error creating user: ' + err.message, 'Error');
    }
  };

  const changePassword = async () => {
    if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmPassword) {
      await showAlert('All password fields are required', 'Validation Error');
      return;
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      await showAlert('New password and confirm password do not match', 'Validation Error');
      return;
    }
    if (changePasswordForm.newPassword.length < 6) {
      await showAlert('New password must be at least 6 characters long', 'Validation Error');
      return;
    }
    try {
      // First verify current password
      const verifyRes = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          password: changePasswordForm.currentPassword
        })
      });
      
      if (!verifyRes.success) {
        await showAlert('Current password is incorrect', 'Validation Error');
        return;
      }
      
      // Update password
      await apiCall(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          password: changePasswordForm.newPassword
        })
      });
      
      setChangePasswordForm({currentPassword:"",newPassword:"",confirmPassword:""});
      setShowChangePassword(false);
      await showAlert('Password changed successfully!', 'Success');
    } catch (err) {
      await showAlert('Error changing password: ' + err.message, 'Error');
    }
  };

  const updateUser = async () => {
    if (!editingUser || !editingUser.name.trim() || !editingUser.email.trim()) {
      await showAlert('Name and email are required', 'Validation Error');
      return;
    }
    try {
      const updateData = {
        name: editingUser.name,
        email: editingUser.email,
        department: editingUser.department,
        role: editingUser.role
      };
      
      // Only include username if it was changed
      if (editingUser.username !== undefined) {
        updateData.username = editingUser.username || null;
      }
      
      // Only include password if it was provided (not empty)
      if (editingUser.newPassword && editingUser.newPassword.trim()) {
        updateData.password = editingUser.newPassword;
      }
      
      await apiCall(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      setEditingUser(null);
      loadAllUsers();
      loadData(); // Reload main data too
      await showAlert('User updated successfully!', 'Success');
    } catch (err) {
      await showAlert('Error updating user: ' + err.message, 'Error');
    }
  };

  const deleteUser = async (userId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this user? This action cannot be undone.', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await apiCall(`/users/${userId}`, { method: 'DELETE' });
      loadAllUsers();
      loadData();
      await showAlert('User deleted successfully!', 'Success');
    } catch (err) {
      await showAlert('Error deleting user: ' + err.message, 'Error');
    }
  };

  // Quarters management functions
  const updateQuarter = async () => {
    if (!editingQuarter) return;
    try {
      await apiCall(`/quarters/${editingQuarter.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          start_date: editingQuarter.start_date,
          end_date: editingQuarter.end_date,
          is_active: editingQuarter.is_active
        })
      });
      setEditingQuarter(null);
      await loadData();
      await showAlert('Quarter updated successfully!', 'Success');
    } catch (err) {
      await showAlert('Error updating quarter: ' + err.message, 'Error');
    }
  };

  // Toggle quarter active status
  const toggleQuarterActive = async (quarter) => {
    try {
      await apiCall(`/quarters/${quarter.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_active: !quarter.is_active
        })
      });
      await loadData();
      await showAlert(`Quarter ${!quarter.is_active ? 'activated' : 'deactivated'} successfully!`, 'Success');
    } catch (err) {
      await showAlert('Error updating quarter: ' + err.message, 'Error');
    }
  };

  const deleteQuarter = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this quarter? This will fail if there are tasks assigned to it.', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await apiCall(`/quarters/${id}`, { method: 'DELETE' });
      await loadData();
      await showAlert('Quarter deleted successfully!', 'Success');
    } catch (err) {
      await showAlert('Error deleting quarter: ' + err.message, 'Error');
    }
  };

  const bulkCreateQuarters = async () => {
    if (!bulkYear || bulkYear < 2000 || bulkYear > 2100) {
      await showAlert('Please enter a valid year (2000-2100)', 'Validation Error');
      return;
    }
    const confirmed = await showConfirm(`Create all 4 quarters for fiscal year ${bulkYear}?`, 'Confirm Bulk Create');
    if (!confirmed) return;
    try {
      await apiCall('/quarters/bulk', {
        method: 'POST',
        body: JSON.stringify({ fiscalYear: parseInt(bulkYear) })
      });
      setShowBulkCreate(false);
      await loadData();
      await showAlert(`Successfully created all quarters for fiscal year ${bulkYear}!`, 'Success');
    } catch (err) {
      await showAlert('Error creating quarters: ' + err.message, 'Error');
    }
  };

  const bulkDeleteQuarters = async (year) => {
    const confirmed = await showConfirm(`Delete all quarters for fiscal year ${year}? This will fail if there are tasks in these quarters.`, 'Confirm Bulk Delete');
    if (!confirmed) return;
    try {
      await apiCall(`/quarters/year/${year}`, { method: 'DELETE' });
      await loadData();
      await showAlert(`Successfully deleted all quarters for fiscal year ${year}!`, 'Success');
    } catch (err) {
      await showAlert('Error deleting quarters: ' + err.message, 'Error');
    }
  };

  const addComment = async (taskId) => {
    const text = (commentInput[taskId]||"").trim();
    if (!text) return;
    try {
      await apiCall('/comments', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, text })
      });
      setCommentInput(prev => ({ ...prev, [taskId]: "" }));
      loadComments(taskId);
    } catch (err) {
      await showAlert('Error adding comment: ' + err.message, 'Error');
    }
  };

  const handleUploadClick = () => {
    if (quarters.length === 0) {
      setUploadMsg({type:"error", text:"No quarters available. Please contact an administrator."});
      setTimeout(()=>setUploadMsg(null), 5000);
      return;
    }
    setShowQuarterModal(true);
  };

  const handleQuarterSelect = async (quarter) => {
    if (quarter.id === 'all') {
      setShowQuarterModal(false);
      await showAlert('Please select a specific quarter for Excel upload. "All Quarters" view is only for viewing tasks.', 'Info');
      return;
    }
    setUploadQuarter(quarter);
    setShowQuarterModal(false);
    // Trigger file input after quarter is selected
    setTimeout(() => {
      if (uploadFileInputRef.current) {
        uploadFileInputRef.current.click();
      }
    }, 100);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setUploadQuarter(null);
      return;
    }
    e.target.value = "";

    if (!uploadQuarter) {
      setUploadMsg({type:"error", text:"Please select a quarter first."});
      setTimeout(()=>setUploadMsg(null), 8000);
      setUploadQuarter(null);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('quarter_id', uploadQuarter.id);

      const response = await fetch(`${API_BASE}/upload/excel`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadMsg({type:"success", text:result.message});
      setTimeout(()=>setUploadMsg(null), 5000);
      
      // Reload all data after successful upload
      await loadData();
      await loadTasks();
      
      // Reset upload quarter
      setUploadQuarter(null);
    } catch (err) {
      setUploadMsg({type:"error", text:"❌ " + err.message});
      setTimeout(()=>setUploadMsg(null), 8000);
      setUploadQuarter(null);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const quarterParam = selectedQuarter && selectedQuarter.id !== 'all' ? `?quarter_id=${selectedQuarter.id}` : '';
      const response = await fetch(`${API_BASE}/export/excel${quarterParam}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `Classera_Report_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert('Error downloading report: ' + err.message, 'Error');
    }
  };

  const navTo = (v,oid=null,statusFilter=null) => {
    setView(v);
    setSelectedOwner(oid);
    setFilterStatus(statusFilter || "All");
    setFilterPriority("All");
    setFilterCategory("All");
    setFilterPerformance("All");
    setFilterDue("All");
    setSearchQ("");
    setShowAdd(false);
    
    // Update URL and browser history
    const params = new URLSearchParams();
    if (v !== 'dashboard') {
      params.set('view', v);
    }
    if (oid) {
      params.set('owner', oid);
    }
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.pushState({ view: v, owner: oid, status: statusFilter }, '', newUrl);
  };

  const logout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
      setUser(null);
      setView('login');
      setShowLogin(true);
      // Clear any selected quarter and tasks
      setSelectedQuarter(null);
      setTasks([]);
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      console.error('Logout error:', err);
      // Even if API call fails, clear local state and redirect to login
      setUser(null);
      setView('login');
      setShowLogin(true);
      setSelectedQuarter(null);
      setTasks([]);
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  if (loading) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12,background:"#F0F4F8"}}>
        <div style={{width:40,height:40,background:"#C9A84C",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:18,color:"#1B2A4A"}}>C</div>
        <div style={{fontSize:14,color:"#718096"}}>Loading...</div>
      </div>
    );
  }

  // Login/Register Screen
  if (!user) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#F0F4F8",padding:20}}>
        <div style={{background:"white",borderRadius:16,padding:40,width:"100%",maxWidth:420,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{width:60,height:60,background:"#C9A84C",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:24,color:"#1B2A4A",margin:"0 auto 16px"}}>C</div>
            <h1 style={{margin:0,fontSize:24,fontWeight:800,color:"#1B2A4A"}}>Classera Task Tracker</h1>
            <p style={{margin:"8px 0 0",fontSize:14,color:"#718096"}}>Sign in to continue</p>
          </div>

          {error && (
            <div style={{background:"#FEE2E2",border:"1px solid #FECACA",color:"#991B1B",padding:"12px 16px",borderRadius:8,marginBottom:20,fontSize:13}}>
              {error}
            </div>
          )}

          {showLogin ? (
            <form onSubmit={handleLogin}>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#4A5568",marginBottom:6}}>Email</label>
                <input type="email" value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))}
                  style={{width:"100%",padding:"10px 14px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}
                  placeholder="your@email.com" required />
              </div>
              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#4A5568",marginBottom:6}}>Password</label>
                <input type="password" value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))}
                  style={{width:"100%",padding:"10px 14px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}
                  placeholder="••••••••" required />
              </div>
              <button type="submit" style={{width:"100%",background:"#1B2A4A",color:"white",border:"none",padding:"12px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700,marginBottom:16}}>
                Sign In
              </button>
              {/* <div style={{textAlign:"center",marginBottom:16}}>
                <button type="button" onClick={handleMicrosoftLogin} style={{width:"100%",background:"#0078D4",color:"white",border:"none",padding:"12px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:12}}>
                  Sign in with Microsoft
                </button>
              </div> */}
              {/* <div style={{textAlign:"center",fontSize:13,color:"#718096"}}>
                Don't have an account?{' '}
                <button type="button" onClick={()=>{setShowLogin(false);setShowRegister(true);setError(null);}} style={{background:"none",border:"none",color:"#1B2A4A",cursor:"pointer",fontWeight:600,textDecoration:"underline"}}>
                  Register
                </button>
              </div> */}
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#4A5568",marginBottom:6}}>Name *</label>
                <input type="text" value={registerForm.name} onChange={e=>setRegisterForm(p=>({...p,name:e.target.value}))}
                  style={{width:"100%",padding:"10px 14px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}
                  placeholder="John Doe" required />
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#4A5568",marginBottom:6}}>Email *</label>
                <input type="email" value={registerForm.email} onChange={e=>setRegisterForm(p=>({...p,email:e.target.value}))}
                  style={{width:"100%",padding:"10px 14px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}
                  placeholder="your@email.com" required />
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#4A5568",marginBottom:6}}>Username (optional)</label>
                <input type="text" value={registerForm.username} onChange={e=>setRegisterForm(p=>({...p,username:e.target.value}))}
                  style={{width:"100%",padding:"10px 14px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}
                  placeholder="johndoe" />
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#4A5568",marginBottom:6}}>Password *</label>
                <input type="password" value={registerForm.password} onChange={e=>setRegisterForm(p=>({...p,password:e.target.value}))}
                  style={{width:"100%",padding:"10px 14px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}
                  placeholder="••••••••" required minLength={6} />
              </div>
              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:"#4A5568",marginBottom:6}}>Department (optional)</label>
                <input type="text" value={registerForm.department} onChange={e=>setRegisterForm(p=>({...p,department:e.target.value}))}
                  style={{width:"100%",padding:"10px 14px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}
                  placeholder="Engineering" />
              </div>
              <button type="submit" style={{width:"100%",background:"#1B2A4A",color:"white",border:"none",padding:"12px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700,marginBottom:16}}>
                Create Account
              </button>
              <div style={{textAlign:"center",fontSize:13,color:"#718096"}}>
                Already have an account?{' '}
                <button type="button" onClick={()=>{setShowRegister(false);setShowLogin(true);setError(null);}} style={{background:"none",border:"none",color:"#1B2A4A",cursor:"pointer",fontWeight:600,textDecoration:"underline"}}>
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div style={{padding:40,textAlign:"center"}}>
        <div style={{color:"#DC2626",fontSize:18,marginBottom:10}}>Error: {error}</div>
        <button onClick={loadData} style={{padding:"10px 20px",background:"#1B2A4A",color:"white",border:"none",borderRadius:8,cursor:"pointer"}}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{fontFamily:"Segoe UI,system-ui,sans-serif",background:"#F0F4F8",minHeight:"100vh"}}>
      {/* UPLOAD MESSAGE TOAST */}
      {uploadMsg && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:2000,background:uploadMsg.type==="success"?"#1B2A4A":"#7B241C",color:"white",padding:"14px 24px",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",fontSize:13,maxWidth:500,whiteSpace:"pre-line",textAlign:"center",fontWeight:600}}>
          {uploadMsg.text}
        </div>
      )}

      {/* QUARTER SELECTION MODAL */}
      {showQuarterModal && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowQuarterModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:isMobile ? 24 : 32,maxWidth:isMobile ? "calc(100% - 32px)" : 600,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#1B2A4A"}}>Select Quarter for Upload</h2>
              <button onClick={()=>setShowQuarterModal(false)} style={{background:"none",border:"none",fontSize:24,color:"#718096",cursor:"pointer",padding:0,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <p style={{margin:"0 0 20px",fontSize:14,color:"#64748B"}}>Choose which quarter to import tasks into:</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:16}}>
              {quarters.filter(q => q.is_active).map(q=>{
                const isCurrent = currentQuarter && q.id === currentQuarter.id;
                const startDate = new Date(q.start_date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
                const endDate = new Date(q.end_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
                const yearDisplay = getQuarterYearDisplay(q);
                return (
                  <div key={q.id} onClick={()=>handleQuarterSelect(q)} 
                    style={{
                      background:isCurrent?"#1B2A4A":"white",
                      border:isCurrent?"2px solid #C9A84C":"2px solid #E2E8F0",
                      borderRadius:12,
                      padding:20,
                      cursor:"pointer",
                      transition:"all 0.2s",
                      boxShadow:isCurrent?"0 4px 12px rgba(27,42,74,0.2)":"0 1px 3px rgba(0,0,0,0.1)"
                    }}
                    onMouseEnter={e=>{
                      if(!isCurrent) {
                        e.currentTarget.style.borderColor="#C9A84C";
                        e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.15)";
                      }
                    }}
                    onMouseLeave={e=>{
                      if(!isCurrent) {
                        e.currentTarget.style.borderColor="#E2E8F0";
                        e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.1)";
                      }
                    }}>
                    <div style={{fontSize:32,fontWeight:900,color:isCurrent?"#C9A84C":"#1B2A4A",marginBottom:4}}>Q{q.quarter}</div>
                    <div style={{fontSize:18,fontWeight:700,color:isCurrent?"white":"#1B2A4A",marginBottom:8}}>{yearDisplay}</div>
                    <div style={{fontSize:11,color:isCurrent?"#C9A84C":"#718096",marginBottom:4}}>{startDate} - {endDate}</div>
                    {isCurrent && (
                      <div style={{fontSize:10,color:"#C9A84C",fontWeight:700,textTransform:"uppercase",marginTop:8}}>Current</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:24,display:"flex",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowQuarterModal(false)} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:"10px 20px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{
        background:"#1B2A4A",
        padding:isMobile ? "0 12px" : "0 24px",
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        height:isMobile ? 50 : 56,
        boxShadow:"0 2px 8px rgba(0,0,0,0.3)",
        position:"sticky",
        top:0,
        zIndex:100,
        flexWrap:"wrap",
        gap:8
      }}>
        <div style={{display:"flex",alignItems:"center",gap:isMobile ? 8 : 12,flex:1,minWidth:0}}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{background:"transparent",border:"none",color:"white",cursor:"pointer",fontSize:20,padding:"4px 8px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            ☰
          </button>
          <div style={{width:isMobile ? 28 : 32,height:isMobile ? 28 : 32,background:"#C9A84C",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:isMobile ? 12 : 14,color:"#1B2A4A",flexShrink:0}}>C</div>
          {!isMobile && (
            <div>
              <div style={{color:"white",fontWeight:800,fontSize:15}}>Classera Task Tracker</div>
              <div style={{color:"#C9A84C",fontSize:10}}>{global.total} tasks · {users.length} users</div>
            </div>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:isMobile ? 4 : 12,flexWrap:"wrap",flexShrink:0}}>
          {selectedQuarter && !isMobile && (
            <select value={selectedQuarter.id} onChange={e=>{
              if (e.target.value === 'all') {
                setSelectedQuarter({id: 'all', name: 'All Quarters'});
              } else {
                const q = quarters.find(q=>q.id===parseInt(e.target.value));
                if (q) setSelectedQuarter(q);
              }
            }} style={{padding:"5px 10px",border:"1px solid #C9A84C",borderRadius:6,background:"#1B2A4A",color:"#C9A84C",fontSize:12}}>
              <option value="all">📊 All Quarters</option>
              {quarters.filter(q => q.is_active).map(q=>{
                const yearDisplay = getQuarterYearDisplay(q);
                return <option key={q.id} value={q.id}>Q{q.quarter} {yearDisplay}</option>;
              })}
            </select>
          )}
          {!isMobile && (
            <>
              <button onClick={handleUploadClick} style={{background:"#2E7D52",color:"white",border:"none",padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}>
                ⬆ Upload Excel
              </button>
              <button onClick={handleDownloadReport} style={{background:"#1B2A4A",color:"white",border:"none",padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}>
                📥 Download Report
              </button>
            </>
          )}
          <input 
            ref={uploadFileInputRef} 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={handleUpload} 
            style={{display:"none"}} 
          />
          <div style={{display:"flex",alignItems:"center",gap:isMobile ? 6 : 12,paddingLeft:isMobile ? 0 : 12,borderLeft:isMobile ? "none" : "1px solid rgba(255,255,255,0.2)",position:"relative"}}>
            {!isMobile && (
              <div style={{position:"relative"}} data-user-menu>
                <div 
                  onClick={()=>setShowUserMenu(!showUserMenu)}
                  style={{color:"white",fontSize:13,fontWeight:600,cursor:"pointer",padding:"4px 8px",borderRadius:4,display:"flex",alignItems:"center",gap:4}}
                  onMouseEnter={e=>e.target.style.background="rgba(255,255,255,0.1)"}
                  onMouseLeave={e=>e.target.style.background="transparent"}
                >
                  {user?.name}
                  <span style={{fontSize:10}}>▼</span>
                </div>
                {showUserMenu && (
                  <div style={{
                    position:"absolute",
                    top:"100%",
                    right:0,
                    marginTop:8,
                    background:"white",
                    borderRadius:8,
                    boxShadow:"0 4px 12px rgba(0,0,0,0.15)",
                    minWidth:180,
                    zIndex:1000,
                    overflow:"hidden"
                  }}>
                    <button 
                      onClick={()=>{
                        setShowChangePassword(true);
                        setShowUserMenu(false);
                      }}
                      style={{
                        width:"100%",
                        padding:"10px 16px",
                        border:"none",
                        background:"transparent",
                        textAlign:"left",
                        cursor:"pointer",
                        fontSize:13,
                        color:"#1B2A4A",
                        fontWeight:500
                      }}
                      onMouseEnter={e=>e.target.style.background="#F7FAFC"}
                      onMouseLeave={e=>e.target.style.background="transparent"}
                    >
                      🔒 Change Password
                    </button>
                    <div style={{height:1,background:"#E2E8F0",margin:"4px 0"}}></div>
                    <button 
                      onClick={logout}
                      style={{
                        width:"100%",
                        padding:"10px 16px",
                        border:"none",
                        background:"transparent",
                        textAlign:"left",
                        cursor:"pointer",
                        fontSize:13,
                        color:"#DC2626",
                        fontWeight:500
                      }}
                      onMouseEnter={e=>e.target.style.background="#F7FAFC"}
                      onMouseLeave={e=>e.target.style.background="transparent"}
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            )}
            {isMobile && (
              <button onClick={logout} style={{background:"transparent",color:"white",border:"1px solid white",padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:isMobile ? 11 : 12}}>Logout</button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={()=>setSidebarOpen(false)}
          style={{
            position:"fixed",
            inset:0,
            background:"rgba(0,0,0,0.5)",
            zIndex:150,
            top:isMobile ? 50 : 56
          }}
        />
      )}
      
      <div style={{display:"flex",minHeight:`calc(100vh - ${isMobile ? 50 : 56}px)`}}>
        {/* SIDEBAR */}
        <div style={{
          width:sidebarOpen ? (isMobile ? 260 : 240) : 0,
          background:"#1B2A4A",
          transition:"width 0.3s ease",
          overflow:"hidden",
          boxShadow:isMobile && sidebarOpen ? "2px 0 12px rgba(0,0,0,0.3)" : "2px 0 8px rgba(0,0,0,0.1)",
          position:isMobile ? "fixed" : "sticky",
          top:isMobile ? 50 : 56,
          height:`calc(100vh - ${isMobile ? 50 : 56}px)`,
          zIndex:isMobile ? 160 : 90,
          left:0
        }}>
          <div style={{padding:"20px 0",display:"flex",flexDirection:"column",gap:4}}>
            {[["dashboard","Dashboard","📊"],["performance","Performance","📈"],["all","All Tasks","📋"],["overdue","Overdue","🔴"],...(user?.role==="admin"?[["users","Users","👥"],["quarters","Quarters","📅"]]:[])].map(([v,l,icon])=>(
              <button 
                key={v} 
                onClick={()=>{
                  navTo(v);
                  if(isMobile) setSidebarOpen(false);
                }} 
                style={{
                  background:view===v?"#C9A84C":"transparent",
                  color:view===v?"#1B2A4A":"white",
                  border:"none",
                  padding:isMobile ? "14px 20px" : "12px 20px",
                  borderRadius:0,
                  cursor:"pointer",
                  fontSize:isMobile ? 15 : 14,
                  fontWeight:view===v?700:600,
                  textAlign:"left",
                  display:"flex",
                  alignItems:"center",
                  gap:12,
                  transition:"all 0.2s ease",
                  borderLeft:view===v?"4px solid #1B2A4A":"4px solid transparent"
                }}
                onMouseEnter={(e)=>{
                  if(view!==v && !isMobile) e.target.style.background="rgba(201,168,76,0.1)";
                }}
                onMouseLeave={(e)=>{
                  if(view!==v && !isMobile) e.target.style.background="transparent";
                }}
              >
                <span style={{fontSize:isMobile ? 20 : 18}}>{icon}</span>
                <span>{l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,minWidth:0,width:"100%"}}>
          <div style={{maxWidth:1400,margin:"0 auto",padding:isMobile ? "16px 12px" : "24px 16px"}}>
            {/* BREADCRUMBS */}
            {breadcrumbs.length > 0 && (
              <div style={{marginBottom:isMobile ? 12 : 16,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} style={{display:"flex",alignItems:"center",gap:8}}>
                    {index > 0 && (
                      <span style={{color:"#CBD5E0",fontSize:14}}>›</span>
                    )}
                    <button
                      onClick={() => {
                        if (crumb.owner) {
                          navTo(crumb.view, crumb.owner);
                        } else {
                          navTo(crumb.view);
                        }
                      }}
                      style={{
                        background:"transparent",
                        border:"none",
                        color:index === breadcrumbs.length - 1 ? "#1B2A4A" : "#64748B",
                        fontSize:isMobile ? 12 : 13,
                        fontWeight:index === breadcrumbs.length - 1 ? 700 : 500,
                        cursor:index < breadcrumbs.length - 1 ? "pointer" : "default",
                        padding:"4px 0",
                        textDecoration:"none"
                      }}
                      onMouseEnter={(e) => {
                        if (index < breadcrumbs.length - 1) {
                          e.target.style.color = "#1B2A4A";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index < breadcrumbs.length - 1) {
                          e.target.style.color = "#64748B";
                        }
                      }}
                    >
                      {crumb.label}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
        {/* USER MANAGEMENT (ADMIN ONLY) - Show regardless of quarter */}
        {view==="users" && user?.role==="admin" ? (
          <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:8}}>
              <h2 style={{margin:0,fontSize:isMobile ? 13 : 15,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>User Management</h2>
              <button onClick={()=>setShowAddUser(true)} style={{background:"#C9A84C",color:"#1B2A4A",border:"none",padding:isMobile ? "6px 12px" : "7px 16px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:isMobile ? 12 : 13}}>+ Add User</button>
            </div>

            {showAddUser && (
              <div style={{background:"#F7FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:20,marginBottom:20}}>
                <h3 style={{margin:"0 0 16px",fontSize:14,fontWeight:700,color:"#1B2A4A"}}>Add New User</h3>
                <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr",gap:12,marginBottom:12}}>
                  <input placeholder="Name *" value={newUserForm.name} onChange={e=>setNewUserForm(p=>({...p,name:e.target.value}))} style={{padding:"8px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                  <input placeholder="Email *" type="email" value={newUserForm.email} onChange={e=>setNewUserForm(p=>({...p,email:e.target.value}))} style={{padding:"8px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                  <input placeholder="Username (optional)" value={newUserForm.username} onChange={e=>setNewUserForm(p=>({...p,username:e.target.value}))} style={{padding:"8px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                  <select value={newUserForm.department||""} onChange={e=>setNewUserForm(p=>({...p,department:e.target.value}))} style={{padding:"8px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white"}}>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(dept=><option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <select value={newUserForm.role} onChange={e=>setNewUserForm(p=>({...p,role:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white",marginBottom:12}}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addUser} style={{background:"#1B2A4A",color:"white",border:"none",padding:"8px 18px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>Create User</button>
                  <button onClick={()=>{setShowAddUser(false);setNewUserForm({name:"",email:"",username:"",department:"",role:"user"});}} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:"8px 18px",borderRadius:6,cursor:"pointer",fontSize:12}}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#F7FAFC"}}>
                    {["Name","Email","Username","Department","Role","Status","Actions"].map((h,i)=>(
                      <th key={i} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#4A5568",fontSize:11,textTransform:"uppercase",borderBottom:"2px solid #E2E8F0"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u,i)=>(
                    <tr key={u.id} style={{background:i%2===0?"#FAFBFC":"white",borderBottom:"1px solid #EDF2F7"}}>
                      <td style={{padding:"10px 12px",fontWeight:600}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:32,height:32,borderRadius:8,background:AVATAR_COLORS[i%AVATAR_COLORS.length],color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12}}>{u.avatar||u.name?.[0]?.toUpperCase()||"?"}</div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",color:"#718096"}}>{u.email}</td>
                      <td style={{padding:"10px 12px",color:"#718096"}}>{u.username||"—"}</td>
                      <td style={{padding:"10px 12px",color:"#718096"}}>{u.department||"—"}</td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{background:u.role==="admin"?"#FEE2E2":"#DCFCE7",color:u.role==="admin"?"#991B1B":"#065F46",padding:"3px 8px",borderRadius:4,fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{u.role}</span>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{background:u.is_active?"#DCFCE7":"#FEE2E2",color:u.is_active?"#065F46":"#991B1B",padding:"3px 8px",borderRadius:4,fontSize:11,fontWeight:700}}>{u.is_active?"Active":"Inactive"}</span>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>setEditingUser({...u,newPassword:""})} style={{background:"none",border:"none",cursor:"pointer",color:"#1B2A4A",fontSize:14,fontWeight:600}}>✏️ Edit</button>
                          <button onClick={()=>deleteUser(u.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#DC2626",fontSize:14,fontWeight:600}}>🗑 Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : view==="quarters" && user?.role==="admin" ? (
          <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:8}}>
              <h2 style={{margin:0,fontSize:isMobile ? 13 : 15,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>Quarters Management</h2>
              <button onClick={()=>setShowBulkCreate(true)} style={{background:"#C9A84C",color:"#1B2A4A",border:"none",padding:isMobile ? "6px 12px" : "7px 16px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:isMobile ? 12 : 13}}>+ Bulk Create Year</button>
            </div>

            {showBulkCreate && (
              <div style={{background:"#F7FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:isMobile ? 16 : 20,marginBottom:20}}>
                <h3 style={{margin:"0 0 16px",fontSize:isMobile ? 13 : 14,fontWeight:700,color:"#1B2A4A"}}>Bulk Create Quarters for Fiscal Year</h3>
                <div style={{display:"flex",flexDirection:isMobile ? "column" : "row",gap:isMobile ? 8 : 12,alignItems:isMobile ? "stretch" : "center",marginBottom:12}}>
                  <label style={{fontSize:isMobile ? 11 : 12,fontWeight:600,color:"#4A5568",display:"flex",alignItems:"center"}}>Fiscal Year:</label>
                  <input type="number" value={bulkYear} onChange={e=>setBulkYear(parseInt(e.target.value)||new Date().getFullYear())} min="2000" max="2100" style={{padding:isMobile ? "6px 10px" : "8px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,width:isMobile ? "100%" : 120}} />
                  <div style={{fontSize:isMobile ? 10 : 11,color:"#718096"}}>Creates Q1-Q4 for the specified fiscal year</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={bulkCreateQuarters} style={{background:"#1B2A4A",color:"white",border:"none",padding:"8px 18px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>Create All Quarters</button>
                  <button onClick={()=>{setShowBulkCreate(false);setBulkYear(new Date().getFullYear());}} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:"8px 18px",borderRadius:6,cursor:"pointer",fontSize:12}}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#F7FAFC"}}>
                    {["Fiscal Year","Quarter","Start Date","End Date","Status"].map((h,i)=>(
                      <th key={i} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#4A5568",fontSize:11,textTransform:"uppercase",borderBottom:"2px solid #E2E8F0"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quarters.map((q,i)=> {
                    const yearDisplay = getQuarterYearDisplay(q);
                    const startDate = new Date(q.start_date).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});
                    const endDate = new Date(q.end_date).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});
                    return (
                      <tr key={q.id} style={{background:i%2===0?"#FAFBFC":"white",borderBottom:"1px solid #EDF2F7"}}>
                        <td style={{padding:"10px 12px",fontWeight:600}}>{yearDisplay}</td>
                        <td style={{padding:"10px 12px",color:"#1B2A4A",fontWeight:700}}>Q{q.quarter}</td>
                        <td style={{padding:"10px 12px",color:"#718096"}}>{startDate}</td>
                        <td style={{padding:"10px 12px",color:"#718096"}}>{endDate}</td>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{background:q.is_active?"#DCFCE7":"#FEE2E2",color:q.is_active?"#166534":"#991B1B",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600}}>
                              {q.is_active?"Active":"Inactive"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleQuarterActive(q);
                              }}
                              style={{
                                background:"transparent",
                                border:"none",
                                cursor:"pointer",
                                padding:"4px",
                                display:"flex",
                                alignItems:"center",
                                justifyContent:"center",
                                fontSize:16,
                                color:q.is_active ? "#166534" : "#991B1B"
                              }}
                              title={q.is_active ? "Deactivate" : "Activate"}
                            >
                              {q.is_active ? "✓" : "✗"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Group by year for bulk delete */}
            {quarters.length > 0 && (
              <div style={{marginTop:isMobile ? 16 : 24,padding:isMobile ? 16 : 20,background:"#F7FAFC",borderRadius:10}}>
                <h3 style={{margin:"0 0 16px",fontSize:isMobile ? 13 : 14,fontWeight:700,color:"#1B2A4A"}}>Bulk Delete by Fiscal Year</h3>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {[...new Set(quarters.map(q=>q.year))].sort((a,b)=>b-a).map(year=>(
                    <button key={year} onClick={()=>bulkDeleteQuarters(year)} style={{background:"#DC2626",color:"white",border:"none",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>
                      Delete FY {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !selectedQuarter ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:isMobile ? "60vh" : "72vh",gap:isMobile ? 20 : 28,textAlign:"center",padding:isMobile ? "20px" : 0}}>
            <div style={{fontSize:isMobile ? 48 : 72,lineHeight:1}}>📊</div>
            <div>
              <div style={{fontSize:isMobile ? 20 : 26,fontWeight:900,color:"#1B2A4A",marginBottom:8}}>Classera Task Tracker</div>
              <div style={{fontSize:isMobile ? 12 : 14,color:"#64748B",marginBottom:20}}>Select a quarter to get started</div>
            </div>
            
            {/* Quarter Selector */}
            {loading ? (
              <div style={{fontSize:14,color:"#718096"}}>Loading quarters...</div>
            ) : quarters.length > 0 ? (
              <div style={{width:"100%",maxWidth:800}}>
                <div style={{fontSize:12,fontWeight:700,color:"#4A5568",textTransform:"uppercase",marginBottom:16,textAlign:"center"}}>Select Quarter</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",gap:isMobile ? 12 : 16,marginBottom:32}}>
                  <div onClick={()=>setSelectedQuarter({id: 'all', name: 'All Quarters'})} 
                    style={{
                      background:"#1B2A4A",
                      border:"2px solid #C9A84C",
                      borderRadius:12,
                      padding:20,
                      cursor:"pointer",
                      transition:"all 0.2s",
                      boxShadow:"0 4px 12px rgba(27,42,74,0.2)"
                    }}
                    onMouseEnter={e=>{
                      e.currentTarget.style.borderColor="#C9A84C";
                      e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={e=>{
                      e.currentTarget.style.borderColor="#C9A84C";
                      e.currentTarget.style.boxShadow="0 4px 12px rgba(27,42,74,0.2)";
                    }}>
                    <div style={{fontSize:32,fontWeight:900,color:"#C9A84C",marginBottom:4}}>📊</div>
                    <div style={{fontSize:18,fontWeight:700,color:"white",marginBottom:8}}>All Quarters</div>
                    <div style={{fontSize:11,color:"#C9A84C"}}>View all tasks</div>
                  </div>
                  {quarters.filter(q => q.is_active).map(q=>{
                    const isCurrent = currentQuarter && q.id === currentQuarter.id;
                    const startDate = new Date(q.start_date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
                    const endDate = new Date(q.end_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
                    const yearDisplay = getQuarterYearDisplay(q);
                    return (
                      <div key={q.id} onClick={()=>setSelectedQuarter(q)} 
                        style={{
                          background:isCurrent?"#1B2A4A":"white",
                          border:isCurrent?"2px solid #C9A84C":"2px solid #E2E8F0",
                          borderRadius:12,
                          padding:20,
                          cursor:"pointer",
                          transition:"all 0.2s",
                          boxShadow:isCurrent?"0 4px 12px rgba(27,42,74,0.2)":"0 1px 3px rgba(0,0,0,0.1)"
                        }}
                        onMouseEnter={e=>{
                          if(!isCurrent) {
                            e.currentTarget.style.borderColor="#C9A84C";
                            e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.15)";
                          }
                        }}
                        onMouseLeave={e=>{
                          if(!isCurrent) {
                            e.currentTarget.style.borderColor="#E2E8F0";
                            e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.1)";
                          }
                        }}>
                        <div style={{fontSize:32,fontWeight:900,color:isCurrent?"#C9A84C":"#1B2A4A",marginBottom:4}}>Q{q.quarter}</div>
                        <div style={{fontSize:18,fontWeight:700,color:isCurrent?"white":"#1B2A4A",marginBottom:8}}>{yearDisplay}</div>
                        <div style={{fontSize:11,color:isCurrent?"#C9A84C":"#718096",marginBottom:4}}>{startDate} - {endDate}</div>
                        {isCurrent && (
                          <div style={{fontSize:10,color:"#C9A84C",fontWeight:700,textTransform:"uppercase",marginTop:8}}>Current</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{fontSize:14,color:"#DC2626",padding:16,background:"#FEE2E2",borderRadius:8}}>
                No quarters found. Please contact an administrator to create quarters.
              </div>
            )}

            <div style={{display:"flex",gap:12,alignItems:"center",marginTop:20}}>
              <div style={{height:1,flex:1,background:"#E2E8F0"}}></div>
              <span style={{fontSize:12,color:"#94A3B8",fontWeight:600}}>OR</span>
              <div style={{height:1,flex:1,background:"#E2E8F0"}}></div>
            </div>

            <button onClick={handleUploadClick} style={{background:"#1B2A4A",color:"white",padding:"14px 40px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,display:"inline-flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(27,42,74,0.3)",border:"none"}}>
              ⬆ Upload Excel File
            </button>
            <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:12,padding:"20px 32px",maxWidth:460,textAlign:"left",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#1B2A4A",marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Required columns in the Tasks sheet</div>
              {[["A","Task Name *","required"],["B","Owner *","auto-creates owner"],["C","Category","optional"],["D","Priority","Critical / High / Medium / Low"],["E","Due Date","YYYY-MM-DD"],["F","Status *","Not Started / In Progress / Completed"],["G","Performance","On Track / At Risk / Off Track"],["H","Notes","optional"]].map(([col,label,hint])=>(
                <div key={col} style={{display:"flex",gap:10,marginBottom:7,alignItems:"flex-start",fontSize:12}}>
                  <span style={{background:"#1B2A4A",color:"#C9A84C",borderRadius:4,padding:"2px 8px",fontWeight:700,minWidth:22,textAlign:"center",flexShrink:0}}>{col}</span>
                  <span style={{color:"#1B2A4A",fontWeight:600}}>{label}</span>
                  <span style={{color:"#94A3B8",fontSize:11,marginLeft:4}}>{hint}</span>
                </div>
              ))}
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{display:"flex",flexDirection:"column",gap:isMobile ? 16 : 20}}>
            {/* Show Team Overview when no tasks */}
            {view==="dashboard" && !selectedOwner && (
              <div style={{display:"flex",flexDirection:isMobile ? "column" : "row",gap:isMobile ? 16 : 20,alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:0,width:isMobile ? "100%" : "auto"}}>
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                      <h2 style={{margin:0,fontSize:isMobile ? 13 : 15,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>Team Overview</h2>
                    </div>
                    {users.length > 0 ? (
                      <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "repeat(2,1fr)",gap:isMobile ? 10 : 12}}>
                        {[...users].sort((a,b)=>{
                          const deptA = a.department || "—";
                          const deptB = b.department || "—";
                          return deptA.localeCompare(deptB);
                        }).map((o,i) => {
                          const st = getStats(o.id);
                          return (
                            <div key={o.id} style={{border:"1px solid #E2E8F0",borderRadius:10,padding:isMobile ? 12 : 16,background:"white",cursor:"pointer"}}
                              onClick={()=>navTo("owner",o.id)}>
                              <div style={{display:"flex",alignItems:"center",gap:isMobile ? 10 : 12,marginBottom:10}}>
                                <div style={{width:isMobile ? 36 : 42,height:isMobile ? 36 : 42,borderRadius:10,background:AVATAR_COLORS[i%AVATAR_COLORS.length],color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:isMobile ? 12 : 14}}>{o.avatar}</div>
                                <div>
                                  <div style={{fontWeight:700,fontSize:isMobile ? 12 : 13}}>{o.name}</div>
                                  <div style={{fontSize:isMobile ? 10 : 11,color:"#718096"}}>{o.department || "—"}</div>
                                  <div style={{fontSize:isMobile ? 10 : 11,color:"#A0AEC0"}}>{st.total} tasks</div>
                                </div>
                              </div>
                              <ProgressBar done={st.completed} total={st.total} />
                              <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                                <span 
                                  onClick={(e)=>{e.stopPropagation();navTo("owner",o.id,"Completed");}}
                                  style={{fontSize:11,background:"#D4EDDA",color:"#155724",padding:"2px 8px",borderRadius:10,fontWeight:700,cursor:"pointer"}}
                                  onMouseEnter={(e)=>e.target.style.opacity="0.8"}
                                  onMouseLeave={(e)=>e.target.style.opacity="1"}
                                >✓ {st.completed}</span>
                                <span 
                                  onClick={(e)=>{e.stopPropagation();navTo("owner",o.id,"In Progress");}}
                                  style={{fontSize:11,background:"#D6EAF8",color:"#1B4F72",padding:"2px 8px",borderRadius:10,fontWeight:700,cursor:"pointer"}}
                                  onMouseEnter={(e)=>e.target.style.opacity="0.8"}
                                  onMouseLeave={(e)=>e.target.style.opacity="1"}
                                >↻ {st.inProgress}</span>
                                <span 
                                  onClick={(e)=>{e.stopPropagation();navTo("owner",o.id,"Not Started");}}
                                  style={{fontSize:11,background:"#FEF3C7",color:"#7D4E00",padding:"2px 8px",borderRadius:10,fontWeight:700,cursor:"pointer"}}
                                  onMouseEnter={(e)=>e.target.style.opacity="0.8"}
                                  onMouseLeave={(e)=>e.target.style.opacity="1"}
                                >○ {st.notStarted}</span>
                                {st.overdue>0 && (
                                  <span 
                                    onClick={(e)=>{
                                      e.stopPropagation();
                                      navTo("owner",o.id,"All");
                                      setTimeout(()=>setFilterDue("Overdue"),0);
                                    }}
                                    style={{fontSize:11,background:"#FEE2E2",color:"#DC2626",padding:"2px 8px",borderRadius:10,fontWeight:700,cursor:"pointer"}}
                                    onMouseEnter={(e)=>e.target.style.opacity="0.8"}
                                    onMouseLeave={(e)=>e.target.style.opacity="1"}
                                  >⚠ {st.overdue} overdue</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{padding:20,textAlign:"center",color:"#718096",fontSize:14}}>No team members found</div>
                    )}
                  </div>
                </div>
                <div style={{width:isMobile ? "100%" : 260,flexShrink:0,display:"flex",flexDirection:"column",gap:isMobile ? 10 : 12}}>
                  <div style={{background:"#1B2A4A",borderRadius:12,padding:isMobile ? "18px 16px" : "22px 20px"}}>
                    <div style={{fontSize:isMobile ? 9 : 10,fontWeight:700,color:"#C9A84C",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Overview</div>
                    <div style={{fontSize:isMobile ? 36 : 44,fontWeight:900,color:"white",lineHeight:1}}>{global.total}</div>
                    <div style={{fontSize:isMobile ? 10 : 11,color:"#94A3B8",marginTop:4,marginBottom:16}}>Total Tasks</div>
                    <div style={{height:1,background:"rgba(255,255,255,0.1)",marginBottom:12}} />
                    {[["Completed",global.completed,"#4ADE80"],["In Progress",global.inProgress,"#60A5FA"],["Not Started",global.notStarted,"#FCD34D"]].map(([l,v,c])=>(
                      <div key={l}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,color:"#94A3B8"}}>{l}</span>
                          <span style={{fontSize:12,fontWeight:800,color:c}}>{v}</span>
                        </div>
                        <div style={{height:6,background:"rgba(255,255,255,0.1)",borderRadius:3,marginBottom:12,overflow:"hidden"}}>
                          <div style={{width:(global.total?v/global.total*100:0)+"%",height:"100%",background:c,borderRadius:3}} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#FEE2E2",borderRadius:12,padding:isMobile ? 16 : 20,border:"1px solid #FECACA"}}>
                    <div style={{fontSize:isMobile ? 10 : 11,fontWeight:800,color:"#991B1B",textTransform:"uppercase",marginBottom:4}}>⚠ Overdue</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#DC2626"}}>{global.overdue}</div>
                    <div style={{fontSize:isMobile ? 10 : 11,color:"#B91C1C"}}>tasks past due date</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tasks Table - Always show even when empty (except dashboard with no tasks) */}
            {!(view==="dashboard" && !selectedOwner && filteredTasks.length === 0) && (
            <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                <h2 style={{margin:0,fontSize:isMobile ? 13 : 15,fontWeight:800,color:"#1B2A4A"}}>Tasks</h2>
                <button onClick={()=>setShowAdd(true)} style={{background:"#C9A84C",color:"#1B2A4A",border:"none",padding:isMobile ? "6px 12px" : "7px 16px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:isMobile ? 12 : 13}}>+ Add Task</button>
              </div>
              {showAdd && (
                <div style={{background:"#F7FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:16,marginBottom:16}}>
                  <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
                    <input placeholder="Task name *" value={newTask.name} onChange={e=>setNewTask(p=>({...p,name:e.target.value}))} style={{padding:"7px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                    <select value={newTask.priority} onChange={e=>setNewTask(p=>({...p,priority:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white"}}>
                      {Object.keys(PRIORITY_CFG).map(p=><option key={p}>{p}</option>)}
                    </select>
                    <input type="date" required value={newTask.due_date} onChange={e=>setNewTask(p=>({...p,due_date:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                    <select value={newTask.status} onChange={e=>setNewTask(p=>({...p,status:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white"}}>
                      {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <select required value={newTask.category} onChange={e=>setNewTask(p=>({...p,category:e.target.value}))} style={{width:"100%",padding:"7px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white",marginBottom:10}}>
                    <option value="">Category *</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={newTask.linked_department||""} onChange={e=>setNewTask(p=>({...p,linked_department:e.target.value}))}
                    style={{width:"100%",padding:"7px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white",marginBottom:10}}>
                    <option value="">Linked Department (optional)</option>
                    {Array.from(new Set((users||[]).map(u=>u.department).filter(Boolean))).sort().map(d=>(
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input placeholder="Notes (optional)" value={newTask.notes} onChange={e=>setNewTask(p=>({...p,notes:e.target.value}))} style={{width:"100%",padding:"7px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,marginBottom:10}} />
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <input 
                      type="checkbox" 
                      id="okr-task"
                      checked={newTask.is_okr === true || newTask.is_okr === 1}
                      onChange={e=>{
                        console.log('OKR checkbox changed:', e.target.checked);
                        setNewTask(p=>({...p,is_okr:e.target.checked}));
                      }}
                      style={{width:16,height:16,cursor:"pointer"}}
                    />
                    <label htmlFor="okr-task" style={{fontSize:12,fontWeight:600,color:"#1B2A4A",cursor:"pointer"}}>OKR Task</label>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={addTask} style={{background:"#1B2A4A",color:"white",border:"none",padding:"7px 18px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>Save</button>
                    <button onClick={()=>setShowAdd(false)} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:"7px 18px",borderRadius:6,cursor:"pointer",fontSize:12}}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"#F7FAFC"}}>
                      {["Task","Category","Linked Department","Priority","Due","OKR","Status","Performance","Notes",""].map((h,i)=>(
                        <th key={i} style={{
                          padding:"9px 10px",
                          textAlign:"left",
                          fontWeight:700,
                          color:"#4A5568",
                          fontSize:11,
                          textTransform:"uppercase",
                          borderBottom:"2px solid #E2E8F0",
                          ...(h === "Due" ? {minWidth:"180px",width:"180px"} : {})
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{padding:"40px 20px",textAlign:"center",color:"#94A3B8",fontSize:13}}>
                          No tasks yet. Click "+ Add Task" above to create your first task.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((t,i)=>(
                        <Fragment key={t.id}>
                          <tr style={{background:isOverdue(t)?"#FFF5F5":i%2===0?"#FAFBFC":"white",borderBottom:"1px solid #EDF2F7"}}>
                            <td style={{padding:"9px 10px",fontWeight:600}}>{t.name}</td>
                            <td style={{padding:"9px 10px",color:"#718096",fontSize:11}}>{t.category||"—"}</td>
                            <td style={{padding:"9px 10px",color:"#718096",fontSize:11}}>{t.linked_department||"—"}</td>
                            <td style={{padding:"9px 10px"}}><PriorityBadge priority={t.priority} /></td>
                            <td style={{padding:"9px 10px",fontSize:11,minWidth:"180px",width:"180px"}}>
                              {t.due_date ? <span style={{color:isOverdue(t)?"#DC2626":"#718096",fontWeight:isOverdue(t)?700:400}}>{formatDate(t.due_date)}{isOverdue(t)&&` (+${daysOverdue(t)}d)`}</span> : "—"}
                            </td>
                            <td style={{padding:"9px 10px",textAlign:"center"}}>
                              {(t.is_okr === 1 || t.is_okr === true) ? (
                                <span style={{color:"#166534",fontSize:16,fontWeight:700}}>✓</span>
                              ) : (
                                <span style={{color:"#CBD5E0",fontSize:14}}>—</span>
                              )}
                            </td>
                            <td style={{padding:"9px 10px"}}>
                              <select value={t.status} onChange={e=>updateTask(t.id,"status",e.target.value)} style={{border:"1px solid #E2E8F0",borderRadius:6,padding:"3px 6px",fontSize:11,background:"white"}}>
                                {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                              </select>
                            </td>
                            <td style={{padding:"9px 10px"}}>
                              <select value={t.performance||""} onChange={e=>updateTask(t.id,"performance",e.target.value)} style={{border:"1px solid #E2E8F0",borderRadius:6,padding:"3px 6px",fontSize:11,background:t.performance==="red"?"#FEE2E2":t.performance==="yellow"?"#FEF3C7":t.performance==="green"?"#DCFCE7":"white"}}>
                                <option value="">—</option>
                                <option value="green">🟢</option>
                                <option value="yellow">🟡</option>
                                <option value="red">🔴</option>
                              </select>
                            </td>
                            <td style={{padding:"9px 10px",fontSize:11}}>{t.notes||"—"}</td>
                            <td style={{padding:"9px 6px",textAlign:"center"}}>
                              <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                                <button onClick={()=>{
                                  setActiveCommentTask(activeCommentTask===t.id?null:t.id);
                                  if (activeCommentTask!==t.id) loadComments(t.id);
                                }} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:(comments[t.id]||[]).length>0?"#2563EB":"#CBD5E0"}}>
                                  💬{(comments[t.id]||[]).length>0&&<sup style={{background:"#2563EB",color:"white",borderRadius:"50%",padding:"0 3px",fontSize:8}}>{(comments[t.id]||[]).length}</sup>}
                                </button>
                                <button onClick={()=>setEditTask({...t})} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E0",fontSize:14}}>✏️</button>
                                <button onClick={()=>deleteTask(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E0",fontSize:14}}>🗑</button>
                              </div>
                            </td>
                          </tr>
                          {activeCommentTask===t.id && (
                            <tr style={{background:"#F8FAFF"}}>
                              <td colSpan={8} style={{padding:"12px 16px",borderBottom:"1px solid #E2E8F0"}}>
                                <div style={{fontSize:11,fontWeight:700,color:"#1B2A4A",marginBottom:8}}>💬 Comments</div>
                                {(comments[t.id]||[]).map((c,ci)=>(
                                  <div key={ci} style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                                    <div style={{fontSize:11,color:"#1B2A4A"}}>{c.text}</div>
                                    <div style={{fontSize:10,color:"#A0AEC0",marginTop:3}}>🕐 {new Date(c.created_at).toLocaleString()}</div>
                                  </div>
                                ))}
                                <div style={{display:"flex",gap:8,marginTop:8}}>
                                  <input value={commentInput[t.id]||""} onChange={e=>setCommentInput(p=>({...p,[t.id]:e.target.value}))}
                                    onKeyDown={e=>e.key==="Enter"&&addComment(t.id)} placeholder="Add a comment... (Enter to save)"
                                    style={{flex:1,padding:"6px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                                  <button onClick={()=>addComment(t.id)} style={{background:"#1B2A4A",color:"white",border:"none",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>Post</button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        ) : (
          <>
            {/* QUARTER SELECTOR - Show on dashboard, performance, all tasks, and overdue */}
            {!selectedOwner && (view==="dashboard" || view==="performance" || view==="all" || view==="overdue") && (
              <div style={{background:"white",borderRadius:12,padding:isMobile ? 12 : 16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:isMobile ? 12 : 16}}>
                <div style={{fontSize:isMobile ? 10 : 11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",marginBottom:8}}>Quarter</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  <button 
                    onClick={()=>setSelectedQuarter({id: 'all', name: 'All Quarters'})}
                    style={{
                      background:selectedQuarter && selectedQuarter.id === 'all' ? "#1B2A4A" : "white",
                      color:selectedQuarter && selectedQuarter.id === 'all' ? "#C9A84C" : "#1B2A4A",
                      border:"1px solid " + (selectedQuarter && selectedQuarter.id === 'all' ? "#1B2A4A" : "#E2E8F0"),
                      borderRadius:6,
                      padding:isMobile ? "6px 12px" : "8px 14px",
                      cursor:"pointer",
                      fontSize:isMobile ? 11 : 12,
                      fontWeight:600,
                      transition:"all 0.2s",
                      whiteSpace:"nowrap"
                    }}
                    onMouseEnter={e=>{
                      if(!selectedQuarter || selectedQuarter.id !== 'all') {
                        e.target.style.borderColor="#1B2A4A";
                        e.target.style.background="#F7FAFC";
                      }
                    }}
                    onMouseLeave={e=>{
                      if(!selectedQuarter || selectedQuarter.id !== 'all') {
                        e.target.style.borderColor="#E2E8F0";
                        e.target.style.background="white";
                      }
                    }}
                  >
                    All Quarters
                  </button>
                  {quarters.filter(q => q.is_active).map(q=>{
                    const isSelected = selectedQuarter && (selectedQuarter.id === q.id || (typeof selectedQuarter.id === 'number' && selectedQuarter.id === q.id));
                    const yearDisplay = getQuarterYearDisplay(q);
                    return (
                      <button 
                        key={q.id}
                        onClick={()=>setSelectedQuarter(q)}
                        style={{
                          background:isSelected ? "#1B2A4A" : "white",
                          color:isSelected ? "#C9A84C" : "#1B2A4A",
                          border:"1px solid " + (isSelected ? "#1B2A4A" : "#E2E8F0"),
                          borderRadius:6,
                          padding:isMobile ? "6px 12px" : "8px 14px",
                          cursor:"pointer",
                          fontSize:isMobile ? 11 : 12,
                          fontWeight:600,
                          transition:"all 0.2s",
                          whiteSpace:"nowrap"
                        }}
                        onMouseEnter={e=>{
                          if(!isSelected) {
                            e.target.style.borderColor="#1B2A4A";
                            e.target.style.background="#F7FAFC";
                          }
                        }}
                        onMouseLeave={e=>{
                          if(!isSelected) {
                            e.target.style.borderColor="#E2E8F0";
                            e.target.style.background="white";
                          }
                        }}
                      >
                        Q{q.quarter} {yearDisplay}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* DASHBOARD */}
            {view==="dashboard" && !selectedOwner && (
              <div style={{display:"flex",flexDirection:isMobile ? "column" : "row",gap:isMobile ? 16 : 20,alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:0,width:isMobile ? "100%" : "auto"}}>
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:isMobile ? 12 : 16}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                      <h2 style={{margin:0,fontSize:isMobile ? 13 : 15,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>Team Overview</h2>
                      <select value={filterOKR} onChange={e=>setFilterOKR(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white"}}>
                        <option value="All">All Tasks</option>
                        <option value="Yes">OKR Tasks</option>
                        <option value="No">Non-OKR Tasks</option>
                      </select>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "repeat(2,1fr)",gap:isMobile ? 10 : 12}}>
                      {[...users].sort((a,b)=>{
                        const deptA = a.department || "—";
                        const deptB = b.department || "—";
                        return deptA.localeCompare(deptB);
                      }).map((o,i) => {
                        const st = getStats(o.id);
                        return (
                          <div key={o.id} style={{border:"1px solid #E2E8F0",borderRadius:10,padding:isMobile ? 12 : 16,background:"white",cursor:"pointer"}}
                            onClick={()=>navTo("owner",o.id)}>
                            <div style={{display:"flex",alignItems:"center",gap:isMobile ? 10 : 12,marginBottom:10}}>
                              <div style={{width:isMobile ? 36 : 42,height:isMobile ? 36 : 42,borderRadius:10,background:AVATAR_COLORS[i%AVATAR_COLORS.length],color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:isMobile ? 12 : 14}}>{o.avatar}</div>
                              <div>
                                <div style={{fontWeight:700,fontSize:isMobile ? 12 : 13}}>{o.name}</div>
                                <div style={{fontSize:isMobile ? 10 : 11,color:"#718096"}}>{o.department || "—"}</div>
                                <div style={{fontSize:isMobile ? 10 : 11,color:"#A0AEC0"}}>{st.total} tasks</div>
                              </div>
                            </div>
                            <ProgressBar done={st.completed} total={st.total} />
                            <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                              <span 
                                onClick={(e)=>{e.stopPropagation();navTo("owner",o.id,"Completed");}}
                                style={{fontSize:11,background:"#D4EDDA",color:"#155724",padding:"2px 8px",borderRadius:10,fontWeight:700,cursor:"pointer"}}
                                onMouseEnter={(e)=>e.target.style.opacity="0.8"}
                                onMouseLeave={(e)=>e.target.style.opacity="1"}
                              >✓ {st.completed}</span>
                              <span 
                                onClick={(e)=>{e.stopPropagation();navTo("owner",o.id,"In Progress");}}
                                style={{fontSize:11,background:"#D6EAF8",color:"#1B4F72",padding:"2px 8px",borderRadius:10,fontWeight:700,cursor:"pointer"}}
                                onMouseEnter={(e)=>e.target.style.opacity="0.8"}
                                onMouseLeave={(e)=>e.target.style.opacity="1"}
                              >↻ {st.inProgress}</span>
                              <span 
                                onClick={(e)=>{e.stopPropagation();navTo("owner",o.id,"Not Started");}}
                                style={{fontSize:11,background:"#FEF3C7",color:"#7D4E00",padding:"2px 8px",borderRadius:10,fontWeight:700,cursor:"pointer"}}
                                onMouseEnter={(e)=>e.target.style.opacity="0.8"}
                                onMouseLeave={(e)=>e.target.style.opacity="1"}
                              >○ {st.notStarted}</span>
                              {st.overdue>0 && (
                                <span 
                                  onClick={(e)=>{
                                    e.stopPropagation();
                                    navTo("owner",o.id,"All");
                                    setTimeout(()=>setFilterDue("Overdue"),0);
                                  }}
                                  style={{fontSize:11,background:"#FEE2E2",color:"#DC2626",padding:"2px 8px",borderRadius:10,fontWeight:700,cursor:"pointer"}}
                                  onMouseEnter={(e)=>e.target.style.opacity="0.8"}
                                  onMouseLeave={(e)=>e.target.style.opacity="1"}
                                >⚠ {st.overdue} overdue</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div style={{width:isMobile ? "100%" : 260,flexShrink:0,display:"flex",flexDirection:"column",gap:isMobile ? 10 : 12}}>
                  <div style={{background:"#1B2A4A",borderRadius:12,padding:isMobile ? "18px 16px" : "22px 20px"}}>
                    <div style={{fontSize:isMobile ? 9 : 10,fontWeight:700,color:"#C9A84C",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Overview</div>
                    <div style={{fontSize:isMobile ? 36 : 44,fontWeight:900,color:"white",lineHeight:1}}>{global.total}</div>
                    <div style={{fontSize:isMobile ? 10 : 11,color:"#94A3B8",marginTop:4,marginBottom:16}}>Total Tasks</div>
                    <div style={{height:1,background:"rgba(255,255,255,0.1)",marginBottom:12}} />
                    {[["Completed",global.completed,"#4ADE80"],["In Progress",global.inProgress,"#60A5FA"],["Not Started",global.notStarted,"#FCD34D"]].map(([l,v,c])=>(
                      <div key={l}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,color:"#94A3B8"}}>{l}</span>
                          <span style={{fontSize:12,fontWeight:800,color:c}}>{v}</span>
                        </div>
                        <div style={{height:6,background:"rgba(255,255,255,0.1)",borderRadius:3,marginBottom:12,overflow:"hidden"}}>
                          <div style={{width:(global.total?v/global.total*100:0)+"%",height:"100%",background:c,borderRadius:3}} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#FEE2E2",borderRadius:12,padding:isMobile ? 16 : 20,border:"1px solid #FECACA"}}>
                    <div style={{fontSize:isMobile ? 10 : 11,fontWeight:800,color:"#991B1B",textTransform:"uppercase",marginBottom:4}}>⚠ Overdue</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#DC2626"}}>{global.overdue}</div>
                    <div style={{fontSize:isMobile ? 10 : 11,color:"#B91C1C"}}>tasks past due date</div>
                  </div>

                  {/* BY PRIORITY */}
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <div style={{fontSize:isMobile ? 10 : 11,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                      📊 BY PRIORITY
                    </div>
                    {[["Critical",priorityStats.Critical,"#9333EA"],["High",priorityStats.High,"#E74C3C"],["Medium",priorityStats.Medium,"#F59E0B"],["Low",priorityStats.Low,"#10B981"]].map(([label,count,color])=>(
                      <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#4A5568"}}>{label}</span>
                        <span style={{fontSize:14,fontWeight:800,color}}>{count}</span>
                      </div>
                    ))}
                  </div>

                  {/* DEADLINES */}
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <div style={{fontSize:isMobile ? 10 : 11,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                      📅 DEADLINES
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile ? 8 : 10,marginBottom:12}}>
                      <div style={{background:"#EBF8FF",borderRadius:8,padding:isMobile ? 10 : 12,textAlign:"center",border:"1px solid #BEE3F8"}}>
                        <div style={{fontSize:isMobile ? 18 : 20,fontWeight:900,color:"#1E40AF"}}>{deadlineStats.thisWeek}</div>
                        <div style={{fontSize:isMobile ? 9 : 10,color:"#1E40AF",fontWeight:600}}>This Week</div>
                      </div>
                      <div style={{background:"#D1FAE5",borderRadius:8,padding:isMobile ? 10 : 12,textAlign:"center",border:"1px solid #A7F3D0"}}>
                        <div style={{fontSize:isMobile ? 18 : 20,fontWeight:900,color:"#065F46"}}>{deadlineStats.thisMonth}</div>
                        <div style={{fontSize:isMobile ? 9 : 10,color:"#065F46",fontWeight:600}}>This Month</div>
                      </div>
                    </div>
                    {deadlineStats.thisWeek === 0 && (
                      <div style={{fontSize:11,color:"#10B981",fontWeight:600,textAlign:"center",padding:"8px",background:"#D1FAE5",borderRadius:6}}>
                        Nothing due this week 🎉
                      </div>
                    )}
                  </div>

                  {/* BY CATEGORY */}
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <div style={{fontSize:isMobile ? 10 : 11,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                      📊 BY CATEGORY
                    </div>
                    {CATEGORIES.filter(cat => categoryStats[cat]?.total > 0).map(cat => {
                      const stat = categoryStats[cat];
                      const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                      const color = categoryColors[cat] || "#718096";
                      return (
                        <div key={cat} style={{marginBottom:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:11,fontWeight:600,color:"#4A5568"}}>{cat}</span>
                            <span style={{fontSize:11,fontWeight:700,color:"#718096"}}>{stat.completed}/{stat.total}</span>
                          </div>
                          <div style={{height:6,background:"#E2E8F0",borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:pct+"%",height:"100%",background:color,borderRadius:3}} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* OVERDUE PAGE */}
            {view==="overdue" && !selectedOwner && (
              <div style={{display:"flex",flexDirection:isMobile ? "column" : "row",gap:isMobile ? 16 : 20,alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:0,width:isMobile ? "100%" : "auto"}}>
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:8}}>
                      <div>
                        <h2 style={{margin:0,fontSize:isMobile ? 13 : 15,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          ▲ OVERDUE TASKS ({overdueTasks.length})
                        </h2>
                        <div style={{fontSize:isMobile ? 10 : 11,color:"#718096",marginTop:4}}>Sorted by most days overdue</div>
                      </div>
                      <div style={{display:"flex",gap:isMobile ? 6 : 8,flexWrap:"wrap",width:isMobile ? "100%" : "auto"}}>
                        <input placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,width:isMobile ? "100%" : 160,flex:isMobile ? "1 1 100%" : "none"}} />
                        <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                          <option value="All">All Categories</option>
                          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                          <option>All</option>
                          {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                        </select>
                        <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                          <option>All</option>
                          {Object.keys(PRIORITY_CFG).map(p=><option key={p}>{p}</option>)}
                        </select>
                        <select value={filterOKR} onChange={e=>setFilterOKR(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                          <option value="All">All Tasks</option>
                          <option value="Yes">OKR Tasks</option>
                          <option value="No">Non-OKR Tasks</option>
                        </select>
                      </div>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr style={{background:"#F7FAFC"}}>
                            {["#","TASK","OWNER","CATEGORY","PRIORITY","DUE","OKR Task","DAYS LATE","STATUS",""].map((h,i)=>(
                              <th key={i} style={{
                                padding:"9px 10px",
                                textAlign:"left",
                                fontWeight:700,
                                color:"#4A5568",
                                fontSize:11,
                                textTransform:"uppercase",
                                borderBottom:"2px solid #E2E8F0",
                                ...(h === "DUE" ? {minWidth:"140px",width:"140px"} : h === "OKR Task" ? {textAlign:"center",minWidth:"80px"} : {})
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {overdueTasks.map((t,i)=> {
                            const owner = users.find(u => u.id === t.owner_id);
                            return (
                              <tr key={t.id} style={{background:i%2===0?"#FAFBFC":"white",borderBottom:"1px solid #EDF2F7"}}>
                                <td style={{padding:"9px 10px",color:"#718096"}}>{i+1}</td>
                                <td style={{padding:"9px 10px",fontWeight:600}}>{t.name}</td>
                                <td style={{padding:"9px 10px",color:"#1B2A4A",fontWeight:600}}>{owner?.name||"—"}</td>
                                <td style={{padding:"9px 10px",color:"#718096",fontSize:11}}>{t.category||"—"}</td>
                                <td style={{padding:"9px 10px"}}><PriorityBadge priority={t.priority} /></td>
                                <td style={{padding:"9px 10px",color:"#DC2626",fontWeight:700,minWidth:"140px",width:"140px"}}>{formatDate(t.due_date) || "—"}</td>
                                <td style={{padding:"9px 10px",textAlign:"center"}}>
                                  {(t.is_okr === 1 || t.is_okr === true) ? (
                                    <span style={{color:"#166534",fontSize:16,fontWeight:700}}>✓</span>
                                  ) : (
                                    <span style={{color:"#CBD5E0",fontSize:14}}>—</span>
                                  )}
                                </td>
                                <td style={{padding:"9px 10px",color:"#DC2626",fontWeight:700}}>+{daysOverdue(t)}d</td>
                                <td style={{padding:"9px 10px"}}>
                                  <select value={t.status} onChange={async(e)=>{
                                    try {
                                      await apiCall(`/tasks/${t.id}`, {
                                        method: 'PUT',
                                        body: JSON.stringify({ status: e.target.value })
                                      });
                                      loadTasks();
                                    } catch(err) {
                                      await showAlert('Error updating task: ' + err.message, 'Error');
                                    }
                                  }} style={{padding:"4px 8px",border:"1px solid #CBD5E0",borderRadius:4,fontSize:11,background:"white"}}>
                                    {STATUS_KEYS.map(s=><option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                                <td style={{padding:"9px 6px",textAlign:"center"}}>
                                  <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                                    <button onClick={()=>setEditTask({...t})} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E0",fontSize:14}}>✏️</button>
                                    <button onClick={async()=>{
                                      const confirmed = await showConfirm('Delete this task?', 'Confirm Delete');
                                      if (confirmed) {
                                        try {
                                          await apiCall(`/tasks/${t.id}`, { method: 'DELETE' });
                                          loadTasks();
                                          await showAlert('Task deleted successfully!', 'Success');
                                        } catch(err) {
                                          await showAlert('Error deleting task: ' + err.message, 'Error');
                                        }
                                      }
                                    }} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E0",fontSize:14}}>🗑</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {!isMobile && (
                <div style={{width:280,flexShrink:0}}>
                  <div style={{background:"white",borderRadius:12,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <h2 style={{margin:"0 0 20px",fontSize:13,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>Il OVERDUE BY OWNER</h2>
                    {overdueByOwner.length > 0 ? (
                      <div style={{display:"flex",flexDirection:"column",gap:12}}>
                        {overdueByOwner.map((item,i)=> {
                          const maxCount = Math.max(...overdueByOwner.map(o=>o.count));
                          const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          return (
                            <div key={item.owner.id}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                                <span style={{fontSize:12,fontWeight:600,color:"#1B2A4A"}}>{item.owner.name}</span>
                                <span style={{fontSize:12,fontWeight:700,color:"#DC2626"}}>{item.count}</span>
                              </div>
                              <div style={{height:8,background:"#E2E8F0",borderRadius:4,overflow:"hidden"}}>
                                <div style={{width:width+"%",height:"100%",background:"#DC2626",borderRadius:4}} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{fontSize:12,color:"#718096",textAlign:"center",padding:20}}>No overdue tasks</div>
                    )}
                  </div>
                </div>
                )}
                {isMobile && overdueByOwner.length > 0 && (
                  <div style={{width:"100%",marginTop:16}}>
                    <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                      <h2 style={{margin:"0 0 16px",fontSize:12,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>OVERDUE BY OWNER</h2>
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {overdueByOwner.map((item, idx) => {
                          const maxCount = Math.max(...overdueByOwner.map(o=>o.count));
                          const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          return (
                            <div key={item.owner.id} style={{borderBottom:idx < overdueByOwner.length - 1 ? "1px solid #EDF2F7" : "none",paddingBottom:idx < overdueByOwner.length - 1 ? 10 : 0}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                                <span style={{fontSize:11,fontWeight:600,color:"#1B2A4A"}}>{item.owner.name}</span>
                                <span style={{fontSize:11,fontWeight:700,color:"#DC2626"}}>{item.count}</span>
                              </div>
                              <div style={{height:6,background:"#E2E8F0",borderRadius:3,overflow:"hidden"}}>
                                <div style={{width:width+"%",height:"100%",background:"#DC2626",borderRadius:3}} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PERFORMANCE PAGE */}
            {view==="performance" && !selectedOwner && (
              <div style={{display:"flex",flexDirection:"column",gap:isMobile ? 16 : 20}}>
                {/* Filters */}
                <div style={{background:"white",borderRadius:12,padding:isMobile ? 12 : 16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                  <div style={{display:"flex",gap:isMobile ? 6 : 8,flexWrap:"wrap",width:isMobile ? "100%" : "auto"}}>
                    <input placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,width:isMobile ? "100%" : 160,flex:isMobile ? "1 1 100%" : "none"}} />
                    <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option value="All">All Categories</option>
                      {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option>All</option>
                      {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                    </select>
                    <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option>All</option>
                      {Object.keys(PRIORITY_CFG).map(p=><option key={p}>{p}</option>)}
                    </select>
                    <select value={filterOKR} onChange={e=>setFilterOKR(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option value="All">All Tasks</option>
                      <option value="Yes">OKR Tasks</option>
                      <option value="No">Non-OKR Tasks</option>
                    </select>
                  </div>
                </div>
                {/* Summary Statistics */}
                <div style={{display:"grid",gridTemplateColumns:isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)",gap:isMobile ? 10 : 12}}>
                  <div style={{background:"#EBF8FF",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#1E40AF",textTransform:"uppercase",marginBottom:8}}>RATED TASKS</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#1E40AF",lineHeight:1}}>{performanceStats.rated}</div>
                    <div style={{fontSize:isMobile ? 10 : 12,color:"#64748B",marginTop:4}}>of {performanceStats.total} total</div>
                  </div>
                  <div style={{background:"#DCFCE7",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#065F46",textTransform:"uppercase",marginBottom:8}}>ON TRACK</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#10B981",lineHeight:1}}>{performanceStats.onTrack}</div>
                    <div style={{fontSize:isMobile ? 10 : 12,color:"#64748B",marginTop:4}}>{performanceStats.onTrackPct}% of rated</div>
                  </div>
                  <div style={{background:"#FEF3C7",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#92400E",textTransform:"uppercase",marginBottom:8}}>AT RISK</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#F59E0B",lineHeight:1}}>{performanceStats.atRisk}</div>
                    <div style={{fontSize:isMobile ? 10 : 12,color:"#64748B",marginTop:4}}>{performanceStats.atRiskPct}% of rated</div>
                  </div>
                  <div style={{background:"#FEE2E2",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#991B1B",textTransform:"uppercase",marginBottom:8}}>OFF TRACK</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#EF4444",lineHeight:1}}>{performanceStats.offTrack}</div>
                    <div style={{fontSize:isMobile ? 10 : 12,color:"#64748B",marginTop:4}}>{performanceStats.offTrackPct}% of rated</div>
                  </div>
                  <div style={{background:"#F3F4F6",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center",gridColumn:isMobile ? "1 / -1" : "auto"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#4B5563",textTransform:"uppercase",marginBottom:8}}>UNRATED</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#6B7280",lineHeight:1}}>{performanceStats.unrated}</div>
                    <div style={{fontSize:isMobile ? 10 : 12,color:"#64748B",marginTop:4}}>of {performanceStats.total} total</div>
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr",gap:isMobile ? 16 : 20}}>
                  {/* Performance by Owner */}
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <h2 style={{margin:"0 0 16px",fontSize:isMobile ? 12 : 13,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>PERFORMANCE BY OWNER</h2>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead>
                          <tr style={{background:"#F7FAFC",borderBottom:"2px solid #E2E8F0"}}>
                            {["OWNER","DEPT","","","","RATED","PERFORMANCE BAR"].map((h,i)=>(
                              <th key={i} style={{padding:"8px 6px",textAlign:i===6?"left":i===0?"left":"center",fontWeight:700,color:"#4A5568",fontSize:10,textTransform:"uppercase"}}>
                                {i===2?"🟢":i===3?"🟡":i===4?"🔴":h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {performanceByOwner.map((p,i)=> {
                            const pct = p.rated > 0 ? (p.onTrack / p.rated) * 100 : 0;
                            const atRiskPct = p.rated > 0 ? (p.atRisk / p.rated) * 100 : 0;
                            const offTrackPct = p.rated > 0 ? (p.offTrack / p.rated) * 100 : 0;
                            return (
                              <tr key={p.owner.id} style={{borderBottom:"1px solid #EDF2F7"}}>
                                <td style={{padding:"8px 6px",fontWeight:600,fontSize:11}}>{p.owner.name}</td>
                                <td style={{padding:"8px 6px",color:"#718096",fontSize:11,textAlign:"center"}}>{p.owner.department||"—"}</td>
                                <td style={{padding:"8px 6px",textAlign:"center",fontSize:11}}>{p.onTrack||"—"}</td>
                                <td style={{padding:"8px 6px",textAlign:"center",fontSize:11}}>{p.atRisk||"—"}</td>
                                <td style={{padding:"8px 6px",textAlign:"center",fontSize:11}}>{p.offTrack||"—"}</td>
                                <td style={{padding:"8px 6px",textAlign:"center",fontSize:11,color:"#718096"}}>{p.rated}/{p.total}</td>
                                <td style={{padding:"8px 6px"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,width:120}}>
                                    <div style={{flex:1,height:8,background:"#E2E8F0",borderRadius:4,overflow:"hidden",display:"flex"}}>
                                      <div style={{width:pct+"%",height:"100%",background:"#10B981"}} />
                                      <div style={{width:atRiskPct+"%",height:"100%",background:"#F59E0B"}} />
                                      <div style={{width:offTrackPct+"%",height:"100%",background:"#EF4444"}} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* By Category */}
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <h2 style={{margin:"0 0 16px",fontSize:isMobile ? 12 : 13,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>BY CATEGORY</h2>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      {Object.entries(performanceByCategory).map(([cat,stats])=> {
                        const pct = stats.rated > 0 ? (stats.onTrack / stats.rated) * 100 : 0;
                        const atRiskPct = stats.rated > 0 ? (stats.atRisk / stats.rated) * 100 : 0;
                        const offTrackPct = stats.rated > 0 ? (stats.offTrack / stats.rated) * 100 : 0;
                        return (
                          <div key={cat} style={{borderBottom:"1px solid #EDF2F7",paddingBottom:12}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                              <div style={{fontSize:11,fontWeight:600,color:"#1B2A4A"}}>{cat}</div>
                              <div style={{fontSize:11,color:"#718096"}}>{stats.rated}/{stats.total}</div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              {stats.onTrack > 0 && <span style={{fontSize:10,color:"#10B981"}}>🟢 {stats.onTrack}</span>}
                              {stats.atRisk > 0 && <span style={{fontSize:10,color:"#F59E0B"}}>🟡 {stats.atRisk}</span>}
                              {stats.offTrack > 0 && <span style={{fontSize:10,color:"#EF4444"}}>🔴 {stats.offTrack}</span>}
                            </div>
                            <div style={{height:6,background:"#E2E8F0",borderRadius:3,overflow:"hidden",display:"flex"}}>
                              <div style={{width:pct+"%",height:"100%",background:"#10B981"}} />
                              <div style={{width:atRiskPct+"%",height:"100%",background:"#F59E0B"}} />
                              <div style={{width:offTrackPct+"%",height:"100%",background:"#EF4444"}} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr",gap:isMobile ? 16 : 20}}>
                  {/* Off Track Tasks */}
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <h2 style={{margin:"0 0 16px",fontSize:isMobile ? 12 : 13,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>OFF TRACK TASKS ({offTrackTasks.length})</h2>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead>
                          <tr style={{background:"#F7FAFC",borderBottom:"2px solid #E2E8F0"}}>
                            {["#","TASK","OWNER","DUE"].map((h,i)=>(
                              <th key={i} style={{padding:"8px 6px",textAlign:i===0?"center":"left",fontWeight:700,color:"#4A5568",fontSize:10,textTransform:"uppercase"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {offTrackTasks.slice(0,10).map((t,i)=> {
                            const owner = users.find(u => u.id === t.owner_id);
                            return (
                              <tr key={t.id} style={{borderBottom:"1px solid #EDF2F7"}}>
                                <td style={{padding:"8px 6px",textAlign:"center",fontSize:11,color:"#718096"}}>{i+1}</td>
                                <td style={{padding:"8px 6px",fontSize:11,fontWeight:600}}>{t.name}</td>
                                <td style={{padding:"8px 6px",fontSize:11,color:"#718096"}}>{owner?.name||"—"}</td>
                                <td style={{padding:"8px 6px",fontSize:11,color:isOverdue(t)?"#DC2626":"#718096"}}>{formatDate(t.due_date) || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* At Risk Tasks */}
                  <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                    <h2 style={{margin:"0 0 16px",fontSize:isMobile ? 12 : 13,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>AT RISK TASKS ({atRiskTasks.length})</h2>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead>
                          <tr style={{background:"#F7FAFC",borderBottom:"2px solid #E2E8F0"}}>
                            {["#","TASK","OWNER","DUE"].map((h,i)=>(
                              <th key={i} style={{padding:"8px 6px",textAlign:i===0?"center":"left",fontWeight:700,color:"#4A5568",fontSize:10,textTransform:"uppercase"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {atRiskTasks.slice(0,10).map((t,i)=> {
                            const owner = users.find(u => u.id === t.owner_id);
                            return (
                              <tr key={t.id} style={{borderBottom:"1px solid #EDF2F7"}}>
                                <td style={{padding:"8px 6px",textAlign:"center",fontSize:11,color:"#718096"}}>{i+1}</td>
                                <td style={{padding:"8px 6px",fontSize:11,fontWeight:600}}>{t.name}</td>
                                <td style={{padding:"8px 6px",fontSize:11,color:"#718096"}}>{owner?.name||"—"}</td>
                                <td style={{padding:"8px 6px",fontSize:11,color:isOverdue(t)?"#DC2626":"#718096"}}>{formatDate(t.due_date) || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ALL TASKS */}
            {view==="all" && !selectedOwner && (
              <div>
                {/* Status Cards */}
                <div style={{display:"grid",gridTemplateColumns:isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:isMobile ? 10 : 12,marginBottom:isMobile ? 12 : 16}}>
                  <div style={{background:"#D4EDDA",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center",border:"1px solid #C3E6CB"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#155724",textTransform:"uppercase",marginBottom:8}}>Completed</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#155724",lineHeight:1}}>{filteredTasks.filter(t=>t.status==="Completed").length}</div>
                  </div>
                  <div style={{background:"#D6EAF8",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center",border:"1px solid #AED6F1"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#1B4F72",textTransform:"uppercase",marginBottom:8}}>In Progress</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#1B4F72",lineHeight:1}}>{filteredTasks.filter(t=>t.status==="In Progress").length}</div>
                  </div>
                  <div style={{background:"#FEF3C7",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center",border:"1px solid #FDE68A"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#7D4E00",textTransform:"uppercase",marginBottom:8}}>Not Started</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#7D4E00",lineHeight:1}}>{filteredTasks.filter(t=>t.status==="Not Started").length}</div>
                  </div>
                  <div style={{background:"#FEE2E2",borderRadius:12,padding:isMobile ? 14 : 20,textAlign:"center",border:"1px solid #FECACA"}}>
                    <div style={{fontSize:isMobile ? 9 : 11,fontWeight:700,color:"#991B1B",textTransform:"uppercase",marginBottom:8}}>Overdue</div>
                    <div style={{fontSize:isMobile ? 28 : 36,fontWeight:900,color:"#DC2626",lineHeight:1}}>{filteredTasks.filter(t=>isOverdue(t)).length}</div>
                  </div>
                </div>

                <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                    <h2 style={{margin:0,fontSize:isMobile ? 13 : 15,fontWeight:800,color:"#1B2A4A",textTransform:"uppercase"}}>All Tasks ({filteredTasks.length})</h2>
                    <div style={{display:"flex",gap:isMobile ? 6 : 8,flexWrap:"wrap",width:isMobile ? "100%" : "auto"}}>
                      <input placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,width:isMobile ? "100%" : 160,flex:isMobile ? "1 1 100%" : "none"}} />
                      <select value={filterOwner} onChange={e=>setFilterOwner(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                        <option value="All">All Owners</option>
                        {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                        <option value="All">All Categories</option>
                        {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                        <option>All</option>
                        {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                      </select>
                      <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                        <option>All</option>
                        {Object.keys(PRIORITY_CFG).map(p=><option key={p}>{p}</option>)}
                      </select>
                      <select value={filterOKR} onChange={e=>setFilterOKR(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                        <option value="All">All Tasks</option>
                        <option value="Yes">OKR Tasks</option>
                        <option value="No">Non-OKR Tasks</option>
                      </select>
                    </div>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"#F7FAFC"}}>
                          {["Task","Owner","Category","Priority","Due","OKR Task","Status","Performance",""].map((h,i)=>(
                            <th key={i} style={{
                              padding:"9px 10px",
                              textAlign:"left",
                              fontWeight:700,
                              color:"#4A5568",
                              fontSize:11,
                              textTransform:"uppercase",
                              borderBottom:"2px solid #E2E8F0",
                              ...(h === "Due" ? {minWidth:"140px",width:"140px"} : h === "OKR Task" ? {textAlign:"center",minWidth:"80px"} : {})
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((t,i)=>{
                          const o=users.find(o=>o.id===t.owner_id);
                          return (
                            <tr key={t.id} style={{background:isOverdue(t)?"#FFF5F5":i%2===0?"#FAFBFC":"white",borderBottom:"1px solid #EDF2F7"}}>
                              <td style={{padding:"8px 10px",fontWeight:600}}>{t.name}</td>
                              <td style={{padding:"8px 10px"}}><span onClick={()=>navTo("owner",o?.id)} style={{cursor:"pointer",color:"#1B2A4A",fontWeight:600,fontSize:11}}>{o?.name||"—"}</span></td>
                              <td style={{padding:"8px 10px",color:"#718096",fontSize:11}}>{t.category||"—"}</td>
                              <td style={{padding:"8px 10px"}}><PriorityBadge priority={t.priority} /></td>
                              <td style={{padding:"8px 10px",fontSize:11,minWidth:"140px",width:"140px"}}>
                                {t.due_date ? <span style={{color:isOverdue(t)?"#DC2626":"#718096",fontWeight:isOverdue(t)?700:400}}>{formatDate(t.due_date)}{isOverdue(t)&&` (+${daysOverdue(t)}d)`}</span> : "—"}
                              </td>
                              <td style={{padding:"8px 10px",textAlign:"center"}}>
                                {(t.is_okr === 1 || t.is_okr === true) ? (
                                  <span style={{color:"#166534",fontSize:16,fontWeight:700}}>✓</span>
                                ) : (
                                  <span style={{color:"#CBD5E0",fontSize:14}}>—</span>
                                )}
                              </td>
                              <td style={{padding:"8px 10px"}}>
                                <select value={t.status} onChange={e=>updateTask(t.id,"status",e.target.value)} style={{border:"1px solid #E2E8F0",borderRadius:6,padding:"3px 6px",fontSize:11,background:"white",cursor:"pointer"}}>
                                  {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                                </select>
                              </td>
                              <td style={{padding:"8px 10px"}}>
                                <select value={t.performance||""} onChange={e=>updateTask(t.id,"performance",e.target.value)} style={{border:"1px solid #E2E8F0",borderRadius:6,padding:"3px 6px",fontSize:11,background:t.performance==="red"?"#FEE2E2":t.performance==="yellow"?"#FEF3C7":t.performance==="green"?"#DCFCE7":"white",cursor:"pointer"}}>
                                  <option value="">—</option>
                                  <option value="green">🟢</option>
                                  <option value="yellow">🟡</option>
                                  <option value="red">🔴</option>
                                </select>
                              </td>
                              <td style={{padding:"8px 6px",textAlign:"center"}}>
                                <button onClick={()=>setEditTask({...t})} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E0",fontSize:14}}>✏️</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* OWNER DETAIL */}
            {view==="owner" && selectedOwner && owner && (
              <div>
                <div style={{display:"flex",alignItems:"center",gap:isMobile ? 10 : 12,marginBottom:isMobile ? 16 : 20}}>
                  <div style={{width:isMobile ? 40 : 46,height:isMobile ? 40 : 46,borderRadius:10,background:AVATAR_COLORS[users.findIndex(o=>o.id===owner.id)%AVATAR_COLORS.length],color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:isMobile ? 14 : 16}}>{owner.avatar}</div>
                  <div>
                    <h1 style={{margin:0,fontSize:isMobile ? 18 : 20,fontWeight:800,color:"#1B2A4A"}}>{owner.name}</h1>
                    <span style={{fontSize:isMobile ? 11 : 12,color:"#718096"}}>{owner.department||"—"}</span>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)",gap:isMobile ? 10 : 12,marginBottom:isMobile ? 16 : 20}}>
                  {[{l:"Total",v:ownerStats.total,c:"#1B2A4A",bg:"#EBF8FF"},{l:"Completed",v:ownerStats.completed,c:"#155724",bg:"#D4EDDA"},{l:"In Progress",v:ownerStats.inProgress,c:"#1B4F72",bg:"#D6EAF8"},{l:"Not Started",v:ownerStats.notStarted,c:"#7D4E00",bg:"#FEF3C7"},{l:"Overdue",v:ownerStats.overdue,c:"#991B1B",bg:"#FEE2E2"}].map(k=>(
                    <div key={k.l} style={{background:k.bg,borderRadius:10,padding:isMobile ? "12px 14px" : "14px 18px"}}>
                      <div style={{fontSize:isMobile ? 10 : 11,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</div>
                      <div style={{fontSize:isMobile ? 24 : 30,fontWeight:900,color:k.c}}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"white",borderRadius:12,padding:isMobile ? 16 : 24,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                    <h2 style={{margin:0,fontSize:isMobile ? 13 : 15,fontWeight:800,color:"#1B2A4A"}}>Tasks</h2>
                    <button onClick={()=>setShowAdd(true)} style={{background:"#C9A84C",color:"#1B2A4A",border:"none",padding:isMobile ? "6px 12px" : "7px 16px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:isMobile ? 12 : 13}}>+ Add Task</button>
                  </div>
                  <div style={{display:"flex",gap:isMobile ? 6 : 8,flexWrap:"wrap",width:"100%",marginBottom:16}}>
                    <input placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,width:isMobile ? "100%" : 160,flex:isMobile ? "1 1 100%" : "none"}} />
                    <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option value="All">All Categories</option>
                      {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option>All</option>
                      {Object.keys(PRIORITY_CFG).map(p=><option key={p}>{p}</option>)}
                    </select>
                    <select value={filterDue} onChange={e=>setFilterDue(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option value="All">All Due Dates</option>
                      <option value="Overdue">Overdue</option>
                      <option value="This Week">This Week</option>
                      <option value="This Month">This Month</option>
                    </select>
                    <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option>All</option>
                      {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                    </select>
                    <select value={filterPerformance} onChange={e=>setFilterPerformance(e.target.value)} style={{padding:isMobile ? "6px 10px" : "5px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:isMobile ? 11 : 12,background:"white",flex:isMobile ? "1 1 calc(50% - 3px)" : "none"}}>
                      <option value="All">All Performance</option>
                      <option value="Rated">Rated</option>
                      <option value="green">🟢 On Track</option>
                      <option value="yellow">🟡 At Risk</option>
                      <option value="red">🔴 Off Track</option>
                    </select>
                  </div>
                  {showAdd && (
                    <div style={{background:"#F7FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:16,marginBottom:16}}>
                      <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
                        <input placeholder="Task name *" value={newTask.name} onChange={e=>setNewTask(p=>({...p,name:e.target.value}))} style={{padding:"7px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                        <select value={newTask.priority} onChange={e=>setNewTask(p=>({...p,priority:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white"}}>
                          {Object.keys(PRIORITY_CFG).map(p=><option key={p}>{p}</option>)}
                        </select>
                        <input type="date" required value={newTask.due_date} onChange={e=>setNewTask(p=>({...p,due_date:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                        <select value={newTask.status} onChange={e=>setNewTask(p=>({...p,status:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white"}}>
                          {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <select required value={newTask.category} onChange={e=>setNewTask(p=>({...p,category:e.target.value}))} style={{width:"100%",padding:"7px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,background:"white",marginBottom:10}}>
                        <option value="">Category *</option>
                          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                      <input placeholder="Notes (optional)" value={newTask.notes} onChange={e=>setNewTask(p=>({...p,notes:e.target.value}))} style={{width:"100%",padding:"7px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12,marginBottom:10}} />
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <input 
                          type="checkbox" 
                          id="okr-task-2"
                          checked={newTask.is_okr === true || newTask.is_okr === 1}
                          onChange={e=>{
                            console.log('OKR checkbox changed:', e.target.checked);
                            setNewTask(p=>({...p,is_okr:e.target.checked}));
                          }}
                          style={{width:16,height:16,cursor:"pointer"}}
                        />
                        <label htmlFor="okr-task-2" style={{fontSize:12,fontWeight:600,color:"#1B2A4A",cursor:"pointer"}}>OKR Task</label>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={addTask} style={{background:"#1B2A4A",color:"white",border:"none",padding:"7px 18px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>Save</button>
                        <button onClick={()=>setShowAdd(false)} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:"7px 18px",borderRadius:6,cursor:"pointer",fontSize:12}}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"#F7FAFC"}}>
                          {["Task","Category","Priority","Due","OKR Task","Status","Performance","Notes",""].map((h,i)=>(
                            <th key={i} style={{
                              padding:"9px 10px",
                              textAlign:"left",
                              fontWeight:700,
                              color:"#4A5568",
                              fontSize:11,
                              textTransform:"uppercase",
                              borderBottom:"2px solid #E2E8F0",
                              ...(h === "OKR Task" ? {textAlign:"center",minWidth:"80px"} : {})
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((t,i)=>(
                          <Fragment key={t.id}>
                            <tr style={{background:isOverdue(t)?"#FFF5F5":i%2===0?"#FAFBFC":"white",borderBottom:"1px solid #EDF2F7"}}>
                              <td style={{padding:"9px 10px",fontWeight:600}}>{t.name}</td>
                              <td style={{padding:"9px 10px",color:"#718096",fontSize:11}}>{t.category||"—"}</td>
                              <td style={{padding:"9px 10px"}}><PriorityBadge priority={t.priority} /></td>
                              <td style={{padding:"9px 10px",fontSize:11}}>
                                {t.due_date ? <span style={{color:isOverdue(t)?"#DC2626":"#718096",fontWeight:isOverdue(t)?700:400}}>{formatDate(t.due_date)}{isOverdue(t)&&` (+${daysOverdue(t)}d)`}</span> : "—"}
                              </td>
                              <td style={{padding:"9px 10px",textAlign:"center"}}>
                                {(t.is_okr === 1 || t.is_okr === true) ? (
                                  <span style={{color:"#166534",fontSize:16,fontWeight:700}}>✓</span>
                                ) : (
                                  <span style={{color:"#CBD5E0",fontSize:14}}>—</span>
                                )}
                              </td>
                              <td style={{padding:"9px 10px"}}>
                                <select value={t.status} onChange={e=>updateTask(t.id,"status",e.target.value)} style={{border:"1px solid #E2E8F0",borderRadius:6,padding:"3px 6px",fontSize:11,background:"white"}}>
                                  {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                                </select>
                              </td>
                              <td style={{padding:"9px 10px"}}>
                                <select value={t.performance||""} onChange={e=>updateTask(t.id,"performance",e.target.value)} style={{border:"1px solid #E2E8F0",borderRadius:6,padding:"3px 6px",fontSize:11,background:t.performance==="red"?"#FEE2E2":t.performance==="yellow"?"#FEF3C7":t.performance==="green"?"#DCFCE7":"white"}}>
                                  <option value="">—</option>
                                  <option value="green">🟢</option>
                                  <option value="yellow">🟡</option>
                                  <option value="red">🔴</option>
                                </select>
                              </td>
                              <td style={{padding:"9px 10px",fontSize:11}}>{t.notes||"—"}</td>
                              <td style={{padding:"9px 6px",textAlign:"center"}}>
                                <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                                  <button onClick={()=>{
                                    setActiveCommentTask(activeCommentTask===t.id?null:t.id);
                                    if (activeCommentTask!==t.id) loadComments(t.id);
                                  }} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:(comments[t.id]||[]).length>0?"#2563EB":"#CBD5E0"}}>
                                    💬{(comments[t.id]||[]).length>0&&<sup style={{background:"#2563EB",color:"white",borderRadius:"50%",padding:"0 3px",fontSize:8}}>{(comments[t.id]||[]).length}</sup>}
                                  </button>
                                  <button onClick={()=>setEditTask({...t})} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E0",fontSize:14}}>✏️</button>
                                  <button onClick={()=>deleteTask(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E0",fontSize:14}}>🗑</button>
                                </div>
                              </td>
                            </tr>
                            {activeCommentTask===t.id && (
                              <tr style={{background:"#F8FAFF"}}>
                                <td colSpan={9} style={{padding:"12px 16px",borderBottom:"1px solid #E2E8F0"}}>
                                  <div style={{fontSize:11,fontWeight:700,color:"#1B2A4A",marginBottom:8}}>💬 Comments</div>
                                  {(comments[t.id]||[]).map((c,ci)=>(
                                    <div key={ci} style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                                      <div style={{fontSize:11,color:"#1B2A4A"}}>{c.text}</div>
                                      <div style={{fontSize:10,color:"#A0AEC0",marginTop:3}}>🕐 {new Date(c.created_at).toLocaleString()}</div>
                                    </div>
                                  ))}
                                  <div style={{display:"flex",gap:8,marginTop:8}}>
                                    <input value={commentInput[t.id]||""} onChange={e=>setCommentInput(p=>({...p,[t.id]:e.target.value}))}
                                      onKeyDown={e=>e.key==="Enter"&&addComment(t.id)} placeholder="Add a comment... (Enter to save)"
                                      style={{flex:1,padding:"6px 12px",border:"1px solid #CBD5E0",borderRadius:6,fontSize:12}} />
                                    <button onClick={()=>addComment(t.id)} style={{background:"#1B2A4A",color:"white",border:"none",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>Post</button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        </div>

      {/* CUSTOM ALERT/CONFIRM MODAL */}
      {alertModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"white",borderRadius:16,padding:32,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#1B2A4A"}}>{alertModal.title}</h2>
              {alertModal.type === 'alert' && (
                <button onClick={()=>{setAlertModal(null);alertModal.onConfirm();}} style={{background:"#F1F5F9",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#64748B"}}>✕</button>
              )}
            </div>
            <div style={{fontSize:isMobile ? 13 : 14,color:"#4A5568",lineHeight:1.6,marginBottom:isMobile ? 20 : 24}}>
              {alertModal.message}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
              {alertModal.type === 'confirm' && (
                <button onClick={()=>{setAlertModal(null);alertModal.onCancel();}} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:isMobile ? "8px 16px" : "10px 20px",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:isMobile ? 12 : 13}}>Cancel</button>
              )}
              <button onClick={()=>{setAlertModal(null);alertModal.onConfirm();}} style={{background:alertModal.type==="confirm"?"#DC2626":"#1B2A4A",color:"white",border:"none",padding:isMobile ? "8px 16px" : "10px 20px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:isMobile ? 12 : 13}}>
                {alertModal.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT QUARTER MODAL */}
      {editingQuarter && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"white",borderRadius:16,padding:32,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:800,color:"#1B2A4A"}}>Edit Quarter</h2>
              <button onClick={()=>setEditingQuarter(null)} style={{background:"#F1F5F9",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#64748B"}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Fiscal Year & Quarter</label>
                <div style={{padding:"9px 12px",background:"#F7FAFC",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,color:"#718096"}}>
                  {getQuarterYearDisplay(editingQuarter)} - Q{editingQuarter.quarter}
                </div>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Start Date *</label>
                <input type="date" value={editingQuarter.start_date?.split('T')[0]||""} onChange={e=>setEditingQuarter(p=>({...p,start_date:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>End Date *</label>
                <input type="date" value={editingQuarter.end_date?.split('T')[0]||""} onChange={e=>setEditingQuarter(p=>({...p,end_date:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Status</label>
                <select value={editingQuarter.is_active?"true":"false"} onChange={e=>setEditingQuarter(p=>({...p,is_active:e.target.value==="true"}))}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:"white"}}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div style={{display:"flex",gap:10,marginTop:10}}>
                <button onClick={updateQuarter} style={{flex:1,background:"#1B2A4A",color:"white",border:"none",padding:"10px 20px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>Save Changes</button>
                <button onClick={()=>setEditingQuarter(null)} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:"10px 20px",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"white",borderRadius:16,padding:32,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:800,color:"#1B2A4A"}}>Edit User</h2>
              <button onClick={()=>setEditingUser(null)} style={{background:"#F1F5F9",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#64748B"}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Name *</label>
                <input value={editingUser.name} onChange={e=>setEditingUser(p=>({...p,name:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Email *</label>
                <input type="email" value={editingUser.email} onChange={e=>setEditingUser(p=>({...p,email:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
              </div>
              {user?.role==="admin" && (
                <>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Username</label>
                    <input value={editingUser.username||""} onChange={e=>setEditingUser(p=>({...p,username:e.target.value}))}
                      placeholder="Leave empty to remove username"
                      style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>New Password</label>
                    <input type="password" value={editingUser.newPassword||""} onChange={e=>setEditingUser(p=>({...p,newPassword:e.target.value}))}
                      placeholder="Leave empty to keep current password"
                      style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
                    <div style={{fontSize:10,color:"#718096",marginTop:4}}>Only fill this if you want to change the password</div>
                  </div>
                </>
              )}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Department</label>
                <select value={editingUser.department||""} onChange={e=>setEditingUser(p=>({...p,department:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:"white"}}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(dept=><option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
              {user?.role==="admin" && (
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Role</label>
                  <select value={editingUser.role} onChange={e=>setEditingUser(p=>({...p,role:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:"white"}}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              <div style={{display:"flex",gap:10,marginTop:10}}>
                <button onClick={updateUser} style={{flex:1,background:"#1B2A4A",color:"white",border:"none",padding:"10px 20px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>Save Changes</button>
                <button onClick={()=>setEditingUser(null)} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:"10px 20px",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePassword && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowChangePassword(false)}>
          <div style={{background:"white",borderRadius:16,padding:32,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:800,color:"#1B2A4A"}}>Change Password</h2>
              <button onClick={()=>{setShowChangePassword(false);setChangePasswordForm({currentPassword:"",newPassword:"",confirmPassword:""});}} style={{background:"#F1F5F9",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#64748B"}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Current Password *</label>
                <input type="password" value={changePasswordForm.currentPassword} onChange={e=>setChangePasswordForm(p=>({...p,currentPassword:e.target.value}))}
                  placeholder="Enter current password"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>New Password *</label>
                <input type="password" value={changePasswordForm.newPassword} onChange={e=>setChangePasswordForm(p=>({...p,newPassword:e.target.value}))}
                  placeholder="Enter new password (min 6 characters)"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Confirm New Password *</label>
                <input type="password" value={changePasswordForm.confirmPassword} onChange={e=>setChangePasswordForm(p=>({...p,confirmPassword:e.target.value}))}
                  placeholder="Confirm new password"
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
              </div>
              <div style={{display:"flex",gap:10,marginTop:10}}>
                <button onClick={changePassword} style={{flex:1,background:"#1B2A4A",color:"white",border:"none",padding:"10px 20px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>Change Password</button>
                <button onClick={()=>{setShowChangePassword(false);setChangePasswordForm({currentPassword:"",newPassword:"",confirmPassword:""});}} style={{background:"#E2E8F0",color:"#4A5568",border:"none",padding:"10px 20px",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editTask && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"white",borderRadius:16,padding:32,width:"100%",maxWidth:560,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:800,color:"#1B2A4A"}}>Edit Task</h2>
              <button onClick={()=>setEditTask(null)} style={{background:"#F1F5F9",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#64748B"}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Task Name *</label>
                <input value={editTask.name} onChange={e=>setEditTask(p=>({...p,name:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr",gap:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Category</label>
                  <select value={editTask.category||""} onChange={e=>setEditTask(p=>({...p,category:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:"white"}}>
                    <option value="">— None —</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Priority</label>
                  <select value={editTask.priority} onChange={e=>setEditTask(p=>({...p,priority:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:"white"}}>
                    {Object.keys(PRIORITY_CFG).map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Due Date</label>
                  <input type="date" value={editTask.due_date||""} onChange={e=>setEditTask(p=>({...p,due_date:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13}} />
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Status</label>
                  <select value={editTask.status} onChange={e=>setEditTask(p=>({...p,status:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:"white"}}>
                    {STATUS_KEYS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Owner</label>
                  <select value={editTask.owner_id} onChange={e=>setEditTask(p=>({...p,owner_id:parseInt(e.target.value)}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:"white"}}>
                    {users.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Performance</label>
                  <select value={editTask.performance||""} onChange={e=>setEditTask(p=>({...p,performance:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:editTask.performance==="red"?"#FEE2E2":editTask.performance==="yellow"?"#FEF3C7":editTask.performance==="green"?"#DCFCE7":"white"}}>
                    <option value="">— Not Rated —</option>
                    <option value="green">🟢 On Track</option>
                    <option value="yellow">🟡 At Risk</option>
                    <option value="red">🔴 Off Track</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Linked Department</label>
                  <select value={editTask.linked_department||""} onChange={e=>setEditTask(p=>({...p,linked_department:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,background:"white"}}>
                    <option value="">— None —</option>
                    {Array.from(new Set((users||[]).map(u=>u.department).filter(Boolean))).sort().map(d=>(
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#4A5568",textTransform:"uppercase",display:"block",marginBottom:5}}>Notes</label>
                <textarea value={editTask.notes||""} onChange={e=>setEditTask(p=>({...p,notes:e.target.value}))} rows={3}
                  style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E0",borderRadius:8,fontSize:13,resize:"vertical"}} />
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input 
                  type="checkbox" 
                  id="edit-okr-task"
                  checked={editTask.is_okr === true || editTask.is_okr === 1 || editTask.is_okr === '1'}
                  onChange={e=>{
                    console.log('Edit OKR checkbox changed:', e.target.checked);
                    setEditTask(p=>({...p,is_okr:e.target.checked}));
                  }}
                  style={{width:16,height:16,cursor:"pointer"}}
                />
                <label htmlFor="edit-okr-task" style={{fontSize:12,fontWeight:600,color:"#1B2A4A",cursor:"pointer"}}>OKR Task</label>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:24,justifyContent:"flex-end"}}>
              <button onClick={()=>setEditTask(null)} style={{background:"#F1F5F9",color:"#4A5568",border:"none",padding:"9px 22px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Cancel</button>
              <button onClick={saveEdit} style={{background:"#1B2A4A",color:"white",border:"none",padding:"9px 22px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
