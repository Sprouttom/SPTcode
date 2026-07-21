/**
 * PJ Cost Record - Formula Calculation Engine (JavaScript)
 * Translates Excel sheet formulas into browser functions for real-time frontend recalculations.
 */

const CostEngine = {
    /**
     * Excel Formula: =(Contract_Price - Budget_Price) / Contract_Price
     */
    calculateBudgetProfitPct(contractPrice, budgetPrice) {
        const cp = Number(contractPrice) || 0;
        const bp = Number(budgetPrice) || 0;
        if (cp <= 0) return 0;
        return Number(((cp - bp) / cp).toFixed(4));
    },

    /**
     * Expected profit amount based on budget
     */
    calculateBudgetProfitAmount(contractPrice, budgetPrice) {
        const cp = Number(contractPrice) || 0;
        const bp = Number(budgetPrice) || 0;
        return Number((cp - bp).toFixed(2));
    },

    /**
     * Excel Formula: =Contract_Price - Total_Actual_Expense
     */
    calculateGrossProfitAmount(contractPrice, totalActualExpenses) {
        const cp = Number(contractPrice) || 0;
        const exp = Number(totalActualExpenses) || 0;
        return Number((cp - exp).toFixed(2));
    },

    /**
     * Excel Formula: =Gross_Profit_Amount / Contract_Price
     */
    calculateGrossProfitPct(contractPrice, grossProfitAmount) {
        const cp = Number(contractPrice) || 0;
        const gp = Number(grossProfitAmount) || 0;
        if (cp <= 0) return 0;
        return Number((gp / cp).toFixed(4));
    },

    /**
     * Excel Formula: =SUMIF(Material_Number_Range, Code, Amount_Range)
     */
    calculateCategoryExpenses(expenseItems, categoryCode) {
        if (!Array.isArray(expenseItems)) return 0;
        const codeNum = Number(categoryCode);
        const total = expenseItems.reduce((sum, item) => {
            const itemCode = Number(item.material_number || item.category_code);
            if (itemCode === codeNum) {
                return sum + (Number(item.amount) || 0);
            }
            return sum;
        }, 0);
        return Number(total.toFixed(2));
    },

    /**
     * Excel Formula: =Category_Budget - Category_Expense
     */
    calculateCategoryBalance(categoryBudget, categoryExpense) {
        const bg = Number(categoryBudget) || 0;
        const exp = Number(categoryExpense) || 0;
        return Number((bg - exp).toFixed(2));
    },

    /**
     * Excel Formula: =Gross_Profit * 0.25
     */
    calculateIncentiveShare(grossProfitAmount, shareRate = 0.25) {
        const gp = Number(grossProfitAmount) || 0;
        if (gp <= 0) return 0;
        return Number((gp * shareRate).toFixed(2));
    },

    /**
     * Performs complete real-time client-side calculation for a project object.
     */
    calculateProjectMetrics(project) {
        const contractPrice = Number(project.contract_price) || 0;
        let budgetPrice = Number(project.budget_price) || 0;
        const expenseItems = project.expense_items || [];
        const budgetCategories = project.budget_categories || [];

        // 1. Total actual expenses
        const totalActualExpenses = Number(expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2));

        // 2. Recalculate category balances (SUMIF & Balance)
        const updatedCategories = budgetCategories.map(cat => {
            const catCode = cat.code;
            const catBudget = Number(cat.budget) || 0;
            const catExpense = this.calculateCategoryExpenses(expenseItems, catCode);
            const catBalance = this.calculateCategoryBalance(catBudget, catExpense);
            return {
                ...cat,
                budget: catBudget,
                expense: catExpense,
                balance: catBalance
            };
        });

        if (budgetPrice === 0 && updatedCategories.length > 0) {
            budgetPrice = updatedCategories.reduce((sum, c) => sum + c.budget, 0);
        }

        const budgetProfitPct = this.calculateBudgetProfitPct(contractPrice, budgetPrice);
        const budgetProfitAmount = this.calculateBudgetProfitAmount(contractPrice, budgetPrice);
        const grossProfitAmount = this.calculateGrossProfitAmount(contractPrice, totalActualExpenses);
        const grossProfitPct = this.calculateGrossProfitPct(contractPrice, grossProfitAmount);
        const remainingBudget = Number((budgetPrice - totalActualExpenses).toFixed(2));
        const incentiveShare = this.calculateIncentiveShare(grossProfitAmount);

        return {
            ...project,
            contract_price: contractPrice,
            budget_price: budgetPrice,
            total_actual_expenses: totalActualExpenses,
            remaining_budget: remainingBudget,
            budget_profit_pct: budgetProfitPct,
            budget_profit_amount: budgetProfitAmount,
            gross_profit_amount: grossProfitAmount,
            gross_profit_pct: grossProfitPct,
            incentive_share: incentiveShare,
            budget_categories: updatedCategories
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CostEngine;
}
