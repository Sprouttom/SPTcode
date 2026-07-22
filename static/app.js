/**
 * PJ Cost Record - Single Page Application (SPA) Logic
 * Integrates Chart.js dashboards, REST API endpoints, real-time search & filter,
 * CRUD operations for projects & expense items, and live formula engine sandbox.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Application State
    const state = {
        categories: [],
        projects: [],
        dashboardData: null,
        currentProject: null,
        charts: {},
        user: null
    };

    // DOM Elements
    const elements = {
        navBtns: document.querySelectorAll(".nav-btn"),
        tabContents: document.querySelectorAll(".tab-content"),
        btnSyncExcel: document.getElementById("btn-sync-excel"),
        btnNewProject: document.getElementById("btn-new-project"),
        
        // Dashboard KPI
        kpiProjects: document.getElementById("kpi-total-projects"),
        kpiStatusBreakdown: document.getElementById("kpi-status-breakdown"),
        kpiContract: document.getElementById("kpi-total-contract"),
        kpiExpenses: document.getElementById("kpi-total-expenses"),
        kpiBudgetComp: document.getElementById("kpi-budget-comparison"),
        kpiGrossProfit: document.getElementById("kpi-gross-profit"),
        kpiProfitPct: document.getElementById("kpi-profit-pct"),
        topProjectsTbody: document.getElementById("top-projects-tbody"),
        
        // Projects List
        searchInput: document.getElementById("search-input"),
        statusFilter: document.getElementById("status-filter"),
        clientFilter: document.getElementById("client-filter"),
        projectsTbody: document.getElementById("projects-tbody"),
        
        // Forecast
        forecastTbody: document.getElementById("forecast-tbody"),
        
        // Formulas Sandbox
        sbContract: document.getElementById("sb-contract"),
        sbBudget: document.getElementById("sb-budget"),
        sbExpense: document.getElementById("sb-expense"),
        sbRate: document.getElementById("sb-rate"),
        btnRunFormula: document.getElementById("btn-run-formula"),
        resBudgetProfitPct: document.getElementById("res-budget-profit-pct"),
        resGrossProfit: document.getElementById("res-gross-profit"),
        resGrossPct: document.getElementById("res-gross-pct"),
        resIncentive: document.getElementById("res-incentive"),
        jsCodeView: document.getElementById("js-code-view"),
        
        // Modals
        projectModal: document.getElementById("project-modal"),
        modalCloseBtn: document.getElementById("modal-close-btn"),
        btnModalCancel: document.getElementById("btn-modal-cancel"),
        projectForm: document.getElementById("project-form"),
        modalCategoryTbody: document.getElementById("modal-category-tbody"),
        modalItemsTbody: document.getElementById("modal-items-tbody"),
        btnAddItem: document.getElementById("btn-add-item"),
        
        itemModal: document.getElementById("item-modal"),
        itemModalClose: document.getElementById("item-modal-close"),
        btnItemCancel: document.getElementById("btn-item-cancel"),
        itemForm: document.getElementById("item-form"),
        itemCategorySelect: document.getElementById("item-category-code")
    };

    // Helper: Currency Formatter
    const formatCurrency = (val) => {
        return new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
            minimumFractionDigits: 2
        }).format(val || 0);
    };

    const formatPercent = (val) => {
        return `${((val || 0) * 100).toFixed(1)}%`;
    };

    // --- 1. Tab Navigation ---
    elements.navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            // Viewer restricted tab check
            if (targetTab === "formulas-tab" && state.user && state.user.role === "viewer") {
                alert("คุณไม่มีสิทธิ์เข้าใช้งาน Formulas Sandbox");
                return;
            }

            elements.navBtns.forEach(b => b.classList.remove("active"));
            elements.tabContents.forEach(t => t.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(targetTab).classList.add("active");
            
            if (targetTab === "dashboard-tab") loadDashboard();
            if (targetTab === "projects-tab") loadProjects();
            if (targetTab === "forecast-tab") loadForecasts();
        });
    });

    // --- 2. Dashboard Loader ---
    async function loadDashboard() {
        try {
            const res = await securedFetch("/api/dashboard");
            const data = await res.json();
            if (!data.success) return;

            state.dashboardData = data;
            const m = data.metrics;

            elements.kpiProjects.textContent = m.total_projects;
            elements.kpiStatusBreakdown.textContent = `In Progress: ${m.status_counts["In Progress"] || 0} | Completed: ${m.status_counts["Completed"] || 0}`;
            elements.kpiContract.textContent = formatCurrency(m.total_contract);
            elements.kpiExpenses.textContent = formatCurrency(m.total_expenses);
            elements.kpiBudgetComp.textContent = `Total Budget: ${formatCurrency(m.total_budget)}`;
            elements.kpiGrossProfit.textContent = formatCurrency(m.total_gross_profit);
            elements.kpiProfitPct.textContent = `${formatPercent(m.overall_profit_pct)} Margin`;

            // Render Top Profitable Projects
            elements.topProjectsTbody.innerHTML = data.top_projects.map(p => `
                <tr>
                    <td><strong>${p.job_code}</strong></td>
                    <td>${p.project_name}</td>
                    <td>${p.client_name}</td>
                    <td>${formatCurrency(p.contract_price)}</td>
                    <td class="text-success"><strong>${formatCurrency(p.gross_profit_amount)}</strong></td>
                    <td><span class="status-badge profit-high">${formatPercent(p.gross_profit_pct)}</span></td>
                </tr>
            `).join("");

            renderCharts(data);
        } catch (err) {
            console.error("Error loading dashboard:", err);
        }
    }

    // Chart.js Rendering
    function renderCharts(data) {
        // 1. Financial Performance Bar Chart
        const ctxFin = document.getElementById("financialChart").getContext("2d");
        if (state.charts.financial) state.charts.financial.destroy();

        const topPjs = data.top_projects || [];
        state.charts.financial = new Chart(ctxFin, {
            type: "bar",
            data: {
                labels: topPjs.map(p => p.job_code || p.project_name),
                datasets: [
                    {
                        label: "Contract Price",
                        data: topPjs.map(p => p.contract_price),
                        backgroundColor: "rgba(99, 102, 241, 0.7)",
                        borderColor: "#6366f1",
                        borderWidth: 1
                    },
                    {
                        label: "Gross Profit",
                        data: topPjs.map(p => p.gross_profit_amount),
                        backgroundColor: "rgba(16, 185, 129, 0.7)",
                        borderColor: "#10b981",
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#94a3b8" } }
                },
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } },
                    y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }
                }
            }
        });

        // 2. Category Expense Pie Chart
        const ctxCat = document.getElementById("categoryChart").getContext("2d");
        if (state.charts.category) state.charts.category.destroy();

        const catData = data.category_expenses || {};
        const catLabels = [];
        const catValues = [];
        Object.values(catData).forEach(c => {
            if (c.expense > 0 || c.budget > 0) {
                catLabels.push(c.name);
                catValues.push(c.expense);
            }
        });

        state.charts.category = new Chart(ctxCat, {
            type: "doughnut",
            data: {
                labels: catLabels,
                datasets: [{
                    data: catValues,
                    backgroundColor: [
                        "#6366f1", "#10b981", "#fb923c", "#38bdf8",
                        "#f43f5e", "#a855f7", "#eab308", "#14b8a6"
                    ],
                    borderWidth: 2,
                    borderColor: "#1e293b"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "right", labels: { color: "#94a3b8" } }
                }
            }
        });
    }

    // --- 3. Projects List & Filtering ---
    async function loadProjects() {
        const q = elements.searchInput.value;
        const status = elements.statusFilter.value;
        const client = elements.clientFilter.value;

        const params = new URLSearchParams();
        if (q) params.append("q", q);
        if (status) params.append("status", status);
        if (client) params.append("client", client);

        try {
            const res = await securedFetch(`/api/projects?${params.toString()}`);
            const data = await res.json();
            if (!data.success) return;

            state.projects = data.projects;
            populateClientFilter(state.projects);
            renderProjectsTable(state.projects);
        } catch (err) {
            console.error("Error loading projects:", err);
        }
    }

    function populateClientFilter(projects) {
        const clients = [...new Set(projects.map(p => p.client_name).filter(Boolean))];
        const currentVal = elements.clientFilter.value;
        elements.clientFilter.innerHTML = '<option value="">All Clients</option>' +
            clients.map(c => `<option value="${c}" ${c === currentVal ? "selected" : ""}>${c}</option>`).join("");
    }

    function renderProjectsTable(projects) {
        if (projects.length === 0) {
            elements.projectsTbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 2rem; color: #64748b;">No projects found matching your criteria.</td></tr>`;
            return;
        }

        elements.projectsTbody.innerHTML = projects.map(p => {
            const stClass = p.status === "Completed" ? "completed" : "in-progress";
            const profitClass = (p.gross_profit_pct || 0) >= 0.2 ? "profit-high" : "profit-low";

            // Role-based actions
            let actionButtons = '';
            if (state.user && state.user.role === 'viewer') {
                // Viewer sees View icon
                actionButtons = `
                    <button class="btn btn-secondary btn-sm btn-edit-pj" data-id="${p.id}" title="ดูรายละเอียดโครงการ">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                `;
            } else if (state.user && state.user.role === 'editor') {
                // Editor sees Edit icon but cannot delete
                actionButtons = `
                    <button class="btn btn-secondary btn-sm btn-edit-pj" data-id="${p.id}" title="แก้ไขบันทึกค่าใช้จ่าย">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                `;
            } else {
                // Admin sees Edit and Delete
                actionButtons = `
                    <button class="btn btn-secondary btn-sm btn-edit-pj" data-id="${p.id}" title="Edit Project">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-del-pj" data-id="${p.id}" title="Delete Project">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
            }

            return `
                <tr>
                    <td><strong>${p.job_code}</strong></td>
                    <td>
                        <div><strong>${p.project_name}</strong></div>
                        <div style="font-size: 0.75rem; color: #94a3b8;">${p.client_name}</div>
                    </td>
                    <td>${formatCurrency(p.contract_price)}</td>
                    <td>${formatCurrency(p.budget_price)}</td>
                    <td>${formatCurrency(p.total_actual_expenses)}</td>
                    <td class="text-success"><strong>${formatCurrency(p.gross_profit_amount)}</strong></td>
                    <td><span class="status-badge ${profitClass}">${formatPercent(p.gross_profit_pct)}</span></td>
                    <td><span class="status-badge ${stClass}">${p.status}</span></td>
                    <td class="text-right">
                        ${actionButtons}
                    </td>
                </tr>
            `;
        }).join("");

        // Attach action listeners
        document.querySelectorAll(".btn-edit-pj").forEach(b => {
            b.addEventListener("click", () => openProjectModal(b.getAttribute("data-id")));
        });

        document.querySelectorAll(".btn-del-pj").forEach(b => {
            b.addEventListener("click", () => deleteProject(b.getAttribute("data-id")));
        });
    }

    // Real-time Search & Filter Events
    elements.searchInput.addEventListener("input", loadProjects);
    elements.statusFilter.addEventListener("change", loadProjects);
    elements.clientFilter.addEventListener("change", loadProjects);

    // --- 4. Money Forecast Loader ---
    async function loadForecasts() {
        try {
            const res = await securedFetch("/api/dashboard");
            const data = await res.json();
            if (!data.success) return;

            const forecasts = data.forecasts || [];
            elements.forecastTbody.innerHTML = forecasts.map(f => `
                <tr>
                    <td>${f.id}</td>
                    <td><strong>${f.title}</strong></td>
                    <td>${f.date || "-"}</td>
                    <td>${formatCurrency(f.month_1)}</td>
                    <td>${formatCurrency(f.month_2)}</td>
                    <td>${formatCurrency(f.month_3)}</td>
                    <td>${formatCurrency(f.month_4)}</td>
                    <td class="text-success"><strong>${formatCurrency(f.total)}</strong></td>
                </tr>
            `).join("");
        } catch (err) {
            console.error("Error loading forecasts:", err);
        }
    }

    // --- 5. Project CRUD & Modals ---
    async function openProjectModal(projectId = null) {
        if (state.categories.length === 0) {
            try {
                const catRes = await securedFetch("/api/categories");
                const catData = await catRes.json();
                state.categories = catData.categories || [];
            } catch (e) { return; }
        }

        if (projectId) {
            try {
                const res = await securedFetch(`/api/projects/${projectId}`);
                const data = await res.json();
                if (data.success) {
                    state.currentProject = data.project;
                    fillProjectForm(data.project);
                }
            } catch (e) { return; }
        } else {
            state.currentProject = {
                id: "",
                job_code: "",
                offer_no: "",
                client_name: "",
                project_name: "",
                description: "",
                status: "In Progress",
                contract_price: 0,
                budget_price: 0,
                expense_items: [],
                budget_categories: state.categories.map(c => ({
                    code: c.code,
                    description: c.name,
                    budget: 0,
                    expense: 0,
                    balance: 0
                }))
            };
            fillProjectForm(state.currentProject);
        }

        elements.projectModal.classList.add("active");
    }

    function fillProjectForm(pj) {
        document.getElementById("form-pj-id").value = pj.id || "";
        document.getElementById("form-job-code").value = pj.job_code || "";
        document.getElementById("form-offer-no").value = pj.offer_no || "";
        document.getElementById("form-status").value = pj.status || "In Progress";
        document.getElementById("form-client-name").value = pj.client_name || "";
        document.getElementById("form-project-name").value = pj.project_name || "";
        document.getElementById("form-contract-price").value = pj.contract_price || 0;
        document.getElementById("form-budget-price").value = pj.budget_price || 0;
        document.getElementById("form-description").value = pj.description || "";

        renderModalCategories(pj.budget_categories || []);
        renderModalItems(pj.expense_items || []);
        
        // Protect fields based on user role
        const isViewer = state.user && state.user.role === 'viewer';
        const isEditor = state.user && state.user.role === 'editor';
        
        // Project core inputs
        const coreInputs = [
            "form-job-code", "form-offer-no", "form-status",
            "form-client-name", "form-project-name",
            "form-contract-price", "form-budget-price", "form-description"
        ];
        
        coreInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = (isViewer || isEditor);
        });

        // Save project button in modal footer
        const saveProjectBtn = elements.projectForm.querySelector('button[type="submit"]');
        if (saveProjectBtn) {
            saveProjectBtn.style.display = (isViewer || isEditor) ? "none" : "inline-flex";
        }

        // Add expense button
        if (elements.btnAddItem) {
            elements.btnAddItem.style.display = isViewer ? "none" : "inline-flex";
        }
    }

    function renderModalCategories(categories) {
        const isViewer = state.user && state.user.role === 'viewer';
        const isEditor = state.user && state.user.role === 'editor';
        const disableInput = (isViewer || isEditor) ? 'disabled' : '';

        elements.modalCategoryTbody.innerHTML = categories.map(c => `
            <tr>
                <td><strong>${c.code}</strong></td>
                <td>${c.description}</td>
                <td>
                    <input type="number" step="0.01" class="form-control form-control-sm cat-budget-input" data-code="${c.code}" value="${c.budget || 0}" ${disableInput}>
                </td>
                <td>${formatCurrency(c.expense)}</td>
                <td><strong class="${(c.balance || 0) < 0 ? 'text-danger' : 'text-success'}">${formatCurrency(c.balance)}</strong></td>
            </tr>
        `).join("");
    }

    function renderModalItems(items) {
        if (!items || items.length === 0) {
            elements.modalItemsTbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 1rem; color: #64748b;">No expense items recorded yet.</td></tr>`;
            return;
        }

        const isViewer = state.user && state.user.role === 'viewer';

        elements.modalItemsTbody.innerHTML = items.map(it => {
            let deleteCol = '';
            if (!isViewer) {
                deleteCol = `
                    <button type="button" class="btn btn-danger btn-sm btn-del-item" data-item-id="${it.item_id}" title="ลบรายการค่าใช้จ่าย">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;
            }
            
            return `
                <tr>
                    <td>${it.date || "-"}</td>
                    <td>${it.vendor || "-"}</td>
                    <td><span class="status-badge in-progress">${it.material_number}</span></td>
                    <td>${it.description || "-"}</td>
                    <td><strong>${formatCurrency(it.amount)}</strong></td>
                    <td>${it.updated_by || "-"}</td>
                    <td class="text-right">
                        ${deleteCol}
                    </td>
                </tr>
            `;
        }).join("");

        document.querySelectorAll(".btn-del-item").forEach(b => {
            b.addEventListener("click", () => deleteExpenseItem(b.getAttribute("data-item-id")));
        });
    }

    elements.projectForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pjId = document.getElementById("form-pj-id").value;

        // Gather updated category budgets
        const categoryBudgets = [];
        document.querySelectorAll(".cat-budget-input").forEach(inp => {
            const code = Number(inp.getAttribute("data-code"));
            const bgVal = Number(inp.value) || 0;
            const existingCat = state.currentProject.budget_categories.find(c => c.code === code);
            categoryBudgets.push({
                code: code,
                description: existingCat ? existingCat.description : `Category ${code}`,
                budget: bgVal
            });
        });

        const payload = {
            job_code: document.getElementById("form-job-code").value,
            offer_no: document.getElementById("form-offer-no").value,
            status: document.getElementById("form-status").value,
            client_name: document.getElementById("form-client-name").value,
            project_name: document.getElementById("form-project-name").value,
            contract_price: Number(document.getElementById("form-contract-price").value) || 0,
            budget_price: Number(document.getElementById("form-budget-price").value) || 0,
            description: document.getElementById("form-description").value,
            budget_categories: categoryBudgets
        };

        const url = pjId ? `/api/projects/${pjId}` : "/api/projects";
        const method = pjId ? "PUT" : "POST";

        try {
            const res = await securedFetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                elements.projectModal.classList.remove("active");
                loadProjects();
                loadDashboard();
            }
        } catch (err) {
            console.error("Error saving project:", err);
        }
    });

    async function deleteProject(projectId) {
        if (!confirm("Are you sure you want to delete this project?")) return;
        try {
            const res = await securedFetch(`/api/projects/${projectId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                loadProjects();
                loadDashboard();
            }
        } catch (err) {
            console.error("Error deleting project:", err);
        }
    }

    // --- 6. Expense Item CRUD ---
    elements.btnAddItem.addEventListener("click", () => {
        if (!state.currentProject || !state.currentProject.id) {
            alert("Please save the project first before adding expense items.");
            return;
        }

        // Fill category options dropdown
        elements.itemCategorySelect.innerHTML = state.categories.map(c =>
            `<option value="${c.code}">${c.code} - ${c.name}</option>`
        ).join("");

        document.getElementById("item-form-id").value = "";
        document.getElementById("item-vendor").value = "";
        document.getElementById("item-amount").value = "";
        document.getElementById("item-description").value = "";
        document.getElementById("item-date").value = new Date().toISOString().split("T")[0];
        document.getElementById("item-updated-by").value = "K.Kowit";

        elements.itemModal.classList.add("active");
    });

    elements.itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const projectId = state.currentProject.id;
        const payload = {
            vendor: document.getElementById("item-vendor").value,
            material_number: Number(elements.itemCategorySelect.value),
            amount: Number(document.getElementById("item-amount").value) || 0,
            description: document.getElementById("item-description").value,
            date: document.getElementById("item-date").value,
            updated_by: document.getElementById("item-updated-by").value
        };

        try {
            const res = await securedFetch(`/api/projects/${projectId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                state.currentProject = data.project;
                fillProjectForm(data.project);
                elements.itemModal.classList.remove("active");
                loadProjects();
            }
        } catch (err) {
            console.error("Error adding expense item:", err);
        }
    });

    async function deleteExpenseItem(itemId) {
        if (!confirm("Are you sure you want to delete this expense item?")) return;
        const projectId = state.currentProject.id;

        try {
            const res = await securedFetch(`/api/projects/${projectId}/items/${itemId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                state.currentProject = data.project;
                fillProjectForm(data.project);
                loadProjects();
            }
        } catch (err) {
            console.error("Error deleting expense item:", err);
        }
    }

    // Modal Close Triggers
    elements.modalCloseBtn.addEventListener("click", () => elements.projectModal.classList.remove("active"));
    elements.btnModalCancel.addEventListener("click", () => elements.projectModal.classList.remove("active"));
    elements.itemModalClose.addEventListener("click", () => elements.itemModal.classList.remove("active"));
    elements.btnItemCancel.addEventListener("click", () => elements.itemModal.classList.remove("active"));
    elements.btnNewProject.addEventListener("click", () => openProjectModal());

    // --- 7. Formula Sandbox Controller ---
    function runFormulaSandbox() {
        const cp = Number(elements.sbContract.value) || 0;
        const bp = Number(elements.sbBudget.value) || 0;
        const exp = Number(elements.sbExpense.value) || 0;
        const rate = (Number(elements.sbRate.value) || 25) / 100;

        const budgetProfitPct = CostEngine.calculateBudgetProfitPct(cp, bp);
        const grossProfit = CostEngine.calculateGrossProfitAmount(cp, exp);
        const grossProfitPct = CostEngine.calculateGrossProfitPct(cp, grossProfit);
        const incentive = CostEngine.calculateIncentiveShare(grossProfit, rate);

        elements.resBudgetProfitPct.textContent = formatPercent(budgetProfitPct);
        elements.resGrossProfit.textContent = formatCurrency(grossProfit);
        elements.resGrossPct.textContent = formatPercent(grossProfitPct);
        elements.resIncentive.textContent = formatCurrency(incentive);

        elements.jsCodeView.textContent = `
// Calculated with CostEngine (static/costEngine.js)
const contractPrice = ${cp};
const actualExpense = ${exp};

const grossProfit = CostEngine.calculateGrossProfitAmount(${cp}, ${exp});
// Output: ${grossProfit} THB

const grossProfitPct = CostEngine.calculateGrossProfitPct(${cp}, ${grossProfit});
// Output: ${(grossProfitPct * 100).toFixed(2)}%

const incentiveShare = CostEngine.calculateIncentiveShare(${grossProfit}, ${rate});
// Output: ${incentive} THB
        `.trim();
    }

    elements.btnRunFormula.addEventListener("click", runFormulaSandbox);
    elements.sbContract.addEventListener("input", runFormulaSandbox);
    elements.sbBudget.addEventListener("input", runFormulaSandbox);
    elements.sbExpense.addEventListener("input", runFormulaSandbox);
    elements.sbRate.addEventListener("input", runFormulaSandbox);

    // Sync Excel Action
    elements.btnSyncExcel.addEventListener("click", async () => {
        try {
            const res = await securedFetch("/api/reload-excel", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                alert(`Successfully re-synced data from Excel! Total ${data.count} projects reloaded.`);
                loadDashboard();
                loadProjects();
            }
        } catch (err) {
            console.error("Sync error:", err);
        }
    });

    // --- Authentication & Role Restrictions Logic ---
    const loginForm = document.getElementById("login-form");
    const loginUsername = document.getElementById("login-username");
    const loginPassword = document.getElementById("login-password");
    const loginError = document.getElementById("login-error-message");
    const userBadgeContainer = document.getElementById("user-badge-container");
    const userDisplayName = document.getElementById("user-display-name");
    const userRoleTag = document.getElementById("user-role-tag");
    const btnLogout = document.getElementById("btn-logout");

    // securedFetch wrapper to handle authorization errors globally
    async function securedFetch(url, options = {}) {
        try {
            const res = await fetch(url, options);
            if (res.status === 401) {
                showLoginScreen();
                throw new Error("Unauthorized - session expired");
            }
            if (res.status === 403) {
                alert("คุณไม่มีสิทธิ์ดำเนินการในส่วนนี้ (Forbidden)");
                throw new Error("Forbidden - insufficient permissions");
            }
            return res;
        } catch (err) {
            console.error(`Fetch error for ${url}:`, err);
            throw err;
        }
    }

    async function checkAuth() {
        try {
            const res = await fetch("/api/me");
            if (res.status === 401) {
                showLoginScreen();
                return;
            }
            const data = await res.json();
            if (data.success) {
                state.user = data.user;
                document.body.classList.add("logged-in");
                
                // Show user badge
                userBadgeContainer.style.display = "flex";
                userDisplayName.textContent = state.user.name;
                userRoleTag.textContent = state.user.role.toUpperCase();
                userRoleTag.className = `role-tag ${state.user.role}`;
                
                // Apply global role-based UI visibility
                applyGlobalRoleRestrictions();
                
                // Load active tab data
                const activeBtn = document.querySelector(".nav-btn.active");
                const activeTab = activeBtn ? activeBtn.getAttribute("data-tab") : "dashboard-tab";
                if (activeTab === "dashboard-tab") loadDashboard();
                if (activeTab === "projects-tab") loadProjects();
                if (activeTab === "forecast-tab") loadForecasts();
            } else {
                showLoginScreen();
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            showLoginScreen();
        }
    }

    function showLoginScreen() {
        state.user = null;
        document.body.classList.remove("logged-in");
        userBadgeContainer.style.display = "none";
        if (loginError) loginError.style.display = "none";
        if (loginPassword) loginPassword.value = "";
    }

    function applyGlobalRoleRestrictions() {
        if (!state.user) return;
        
        const syncExcelBtn = document.getElementById("btn-sync-excel");
        const newProjectBtn = document.getElementById("btn-new-project");
        const sandboxTabBtn = document.querySelector('[data-tab="formulas-tab"]');
        
        if (state.user.role === "admin") {
            if (syncExcelBtn) syncExcelBtn.style.display = "inline-flex";
            if (newProjectBtn) newProjectBtn.style.display = "inline-flex";
            if (sandboxTabBtn) sandboxTabBtn.style.display = "flex";
        } else if (state.user.role === "editor") {
            if (syncExcelBtn) syncExcelBtn.style.display = "none";
            if (newProjectBtn) newProjectBtn.style.display = "none";
            if (sandboxTabBtn) sandboxTabBtn.style.display = "flex";
        } else if (state.user.role === "viewer") {
            if (syncExcelBtn) syncExcelBtn.style.display = "none";
            if (newProjectBtn) newProjectBtn.style.display = "none";
            if (sandboxTabBtn) sandboxTabBtn.style.display = "none";
            
            // If currently on formulas tab, switch to dashboard
            const activeBtn = document.querySelector(".nav-btn.active");
            if (activeBtn && activeBtn.getAttribute("data-tab") === "formulas-tab") {
                const dashboardBtn = document.querySelector('[data-tab="dashboard-tab"]');
                if (dashboardBtn) dashboardBtn.click();
            }
        }
    }

    // Login Form Submit
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = loginUsername.value.trim();
            const password = loginPassword.value;
            
            try {
                const res = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (res.status === 200 && data.success) {
                    loginUsername.value = "";
                    loginPassword.value = "";
                    if (loginError) loginError.style.display = "none";
                    checkAuth();
                } else {
                    if (loginError) {
                        loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.message || 'Login failed'}`;
                        loginError.style.display = "flex";
                    }
                }
            } catch (err) {
                console.error("Login request failed:", err);
                if (loginError) {
                    loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์`;
                    loginError.style.display = "flex";
                }
            }
        });
    }

    // Logout Action
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            try {
                await fetch("/api/logout", { method: "POST" });
                showLoginScreen();
            } catch (err) {
                console.error("Logout failed:", err);
                showLoginScreen();
            }
        });
    }

    // Initial App Load
    checkAuth();
    runFormulaSandbox();
});
