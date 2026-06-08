// ─── App Initialization ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initModal();
    initSearch();
    initSidebarCollapse();

    // Subscribe to Store Changes
    Store.subscribe('theme', applyTheme);
    Store.subscribe('tasks', () => {
        renderActiveTasksList();
        renderCalendar();
    });
    Store.subscribe('habits', renderAnalyticsView);
    Store.subscribe('streakData', renderStreakJourneyWidget);
    Store.subscribe('analyticsData', () => {
        renderStreakJourneyWidget();
        renderAnalyticsView();
    });

    // Initial Theme Load
    const savedTheme = localStorage.getItem('tasktracker_theme');
    if (savedTheme) {
        Store.setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        Store.setTheme('dark');
    }

    // Dummy Auth Token setup (For development/testing purposes without Login UI)
    if (!ApiClient.isAuthenticated()) {
        console.warn("No auth token found! API requests will fail with 401 unless you login.");
    }

    // --- INTEGRATION TEST ---
    try {
        const healthRes = await ApiClient.healthCheck();
        console.log('%c✅ API CONNECTED', 'color: #4ade80; font-size: 16px; font-weight: bold;', healthRes);

        // Show success indicator in the UI Header
        const searchBox = document.querySelector('.bg-slate-50.dark\\:bg-slate-800');
        if (searchBox) {
            const indicator = document.createElement('div');
            indicator.className = "ml-4 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 font-mono text-[10px] rounded flex items-center gap-1";
            indicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> API Online';
            searchBox.parentNode.insertBefore(indicator, searchBox.nextSibling);
        }
    } catch (e) {
        console.error('%c❌ API CONNECTION FAILED', 'color: #ef4444; font-size: 16px; font-weight: bold;', e);
    }

    // Fetch Initial Data
    await Store.fetchAllData();
});

// ─── Theme & Layout ──────────────────────────────────────────────────────────
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tasktracker_theme', theme);
    updateThemeToggleIcons(theme);
}

function toggleTheme() {
    const current = Store.getState().theme;
    Store.setTheme(current === 'light' ? 'dark' : 'light');
}

function updateThemeToggleIcons(theme) {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        const iconSpan = themeBtn.querySelector('.material-symbols-outlined');
        if (iconSpan) {
            iconSpan.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    }
}

// Sidebar collapse logic
function initSidebarCollapse() {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('app-sidebar');
    const header = document.getElementById('app-header');
    const main = document.getElementById('app-main');

    if (!toggleBtn || !sidebar || !header || !main) return;

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

// ─── Navigation ──────────────────────────────────────────────────────────────
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

    const logo = document.querySelector('aside h1');
    if (logo) {
        logo.addEventListener('click', () => switchTab('home'));
        logo.style.cursor = 'pointer';
    }
}

function switchTab(tabName) {
    Store.setActiveTab(tabName);

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

    if (tabName === 'calendar') renderCalendar();
    else if (tabName === 'analytics') renderAnalyticsView();
    else if (tabName === 'home') {
        renderStreakJourneyWidget();
        renderActiveTasksList();
    }
}

// ─── Search ──────────────────────────────────────────────────────────────────
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

// ─── Modal Form Operations ───────────────────────────────────────────────────
let activeCategory = 'OFFICE';
let tempAttachments = [];

function initModal() {
    const modal = document.getElementById('taskModal');

    const closeBtn = modal.querySelector('button[onclick="toggleModal()"]');
    if (closeBtn) {
        closeBtn.removeAttribute('onclick');
        closeBtn.addEventListener('click', toggleModal);
    }

    const cancelBtn = document.getElementById('modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', toggleModal);

    const saveBtn = document.getElementById('modal-submit-btn');
    if (saveBtn) saveBtn.addEventListener('click', handleTaskSubmit);

    const catBtns = document.querySelectorAll('.category-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.getAttribute('data-type').toUpperCase();
            catBtns.forEach(b => {
                b.classList.remove('bg-slate-800', 'text-white', 'dark:bg-slate-200', 'dark:text-slate-900');
                b.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-800');
            });
            const theme = Store.getState().theme;
            if (theme === 'dark') {
                btn.classList.add('bg-slate-200', 'text-slate-900');
            } else {
                btn.classList.add('bg-slate-800', 'text-white');
            }
            btn.classList.remove('hover:bg-slate-100', 'dark:hover:bg-slate-800');
        });
    });

    const fileUploader = document.getElementById('file-uploader');
    if (fileUploader) {
        fileUploader.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" is too large! Maximum allowed size is 5MB.`);
                fileUploader.value = '';
                return;
            }

            tempAttachments = [{
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                file: file
            }]; // Limit to 1 for this implementation
            renderModalAttachments();
            fileUploader.value = '';
        });
    }

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

            let formattedUrl = url;
            if (!/^https?:\/\//i.test(url)) {
                formattedUrl = 'https://' + url;
            }

            tempAttachments = [{
                name: label,
                url: formattedUrl
            }];
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
        document.getElementById('task-form-title').value = '';

        const defaultDate = prefillDate || new Date().toISOString().split('T')[0];
        document.getElementById('task-form-start-date').value = defaultDate;
        document.getElementById('task-form-start-time').value = prefillTime || '09:00';
        document.getElementById('task-form-end-date').value = defaultDate;

        let endHr = 10;
        if (prefillTime) {
            const parts = prefillTime.split(':');
            endHr = Math.min(23, parseInt(parts[0]) + 1);
        }
        document.getElementById('task-form-end-time').value = String(endHr).padStart(2, '0') + ':00';
        document.getElementById('task-form-notes').value = '';
        document.getElementById('task-form-priority').checked = false;

        const urlInput = document.getElementById('link-url-input');
        const labelInput = document.getElementById('link-label-input');
        if (urlInput) urlInput.value = '';
        if (labelInput) labelInput.value = '';

        tempAttachments = [];
        renderModalAttachments();

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

        const typeBadge = att.file ? 'FILE' : 'LINK';
        const displayLabel = att.file ? `${att.name.toUpperCase()} (${att.size})` : `${att.name.toUpperCase()} (LINK)`;

        item.innerHTML = `
            <span class="font-label-sm text-[9px] text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 px-1">\${typeBadge}</span>
            <span class="font-label-sm text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[200px]">\${displayLabel}</span>
            <button class="hover:text-error transition-colors" data-idx="\${idx}"><span class="material-symbols-outlined text-xs">close</span></button>
        `;
        item.querySelector('button').addEventListener('click', () => {
            tempAttachments.splice(idx, 1);
            renderModalAttachments();
        });
        list.appendChild(item);
    });
}

async function handleTaskSubmit() {
    const title = document.getElementById('task-form-title').value.trim();
    const startDate = document.getElementById('task-form-start-date').value;
    const startTime = document.getElementById('task-form-start-time').value;
    const endDate = document.getElementById('task-form-end-date').value;
    const endTime = document.getElementById('task-form-end-time').value;
    const notes = document.getElementById('task-form-notes').value.trim();

    if (!title || !startDate || !startTime || !endDate || !endTime) {
        alert("Please complete all required fields!");
        return;
    }

    const startObj = new Date(`${startDate}T${startTime}`);
    const endObj = new Date(`${endDate}T${endTime}`);
    if (startObj > endObj) {
        alert("Warning: Start time occurs after End/Deadline time.");
        return;
    }

    let attachmentUrl = null;
    const submitBtn = document.getElementById('modal-submit-btn');
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;

    try {
        if (tempAttachments.length > 0) {
            const att = tempAttachments[0];
            if (att.file) {
                attachmentUrl = await Store.uploadAttachment(att.file);
            } else if (att.url) {
                attachmentUrl = att.url;
            }
        }

        const newTask = {
            title,
            startDate: startObj.toISOString(),
            endDate: endObj.toISOString(),
            type: activeCategory,
            repeatableType: 'disable',
            attachmentUrl
        };

        await Store.createTask(newTask);
        toggleModal();
    } catch (err) {
        console.error(err);
        alert("Failed to create task: " + err.message);
    } finally {
        submitBtn.textContent = 'Create Task';
        submitBtn.disabled = false;
    }
}

// ─── Dashboard Renderers ─────────────────────────────────────────────────────

function renderStreakJourneyWidget() {
    const { streakData, analyticsData } = Store.getState();
    const container = document.getElementById('dashboard-weekly-view');
    if (!container) return;

    container.innerHTML = '';

    if (streakData && streakData.habits && streakData.habits.length > 0) {
        streakData.habits.forEach(habit => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 mb-2";

            div.innerHTML = `
                <span class="font-headline text-sm font-bold text-slate-900 dark:text-white">\${habit.title}</span>
                <div class="flex items-center gap-4">
                    <span class="font-mono text-xs text-primary dark:text-sky-blue-dark font-bold">\${habit.currentStreak} Streak</span>
                    <button class="check-habit-btn p-1 bg-primary text-white hover:brightness-110 active:scale-95 transition-all" data-id="\${habit.habitId}">
                        <span class="material-symbols-outlined text-sm block">check</span>
                    </button>
                </div>
            `;

            div.querySelector('.check-habit-btn').addEventListener('click', async () => {
                await Store.checkHabit(habit.habitId);
            });

            container.appendChild(div);
        });

        const activeDaysVal = document.getElementById('dashboard-active-days');
        if (activeDaysVal) {
            activeDaysVal.textContent = streakData.summary.maxStreak;
        }
    } else {
        container.innerHTML = '<p class="text-xs text-slate-500 font-mono">No daily habits found.</p>';
    }

    if (analyticsData) {
        const percentScore = analyticsData.habits.thisWeek.percentage || 0;
        const scoreVal = document.getElementById('dashboard-completion-percentage');
        if (scoreVal) scoreVal.textContent = `${percentScore}% COMPLETE`;

        const efficiencyVal = document.getElementById('dashboard-efficiency-val');
        if (efficiencyVal) {
            efficiencyVal.innerHTML = `${percentScore}<span class="text-xl opacity-50 ml-1">%</span>`;
        }
    }
}

function renderActiveTasksList() {
    const { tasks } = Store.getState();
    const list = document.getElementById('dashboard-active-tasks-list');
    if (!list) return;

    list.innerHTML = '';

    const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(taskSearchQuery));

    filteredTasks.sort((a, b) => {
        const aComp = !!a.completedAt;
        const bComp = !!b.completedAt;
        if (aComp !== bComp) return aComp ? 1 : -1;
        return new Date(a.startDate) - new Date(b.startDate);
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
        const isCompleted = !!task.completedAt;
        item.className = `task-container group border-b border-slate-100 dark:border-slate-800/85 transition-all duration-300 \${isCompleted ? 'opacity-65 bg-slate-50/40 dark:bg-slate-900/10' : 'bg-white dark:bg-slate-950'}`;

        let categoryBadge = `<span class="px-2 py-0.5 border border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold tracking-wider uppercase select-none">\${task.type}</span>`;

        let attachmentsBadge = task.attachmentUrl ? `
            <span class="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 select-none">
                <span class="material-symbols-outlined text-[12px]">attachment</span> 1 Item
            </span>` : '';

        let checkIcon = isCompleted ? `
            <div class="w-5 h-5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-950 flex items-center justify-center flex-shrink-0 cursor-pointer border border-slate-800 dark:border-slate-200 transition-colors">
                <span class="material-symbols-outlined text-[12px] font-extrabold">check</span>
            </div>` : `
            <div class="w-5 h-5 border border-slate-400 dark:border-slate-500 flex-shrink-0 group-hover:border-primary dark:group-hover:border-sky-blue-dark transition-colors cursor-pointer bg-white dark:bg-slate-900"></div>`;

        const sDate = new Date(task.startDate);
        const eDate = new Date(task.endDate);
        const rangeText = `${sDate.toLocaleDateString()} (\${sDate.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}) to \${eDate.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;

        item.innerHTML = `
            <div class="p-5 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer task-click-info">
                <div class="flex items-start gap-4 flex-1 min-w-0">
                    <div class="task-checkbox-wrapper mt-0.5 shrink-0">
                        ${checkIcon}
                    </div>
                    <div class="space-y-1.5 min-w-0">
                        <h3 class="font-headline font-bold text-base text-slate-900 dark:text-white leading-tight \${isCompleted ? 'line-through text-slate-400 dark:text-slate-500 font-medium' : ''}">
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

                <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        ${categoryBadge}
                    </div>
                    
                    <div class="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                        <button class="task-delete-btn text-slate-400 hover:text-error dark:hover:text-red-400 transition-colors p-1" title="Delete Task">
                            <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        item.querySelector('.task-checkbox-wrapper').addEventListener('click', async (e) => {
            e.stopPropagation();
            const updates = { completedAt: isCompleted ? null : new Date().toISOString() };
            await Store.updateTask(task.id, updates);
        });

        item.querySelector('.task-delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Delete task "${task.title}"?`)) {
                await Store.deleteTask(task.id);
            }
        });

        list.appendChild(item);
    });
}

// ─── Calendar Render ─────────────────────────────────────────────────────────

function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-weekly-grid');
    if (!calendarGrid) return;
    const { tasks } = Store.getState();

    calendarGrid.innerHTML = '';

    const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM"];
    // Simplified date mapping for demo purposes (using a fixed week to match static UI)
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
        const labelCol = document.createElement('div');
        labelCol.className = 'h-20 border-b border-r border-slate-200 dark:border-slate-800 flex items-start justify-center pt-2 bg-white dark:bg-slate-900';
        labelCol.innerHTML = `<span class="font-label-sm text-[10px] text-slate-400 dark:text-slate-500">${hour}</span>`;
        calendarGrid.appendChild(labelCol);

        dateMap.forEach((dayInfo) => {
            const cell = document.createElement('div');
            cell.className = 'h-20 border-b border-r border-slate-200 dark:border-slate-800 relative hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors bg-white dark:bg-slate-900';

            const queryTimeStr = hourTo24String(hour);

            // Using local strings to match the fixed dates for demo
            const dayTasks = tasks.filter(t => {
                const startObj = new Date(t.startDate);
                const localDateStr = startObj.getFullYear() + '-' + String(startObj.getMonth() + 1).padStart(2, '0') + '-' + String(startObj.getDate()).padStart(2, '0');
                const localHourStr = String(startObj.getHours()).padStart(2, '0') + ':00';
                return localDateStr === dayInfo.dateStr && localHourStr === queryTimeStr;
            });

            dayTasks.forEach(task => {
                const duration = getDurationHours(task);
                const cardHeightPx = Math.max(72, (duration * 80) - 8);

                const taskCard = document.createElement('div');
                taskCard.style.height = `${cardHeightPx}px`;
                taskCard.className = `absolute inset-x-1 top-1 p-2 text-xs border-l-4 shadow-sm z-20 overflow-hidden cursor-pointer active:scale-95 transition-transform ${task.completedAt ? 'opacity-40 bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' :
                        task.type === 'OFFICE' ? 'bg-slate-800 text-white border-primary dark:bg-slate-950 dark:border-sky-blue-dark' :
                            'bg-primary text-white border-slate-900 dark:bg-sky-blue-dark dark:text-slate-950 dark:border-white'
                    }`;

                let attachmentHtml = '';
                if (task.attachmentUrl) {
                    if (task.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp|avif)/i)) {
                        attachmentHtml = `<img src="${task.attachmentUrl}" class="w-full h-10 object-cover mt-1 opacity-80" />`;
                    } else {
                        attachmentHtml = `<div class="text-[9px] mt-1 font-mono opacity-80 truncate"><span class="material-symbols-outlined text-[10px]">link</span> Attached</div>`;
                    }
                }

                taskCard.innerHTML = `
                    <div class="h-full flex flex-col justify-between">
                        <div>
                            <p class="font-bold truncate">${task.title}</p>
                            ${attachmentHtml}
                        </div>
                    </div>
                `;

                cell.appendChild(taskCard);
            });

            cell.addEventListener('dblclick', () => {
                toggleModal(dayInfo.dateStr, queryTimeStr);
            });

            calendarGrid.appendChild(cell);
        });
    });
}

function getDurationHours(task) {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1.0;
    const diffMs = end - start;
    if (diffMs <= 0) return 1.0;
    return Math.min(12.0, diffMs / (1000 * 60 * 60));
}

function hourTo24String(h) {
    const [num, meridian] = h.split(' ');
    let hr = parseInt(num);
    if (meridian === 'PM' && hr !== 12) hr += 12;
    if (meridian === 'AM' && hr === 12) hr = 0;
    return String(hr).padStart(2, '0') + ':00';
}

// ─── Analytics & Habits View ─────────────────────────────────────────────────

function renderAnalyticsView() {
    const { habits, analyticsData } = Store.getState();
    const container = document.getElementById('habits-management-list');
    if (!container) return;

    container.innerHTML = '';

    habits.forEach(habit => {
        const item = document.createElement('div');
        item.className = "p-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-lg mb-4 p-4";

        // Find recent completions for this week conceptually
        item.innerHTML = `
            <div class="flex-1 space-y-md">
                <div class="flex items-center gap-md mb-2">
                    <h3 class="font-headline-md text-lg font-bold text-slate-900 dark:text-white">${habit.title}</h3>
                    <span class="px-2 py-0.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-mono font-bold">${habit.repeatableType}</span>
                </div>
                <div class="text-xs text-slate-500 font-mono">${habit.logs ? habit.logs.length : 0} Total Check-ins</div>
            </div>
            
            <div class="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                <button class="habit-delete-btn text-slate-400 hover:text-error transition-colors p-1" title="Delete Habit">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;

        item.querySelector('.habit-delete-btn').addEventListener('click', async () => {
            if (confirm(`Delete habit "${habit.title}"?`)) {
                await Store.deleteHabit(habit.id);
            }
        });

        container.appendChild(item);
    });

    const addHabitForm = document.getElementById('add-habit-form');
    if (addHabitForm && !addHabitForm.dataset.listener) {
        addHabitForm.dataset.listener = 'true';
        addHabitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('new-habit-input');
            const title = input.value.trim();
            if (!title) return;

            await Store.createHabit({
                title: title,
                type: 'general',
                repeatableType: 'daily'
            });
            input.value = '';
        });
    }
}
