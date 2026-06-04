// State Management
const APP_STATE = {
    theme: 'light', // 'light' or 'dark'
    activeTab: 'home', // 'home', 'calendar', 'analytics', 'settings'
    tasks: [],
    habits: []
};

// Default Sample Data (used if LocalStorage is empty)
const DEFAULT_TASKS = [
    {
        id: 'task-1',
        title: 'Project Q4 Strategy Document',
        category: 'OFFICE',
        priority: true,
        startDate: '2023-10-24',
        startTime: '10:00',
        endDate: '2023-10-24',
        endTime: '12:00',
        completed: false,
        notes: 'Coordinate with the infrastructure team to finalize the deployment roadmap for the upcoming fiscal quarter. Ensure all security compliance checks are cleared.',
        attachments: [
            { name: 'Syllabus_v2.pdf', size: '1.2 MB' },
            { name: 'Google Docs Link', url: 'https://docs.google.com' }
        ]
    },
    {
        id: 'task-2',
        title: 'Advanced Algorithms Assignment',
        category: 'CAMPUS',
        priority: false,
        startDate: '2023-10-27',
        startTime: '14:00',
        endDate: '2023-10-27',
        endTime: '16:30',
        completed: false,
        notes: 'Implement the Floyd-Warshall and Bellman-Ford algorithm visualizer. Prepare the performance analysis chart.',
        attachments: [
            { name: 'Resources_Zip_v1.zip', size: '45.8 MB' }
        ]
    },
    {
        id: 'task-3',
        title: 'Weekly Sync Notes',
        category: 'OFFICE',
        priority: false,
        startDate: '2023-10-23',
        startTime: '09:00',
        endDate: '2023-10-23',
        endTime: '10:00',
        completed: true,
        notes: 'Summarized team items for sprint 4. Archiving notes to server.',
        attachments: []
    }
];

const DEFAULT_HABITS = [
    {
        id: 'habit-1',
        name: 'Coding Routine',
        streak: 24,
        days: { MON: true, TUE: true, WED: true, THU: false, FRI: true, SAT: true, SUN: false }
    },
    {
        id: 'habit-2',
        name: 'Exercise & Cardio',
        streak: 12,
        days: { MON: true, TUE: false, WED: true, THU: false, FRI: true, SAT: false, SUN: false }
    },
    {
        id: 'habit-3',
        name: 'Technical Reading',
        streak: 8,
        days: { MON: true, TUE: true, WED: false, THU: false, FRI: false, SAT: true, SUN: false }
    }
];

// Load State from LocalStorage
function loadState() {
    const savedTheme = localStorage.getItem('tasktracker_theme');
    if (savedTheme) {
        APP_STATE.theme = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        APP_STATE.theme = 'dark';
    }

    const savedTasks = localStorage.getItem('tasktracker_tasks');
    if (savedTasks) {
        APP_STATE.tasks = JSON.parse(savedTasks);
    } else {
        APP_STATE.tasks = [...DEFAULT_TASKS];
    }

    const savedHabits = localStorage.getItem('tasktracker_habits');
    if (savedHabits) {
        APP_STATE.habits = JSON.parse(savedHabits);
    } else {
        APP_STATE.habits = [...DEFAULT_HABITS];
    }

    // Apply Theme
    applyTheme();
}

// Save State to LocalStorage
function saveTasks() {
    localStorage.setItem('tasktracker_tasks', JSON.stringify(APP_STATE.tasks));
}

function saveHabits() {
    localStorage.setItem('tasktracker_habits', JSON.stringify(APP_STATE.habits));
}

function applyTheme() {
    if (APP_STATE.theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tasktracker_theme', APP_STATE.theme);
    updateThemeToggleIcons();
}

function toggleTheme() {
    APP_STATE.theme = APP_STATE.theme === 'light' ? 'dark' : 'light';
    applyTheme();
}

// Render Header Theme Button & Notifications
function updateThemeToggleIcons() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        const iconSpan = themeBtn.querySelector('.material-symbols-outlined');
        if (iconSpan) {
            iconSpan.textContent = APP_STATE.theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    }
    // Note: We removed the class name overwrite here to prevent resetting structural layout styles (width/left margins)
}

// Sidebar collapse logic
function initSidebarCollapse() {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('app-sidebar');
    const header = document.getElementById('app-header');
    const main = document.getElementById('app-main');
    
    if (!toggleBtn || !sidebar || !header || !main) return;

    // Load collapsed state from local storage
    const isCollapsed = localStorage.getItem('tasktracker_sidebar_collapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('sidebar-collapsed');
        header.classList.add('header-collapsed');
        main.classList.add('main-collapsed');
        toggleBtn.querySelector('.material-symbols-outlined').textContent = 'menu';
    }

    toggleBtn.addEventListener('click', () => {
        const collapsed = sidebar.classList.toggle('sidebar-collapsed');
        header.classList.toggle('header-collapsed', collapsed);
        main.classList.toggle('main-collapsed', collapsed);
        
        toggleBtn.querySelector('.material-symbols-outlined').textContent = collapsed ? 'menu' : 'menu_open';
        localStorage.setItem('tasktracker_sidebar_collapsed', collapsed ? 'true' : 'false');
    });
}

// DOM Query Selectors & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initNavigation();
    initModal();
    initSearch();
    initSidebarCollapse();
    renderAll();
});

// Navigation Setup
function initNavigation() {
    const navLinks = document.querySelectorAll('aside nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.getAttribute('data-tab');
            if (tabName) {
                switchTab(tabName);
            }
        });
    });

    // Logo click goes home
    const logo = document.querySelector('aside h1');
    if (logo) {
        logo.addEventListener('click', () => switchTab('home'));
        logo.style.cursor = 'pointer';
    }
}

function switchTab(tabName) {
    APP_STATE.activeTab = tabName;
    
    // Update active nav styles
    const navLinks = document.querySelectorAll('aside nav a');
    navLinks.forEach(link => {
        const linkTab = link.getAttribute('data-tab');
        const isCollapsed = document.getElementById('app-sidebar').classList.contains('sidebar-collapsed');
        if (linkTab === tabName) {
            link.className = isCollapsed 
                ? "bg-primary text-white border-l-4 border-white px-4 py-3 flex items-center justify-center gap-3 transition-all duration-150 active:bg-primary-container"
                : "bg-primary text-white border-l-4 border-white px-4 py-3 flex items-center gap-3 transition-all duration-150 active:bg-primary-container";
        } else {
            link.className = isCollapsed
                ? "text-slate-400 hover:text-white px-4 py-3 flex items-center justify-center gap-3 transition-colors hover:bg-slate-700 dark:hover:bg-slate-800"
                : "text-slate-400 hover:text-white px-4 py-3 flex items-center gap-3 transition-colors hover:bg-slate-700 dark:hover:bg-slate-800";
        }
    });

    // Toggle View Sections
    const views = ['home-view', 'calendar-view', 'analytics-view', 'settings-view'];
    views.forEach(viewId => {
        const viewEl = document.getElementById(viewId);
        if (viewEl) {
            if (viewId === `${tabName}-view`) {
                viewEl.classList.remove('hidden');
            } else {
                viewEl.classList.add('hidden');
            }
        }
    });

    // Specific renders
    if (tabName === 'calendar') {
        renderCalendar();
    } else if (tabName === 'analytics') {
        renderAnalyticsView();
    } else if (tabName === 'home') {
        renderDashboard();
    }
}

// Modal Form Operations
let activeCategory = 'OFFICE';
let tempAttachments = [];

function initModal() {
    const modal = document.getElementById('taskModal');
    
    // Close button
    const closeBtn = modal.querySelector('button[onclick="toggleModal()"]');
    if (closeBtn) {
        closeBtn.removeAttribute('onclick');
        closeBtn.addEventListener('click', toggleModal);
    }

    const cancelBtn = document.getElementById('modal-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', toggleModal);
    }

    const saveBtn = document.getElementById('modal-submit-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleTaskSubmit);
    }

    // Attach Category Button Triggers
    const catBtns = document.querySelectorAll('.category-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.getAttribute('data-type').toUpperCase();
            catBtns.forEach(b => {
                b.classList.remove('bg-slate-800', 'text-white', 'dark:bg-slate-200', 'dark:text-slate-900');
                b.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-800');
            });
            if (APP_STATE.theme === 'dark') {
                btn.classList.add('bg-slate-200', 'text-slate-900');
            } else {
                btn.classList.add('bg-slate-800', 'text-white');
            }
            btn.classList.remove('hover:bg-slate-100', 'dark:hover:bg-slate-800');
        });
    });

    // Real File Upload Handler
    const fileUploader = document.getElementById('file-uploader');
    if (fileUploader) {
        fileUploader.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Safe limit for localStorage: 1.5MB
            if (file.size > 1.5 * 1024 * 1024) {
                alert(`File "${file.name}" is too large! Maximum allowed size is 1.5MB for browser local storage.`);
                fileUploader.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(evt) {
                tempAttachments.push({
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + " KB",
                    dataUrl: evt.target.result // Base64 content
                });
                renderModalAttachments();
                fileUploader.value = ''; // Reset input
            };
            reader.readAsDataURL(file);
        });
    }

    // Web Link Adder Button Handler
    const addLinkBtn = document.getElementById('add-link-btn');
    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', () => {
            const urlInput = document.getElementById('link-url-input');
            const labelInput = document.getElementById('link-label-input');
            const url = urlInput.value.trim();
            const label = labelInput.value.trim() || "Web Link";

            if (!url) {
                alert("Please enter a valid URL!");
                return;
            }

            // Simple validation prepending http if not there
            let formattedUrl = url;
            if (!/^https?:\/\//i.test(url)) {
                formattedUrl = 'https://' + url;
            }

            tempAttachments.push({
                name: label,
                url: formattedUrl
            });

            renderModalAttachments();
            urlInput.value = '';
            labelInput.value = '';
        });
    }
}

function toggleModal(prefillDate = '', prefillTime = '') {
    const modal = document.getElementById('taskModal');
    const panel = modal.querySelector('.modal-panel');
    
    if (modal.classList.contains('pointer-events-none')) {
        // Reset form inputs
        document.getElementById('task-form-title').value = '';
        
        // Start & End Timestamps Setup
        const defaultDate = prefillDate || new Date().toISOString().split('T')[0];
        document.getElementById('task-form-start-date').value = defaultDate;
        document.getElementById('task-form-start-time').value = prefillTime || '09:00';
        
        document.getElementById('task-form-end-date').value = defaultDate;
        
        // Default end time to 1 hour after start
        let endHr = 10;
        if (prefillTime) {
            const parts = prefillTime.split(':');
            endHr = Math.min(23, parseInt(parts[0]) + 1);
        }
        document.getElementById('task-form-end-time').value = String(endHr).padStart(2, '0') + ':00';

        document.getElementById('task-form-notes').value = '';
        document.getElementById('task-form-priority').checked = false;
        
        // Reset link form text
        const urlInput = document.getElementById('link-url-input');
        const labelInput = document.getElementById('link-label-input');
        if (urlInput) urlInput.value = '';
        if (labelInput) labelInput.value = '';

        tempAttachments = [];
        renderModalAttachments();
        
        // Select category
        const officeBtn = document.querySelector('.category-btn[data-type="office"]');
        if (officeBtn) officeBtn.click();

        modal.classList.remove('pointer-events-none', 'opacity-0');
        panel.classList.remove('translate-x-full');
    } else {
        modal.classList.add('pointer-events-none', 'opacity-0');
        panel.classList.add('translate-x-full');
    }
}

function renderModalAttachments() {
    const list = document.getElementById('modal-attachments-list');
    if (!list) return;
    list.innerHTML = '';
    tempAttachments.forEach((att, idx) => {
        const item = document.createElement('div');
        item.className = "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 flex items-center gap-2";
        
        const typeBadge = att.dataUrl ? 'FILE' : 'LINK';
        const displayLabel = att.dataUrl ? `${att.name.toUpperCase()} (${att.size})` : `${att.name.toUpperCase()} (LINK)`;

        item.innerHTML = `
            <span class="font-label-sm text-[9px] text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 px-1">${typeBadge}</span>
            <span class="font-label-sm text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[200px]">${displayLabel}</span>
            <button class="hover:text-error transition-colors" data-idx="${idx}"><span class="material-symbols-outlined text-xs">close</span></button>
        `;
        item.querySelector('button').addEventListener('click', () => {
            tempAttachments.splice(idx, 1);
            renderModalAttachments();
        });
        list.appendChild(item);
    });
}

function handleTaskSubmit() {
    const title = document.getElementById('task-form-title').value.trim();
    const startDate = document.getElementById('task-form-start-date').value;
    const startTime = document.getElementById('task-form-start-time').value;
    const endDate = document.getElementById('task-form-end-date').value;
    const endTime = document.getElementById('task-form-end-time').value;
    const notes = document.getElementById('task-form-notes').value.trim();
    const priority = document.getElementById('task-form-priority').checked;

    if (!title) {
        alert("Please enter a title for the task!");
        return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
        alert("Please complete the starting and ending times!");
        return;
    }

    // Verify start date/time is before or equal to end date/time
    const startObj = new Date(`${startDate}T${startTime}`);
    const endObj = new Date(`${endDate}T${endTime}`);
    if (startObj > endObj) {
        alert("Warning: Start time occurs after End/Deadline time. Please double check dates!");
        return;
    }

    const newTask = {
        id: 'task-' + Date.now(),
        title,
        category: activeCategory,
        priority,
        startDate,
        startTime,
        endDate,
        endTime,
        completed: false,
        notes: notes || 'No description provided.',
        attachments: [...tempAttachments]
    };

    APP_STATE.tasks.push(newTask);
    saveTasks();
    toggleModal();
    renderAll();
}

// Render Functions
function renderAll() {
    renderDashboard();
    renderCalendar();
    renderAnalyticsView();
}

// 1. Dashboard View
function renderDashboard() {
    renderStreakJourneyWidget();
    renderActiveTasksList();
}

function renderStreakJourneyWidget() {
    const habit = APP_STATE.habits[0] || { days: {} };
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const container = document.getElementById('dashboard-weekly-view');
    if (!container) return;

    container.innerHTML = '';
    days.forEach(day => {
        const completed = habit.days[day];
        const dayDiv = document.createElement('div');
        dayDiv.className = "flex flex-col items-center gap-2 flex-1";
        
        let checkboxContent = '';
        if (completed) {
            checkboxContent = `
                <div class="w-10 h-10 bg-primary dark:bg-sky-blue-dark border border-primary dark:border-sky-blue-dark flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform">
                    <span class="material-symbols-outlined text-sm font-bold">check</span>
                </div>
            `;
        } else {
            checkboxContent = `
                <div class="w-10 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-pointer active:scale-95 transition-transform hover:border-primary dark:hover:border-sky-blue-dark">
                </div>
            `;
        }

        dayDiv.innerHTML = `
            <span class="font-label-sm text-xs text-slate-400 dark:text-slate-500">${day}</span>
            ${checkboxContent}
        `;

        dayDiv.querySelector('.w-10').addEventListener('click', () => {
            habit.days[day] = !habit.days[day];
            recalculateHabitStreak(habit);
            saveHabits();
            renderAll();
        });

        container.appendChild(dayDiv);
    });

    // Update Percentage Score
    let totalDays = 0;
    let completedDays = 0;
    APP_STATE.habits.forEach(h => {
        days.forEach(d => {
            totalDays++;
            if (h.days[d]) completedDays++;
        });
    });

    const percentScore = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
    const scoreVal = document.getElementById('dashboard-completion-percentage');
    if (scoreVal) scoreVal.textContent = `${percentScore}% COMPLETE`;

    const efficiencyVal = document.getElementById('dashboard-efficiency-val');
    if (efficiencyVal) {
        const efficiency = Math.min(100, Math.round(50 + (percentScore / 2)));
        efficiencyVal.innerHTML = `${efficiency}<span class="text-headline-md opacity-50 ml-1">%</span>`;
    }

    const activeDaysVal = document.getElementById('dashboard-active-days');
    if (activeDaysVal) {
        const maxStreak = APP_STATE.habits.length > 0 ? Math.max(...APP_STATE.habits.map(h => h.streak)) : 0;
        activeDaysVal.textContent = maxStreak;
    }
}

function recalculateHabitStreak(habit) {
    let streakCount = 0;
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    days.forEach(d => {
        if (habit.days[d]) streakCount++;
    });
    habit.streak = streakCount * 3 + 2;
}

// Active Tasks search
let taskSearchQuery = '';

function initSearch() {
    const searchInput = document.getElementById('task-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            taskSearchQuery = e.target.value.toLowerCase().trim();
            renderActiveTasksList();
        });
    }
}

function renderActiveTasksList() {
    const list = document.getElementById('dashboard-active-tasks-list');
    if (!list) return;

    list.innerHTML = '';
    
    const filteredTasks = APP_STATE.tasks.filter(t => t.title.toLowerCase().includes(taskSearchQuery));
    
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        const aDate = a.startDate || a.dueDate || '';
        const bDate = b.startDate || b.dueDate || '';
        return aDate.localeCompare(bDate);
    });

    if (filteredTasks.length === 0) {
        list.innerHTML = `
            <div class="p-8 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                No active tasks found matching search criteria.
            </div>
        `;
        return;
    }

    filteredTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-container group border-b border-slate-100 dark:border-slate-800/85 transition-all duration-300 ${task.completed ? 'opacity-65 bg-slate-50/40 dark:bg-slate-900/10' : 'bg-white dark:bg-slate-950'}`;
        
        let priorityBadge = task.priority ? `<span class="px-2 py-0.5 border border-red-500 text-red-500 dark:border-red-400 dark:text-red-400 font-mono text-[9px] font-bold tracking-wider uppercase bg-red-500/5 select-none">PRIORITY</span>` : '';
        let categoryBadge = `<span class="px-2 py-0.5 border border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold tracking-wider uppercase select-none">${task.category}</span>`;
        
        let attachmentsBadge = task.attachments.length > 0 ? `
            <span class="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 select-none">
                <span class="material-symbols-outlined text-[12px]">attachment</span>
                ${task.attachments.length} ${task.attachments.length > 1 ? 'Items' : 'Item'}
            </span>` : '';

        let checkIcon = task.completed ? `
            <div class="w-5 h-5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-950 flex items-center justify-center flex-shrink-0 cursor-pointer border border-slate-800 dark:border-slate-200 transition-colors">
                <span class="material-symbols-outlined text-[12px] font-extrabold">check</span>
            </div>` : `
            <div class="w-5 h-5 border border-slate-400 dark:border-slate-500 flex-shrink-0 group-hover:border-primary dark:group-hover:border-sky-blue-dark transition-colors cursor-pointer bg-white dark:bg-slate-900"></div>`;

        const sDate = task.startDate || task.dueDate || '';
        const sTime = task.startTime || task.dueTime || '';
        const eDate = task.endDate || task.dueDate || '';
        const eTime = task.endTime || task.dueTime || '';
        const rangeText = `${formatDate(sDate)} (${sTime}) to ${formatDate(eDate)} (${eTime})`;

        item.innerHTML = `
            <div class="p-5 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer task-click-info">
                <!-- Left side: Checkbox + Title + Timeframe -->
                <div class="flex items-start gap-4 flex-1 min-w-0">
                    <div class="task-checkbox-wrapper mt-0.5 shrink-0">
                        ${checkIcon}
                    </div>
                    <div class="space-y-1.5 min-w-0">
                        <h3 class="font-headline font-bold text-base text-slate-900 dark:text-white leading-tight ${task.completed ? 'line-through text-slate-400 dark:text-slate-500 font-medium' : ''}">
                            ${task.title}
                        </h3>
                        <div class="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            <span class="flex items-center gap-1 select-none">
                                <span class="material-symbols-outlined text-sm">schedule</span>
                                ${rangeText}
                            </span>
                            ${attachmentsBadge}
                        </div>
                    </div>
                </div>

                <!-- Right side: Badges & Action Buttons -->
                <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        ${categoryBadge}
                        ${priorityBadge}
                    </div>
                    
                    <div class="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                        <button class="task-delete-btn text-slate-400 hover:text-error dark:hover:text-red-400 transition-colors p-1" title="Delete Task">
                            <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                        <span class="material-symbols-outlined text-slate-400 group-hover:text-primary dark:group-hover:text-sky-blue-dark transition-transform duration-200 task-expand-icon">expand_more</span>
                    </div>
                </div>
            </div>
            
            <!-- Expandable Details -->
            <div class="max-height-0 overflow-hidden opacity-0 transition-all duration-300 bg-slate-50/50 dark:bg-slate-900/10 px-6 border-t border-slate-200 dark:border-slate-800 task-expand-panel">
                <div class="py-5 space-y-4">
                    <div class="flex flex-col lg:flex-row gap-6">
                        <!-- Notes -->
                        <div class="flex-1">
                            <span class="block font-mono text-[9px] text-slate-400 uppercase tracking-widest mb-1.5 select-none font-bold">Task Description</span>
                            <p class="font-body text-sm text-slate-600 dark:text-slate-400 border-l-2 border-slate-300 dark:border-slate-700 pl-4 py-1 leading-relaxed">
                                ${task.notes}
                            </p>
                        </div>
                        
                        <!-- Attachments list (if any) -->
                        <div class="lg:w-80 shrink-0">
                            <span class="block font-mono text-[9px] text-slate-400 uppercase tracking-widest mb-1.5 select-none font-bold">Attachments</span>
                            <div class="attachments-grid space-y-2"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Register Handlers
        item.querySelector('.task-checkbox-wrapper').addEventListener('click', (e) => {
            e.stopPropagation();
            task.completed = !task.completed;
            saveTasks();
            renderAll();
        });

        const togglePanel = item.querySelector('.task-expand-panel');
        const toggleIcon = item.querySelector('.task-expand-icon');
        const clickArea = item.querySelector('.task-click-info');
        
        const performToggle = () => {
            if (togglePanel.classList.contains('task-expanded')) {
                togglePanel.classList.remove('task-expanded');
                togglePanel.style.maxHeight = '0';
                togglePanel.style.opacity = '0';
                toggleIcon.style.transform = 'rotate(0deg)';
            } else {
                // Populate attachments
                const attachGrid = togglePanel.querySelector('.attachments-grid');
                attachGrid.innerHTML = '';
                
                if (task.attachments.length === 0) {
                    attachGrid.innerHTML = `<p class="text-xs font-mono text-slate-400 italic">No files or links attached.</p>`;
                } else {
                    task.attachments.forEach(att => {
                        const box = document.createElement('div');
                        box.className = "flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-sky-blue-dark transition-colors";
                        
                        const isUrl = att.url ? true : false;
                        const iconName = isUrl ? 'link' : 'description';
                        const labelName = att.name;
                        
                        let actionHtml = '';
                        if (isUrl) {
                            actionHtml = `
                                <a class="flex items-center gap-3 w-full" href="${att.url}" target="_blank">
                                    <span class="material-symbols-outlined text-slate-500 text-sm">${iconName}</span>
                                    <div class="text-left flex-1 min-w-0">
                                        <p class="font-headline text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${labelName}</p>
                                        <p class="text-[9px] text-slate-400 font-mono truncate">${att.url}</p>
                                    </div>
                                    <span class="ml-auto material-symbols-outlined text-[14px] text-slate-400">open_in_new</span>
                                </a>
                            `;
                        } else {
                            actionHtml = `
                                <a class="flex items-center gap-3 w-full" href="${att.dataUrl || '#'}" download="${att.name}">
                                    <span class="material-symbols-outlined text-slate-500 text-sm">${iconName}</span>
                                    <div class="text-left flex-1 min-w-0">
                                        <p class="font-headline text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${labelName}</p>
                                        <p class="text-[9px] text-slate-400 font-mono">${att.size}</p>
                                    </div>
                                    <span class="ml-auto material-symbols-outlined text-[14px] text-slate-400" title="Download file">download</span>
                                </a>
                            `;
                        }

                        box.innerHTML = actionHtml;
                        attachGrid.appendChild(box);
                    });
                }

                togglePanel.classList.add('task-expanded');
                togglePanel.style.maxHeight = '500px';
                togglePanel.style.opacity = '1';
                toggleIcon.style.transform = 'rotate(180deg)';
            }
        };

        clickArea.addEventListener('click', performToggle);

        // Delete Handler
        item.querySelector('.task-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete task "${task.title}"?`)) {
                APP_STATE.tasks = APP_STATE.tasks.filter(t => t.id !== task.id);
                saveTasks();
                renderAll();
            }
        });

        list.appendChild(item);
    });
}

// 2. Calendar View rendering (Duration-aware)
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-weekly-grid');
    if (!calendarGrid) return;

    calendarGrid.innerHTML = '';

    const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM"];
    const dateMap = [
        { name: 'MON', dateStr: '2023-10-23' },
        { name: 'TUE', dateStr: '2023-10-24' },
        { name: 'WED', dateStr: '2023-10-25' },
        { name: 'THU', dateStr: '2023-10-26' },
        { name: 'FRI', dateStr: '2023-10-27' },
        { name: 'SAT', dateStr: '2023-10-28' },
        { name: 'SUN', dateStr: '2023-10-29' }
    ];

    hours.forEach(hour => {
        // Label col
        const labelCol = document.createElement('div');
        labelCol.className = 'h-20 border-b border-r border-slate-200 dark:border-slate-800 flex items-start justify-center pt-2 bg-white dark:bg-slate-900';
        labelCol.innerHTML = `<span class="font-label-sm text-[10px] text-slate-400 dark:text-slate-500">${hour}</span>`;
        calendarGrid.appendChild(labelCol);

        // Days columns
        dateMap.forEach((dayInfo, dayIdx) => {
            const cell = document.createElement('div');
            cell.className = 'h-20 border-b border-r border-slate-200 dark:border-slate-800 relative hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors bg-white dark:bg-slate-900';
            
            const queryTimeStr = hourTo24String(hour);

            // Match tasks that START on this date at this exact hour
            const dayTasks = APP_STATE.tasks.filter(t => {
                const sDate = t.startDate || t.dueDate || '';
                const sTime = t.startTime || t.dueTime || '';
                return sDate === dayInfo.dateStr && sTime.startsWith(queryTimeStr.split(':')[0]);
            });

            dayTasks.forEach(task => {
                // Calculate span duration
                const duration = getDurationHours(task);
                // Row height is 80px, calculate layout height: (duration * 80) - margin offsets
                const cardHeightPx = Math.max(72, (duration * 80) - 8);

                const taskCard = document.createElement('div');
                taskCard.style.height = `${cardHeightPx}px`;
                taskCard.className = `absolute inset-x-1 top-1 p-2 text-xs border-l-4 shadow-sm z-20 overflow-hidden cursor-pointer active:scale-95 transition-transform ${
                    task.completed ? 'opacity-40 bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' :
                    task.category === 'OFFICE' ? 'bg-slate-800 text-white border-primary dark:bg-slate-950 dark:border-sky-blue-dark' : 
                    'bg-primary text-white border-slate-900 dark:bg-sky-blue-dark dark:text-slate-950 dark:border-white'
                }`;
                
                // Duration format
                const sTime = task.startTime || task.dueTime || '';
                const eTime = task.endTime || task.dueTime || '';
                const timeRange = `${sTime} - ${eTime}`;

                taskCard.innerHTML = `
                    <div class="h-full flex flex-col justify-between">
                        <div>
                            <p class="font-bold truncate">${task.title}</p>
                            <p class="opacity-80 truncate text-[9px] font-mono">${task.category} • ${timeRange}</p>
                        </div>
                        ${duration > 1.2 ? `
                        <div class="mt-auto pt-1 border-t border-white/20 flex justify-between text-[9px] opacity-75 font-mono">
                            <span>Dur: ${duration.toFixed(1)}h</span>
                            <span>${task.attachments.length} att</span>
                        </div>` : ''}
                    </div>
                `;

                // Redirect to details on click
                taskCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    switchTab('home');
                    const searchInput = document.getElementById('task-search-input');
                    if (searchInput) {
                        searchInput.value = task.title;
                        searchInput.dispatchEvent(new Event('input'));
                    }
                });

                cell.appendChild(taskCard);
            });

            // Double click to create task pre-filled
            cell.addEventListener('dblclick', () => {
                toggleModal(dayInfo.dateStr, queryTimeStr);
            });

            calendarGrid.appendChild(cell);
        });
    });
}

function getDurationHours(task) {
    const sDate = task.startDate || task.dueDate || '';
    const sTime = task.startTime || task.dueTime || '09:00';
    const eDate = task.endDate || task.dueDate || sDate || '';
    const eTime = task.endTime || task.dueTime || '10:00';
    
    const startStr = `${sDate}T${sTime}`;
    const endStr = `${eDate}T${eTime}`;
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 1.0;
    }

    const diffMs = end - start;
    if (diffMs <= 0) return 1.0;

    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.min(12.0, diffHours);
}

// Helper: hour to 24h
function hourTo24String(h) {
    const [num, meridian] = h.split(' ');
    let hr = parseInt(num);
    if (meridian === 'PM' && hr !== 12) hr += 12;
    if (meridian === 'AM' && hr === 12) hr = 0;
    return String(hr).padStart(2, '0') + ':00';
}

// 3. Analytics & Habits Detail View
function renderAnalyticsView() {
    const container = document.getElementById('habits-management-list');
    if (!container) return;

    container.innerHTML = '';
    
    APP_STATE.habits.forEach(habit => {
        const item = document.createElement('div');
        item.className = "p-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-lg";
        
        let daysHtml = '';
        const dayKeys = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        
        dayKeys.forEach(d => {
            const val = habit.days[d];
            daysHtml += `
                <div class="flex flex-col items-center gap-1 cursor-pointer flex-1 min-w-[32px] hover:bg-slate-50 dark:hover:bg-slate-800 p-1 select-none font-label-sm" data-day="${d}">
                    <span class="text-[10px] text-slate-400 dark:text-slate-500">${d}</span>
                    <div class="w-8 h-8 flex items-center justify-center border ${
                        val ? 'bg-primary border-primary text-white dark:bg-sky-blue-dark dark:border-sky-blue-dark dark:text-slate-900' :
                        'bg-slate-100 border-slate-300 text-transparent dark:bg-slate-800 dark:border-slate-700'
                    }">
                        <span class="material-symbols-outlined text-xs font-bold">check</span>
                    </div>
                </div>
            `;
        });

        item.innerHTML = `
            <div class="flex-1 space-y-md">
                <div class="flex items-center gap-md">
                    <h3 class="font-headline-md text-lg font-bold text-slate-900 dark:text-white">${habit.name}</h3>
                    <span class="px-2 py-0.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-mono font-bold">${habit.streak} Days Streak</span>
                </div>
                <div class="flex items-center gap-2 max-w-[280px]">
                    <div class="w-full bg-slate-200 dark:bg-slate-800 h-2">
                        <div class="bg-primary dark:bg-sky-blue-dark h-2" style="width: ${calculateHabitScore(habit)}%"></div>
                    </div>
                    <span class="font-label-sm text-xs text-slate-500">${calculateHabitScore(habit)}%</span>
                </div>
            </div>
            
            <div class="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-md overflow-x-auto">
                ${daysHtml}
            </div>

            <div class="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-md">
                <button class="habit-delete-btn text-slate-400 hover:text-error transition-colors p-1" title="Delete Habit">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;

        // Days check actions
        item.querySelectorAll('[data-day]').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const d = dayEl.getAttribute('data-day');
                habit.days[d] = !habit.days[d];
                recalculateHabitStreak(habit);
                saveHabits();
                renderAll();
            });
        });

        // Delete action
        item.querySelector('.habit-delete-btn').addEventListener('click', () => {
            if (confirm(`Delete habit "${habit.name}"?`)) {
                APP_STATE.habits = APP_STATE.habits.filter(h => h.id !== habit.id);
                saveHabits();
                renderAll();
            }
        });

        container.appendChild(item);
    });

    // Add habit creation form listener (bind only once)
    const addHabitForm = document.getElementById('add-habit-form');
    if (addHabitForm && !addHabitForm.dataset.listener) {
        addHabitForm.dataset.listener = 'true';
        addHabitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('new-habit-input');
            const name = input.value.trim();
            if (!name) return;

            const newHabit = {
                id: 'habit-' + Date.now(),
                name: name,
                streak: 0,
                days: { MON: false, TUE: false, WED: false, THU: false, FRI: false, SAT: false, SUN: false }
            };

            APP_STATE.habits.push(newHabit);
            saveHabits();
            input.value = '';
            renderAll();
        });
    }
}

function calculateHabitScore(habit) {
    let checkedCount = 0;
    Object.values(habit.days).forEach(val => { if (val) checkedCount++; });
    return Math.round((checkedCount / 7) * 100);
}

// Helpers
function formatDate(dateStr) {
    if (!dateStr) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = months[parseInt(parts[1]) - 1];
    const day = parseInt(parts[2]);
    return `${month} ${day}, ${year}`;
}
