"""
PJ Cost Record - Formula Calculation Engine (Python)
Translates Excel formulas from Project Cost Record sheets into python functions.
"""

def calculate_budget_profit_pct(contract_price: float, budget_price: float) -> float:
    """
    Excel Formula: =(Contract_Price - Budget_Price) / Contract_Price
    Calculates expected profit percentage based on target budget.
    """
    if not contract_price or contract_price <= 0:
        return 0.0
    return round((contract_price - budget_price) / contract_price, 4)

def calculate_budget_profit_amount(contract_price: float, budget_price: float) -> float:
    """
    Calculates expected profit amount based on budget.
    """
    return round((contract_price or 0.0) - (budget_price or 0.0), 2)

def calculate_gross_profit_amount(contract_price: float, total_actual_expenses: float) -> float:
    """
    Excel Formula: =Contract_Price - Total_Actual_Expense
    Calculates actual gross profit earned.
    """
    return round((contract_price or 0.0) - (total_actual_expenses or 0.0), 2)

def calculate_gross_profit_pct(contract_price: float, gross_profit_amount: float) -> float:
    """
    Excel Formula: =Gross_Profit_Amount / Contract_Price
    Calculates actual gross profit margin.
    """
    if not contract_price or contract_price <= 0:
        return 0.0
    return round(gross_profit_amount / contract_price, 4)

def calculate_category_expenses(expense_items: list, category_code: int) -> float:
    """
    Excel Formula: =SUMIF(Material_Number_Range, Code, Amount_Range)
    Sums up all expense amounts matching a specific JPP material/category code.
    """
    total = 0.0
    for item in expense_items:
        code = item.get('material_number') or item.get('category_code')
        try:
            if int(code) == int(category_code):
                total += float(item.get('amount') or 0.0)
        except (ValueError, TypeError):
            continue
    return round(total, 2)

def calculate_category_balance(category_budget: float, category_expense: float) -> float:
    """
    Excel Formula: =Category_Budget - Category_Expense
    """
    return round((category_budget or 0.0) - (category_expense or 0.0), 2)

def calculate_incentive_share(gross_profit_amount: float, share_rate: float = 0.25) -> float:
    """
    Excel Formula: =Gross_Profit * 0.25
    Calculates project performance incentive (e.g. 25%).
    """
    if not gross_profit_amount or gross_profit_amount <= 0:
        return 0.0
    return round(gross_profit_amount * share_rate, 2)

def calculate_project_metrics(project: dict) -> dict:
    """
    Performs full financial calculations for a project object.
    """
    contract_price = float(project.get('contract_price') or 0.0)
    budget_price = float(project.get('budget_price') or 0.0)
    expense_items = project.get('expense_items') or []
    budget_categories = project.get('budget_categories') or []

    # 1. Total actual expenses from item log
    total_actual_expenses = sum(float(item.get('amount') or 0.0) for item in expense_items)
    total_actual_expenses = round(total_actual_expenses, 2)

    # 2. Update category expense records (SUMIF)
    updated_categories = []
    for cat in budget_categories:
        cat_code = cat.get('code')
        cat_budget = float(cat.get('budget') or 0.0)
        cat_expense = calculate_category_expenses(expense_items, cat_code)
        cat_balance = calculate_category_balance(cat_budget, cat_expense)
        updated_categories.append({
            'code': cat_code,
            'description': cat.get('description'),
            'budget': cat_budget,
            'expense': cat_expense,
            'balance': cat_balance
        })

    # If budget_price was 0, sum from categories total budget
    if budget_price == 0.0 and updated_categories:
        budget_price = sum(cat['budget'] for cat in updated_categories)

    # 3. Key financial metrics
    budget_profit_pct = calculate_budget_profit_pct(contract_price, budget_price)
    budget_profit_amount = calculate_budget_profit_amount(contract_price, budget_price)
    gross_profit_amount = calculate_gross_profit_amount(contract_price, total_actual_expenses)
    gross_profit_pct = calculate_gross_profit_pct(contract_price, gross_profit_amount)
    remaining_budget = round(budget_price - total_actual_expenses, 2)
    incentive_share = calculate_incentive_share(gross_profit_amount)

    return {
        'contract_price': contract_price,
        'budget_price': budget_price,
        'total_actual_expenses': total_actual_expenses,
        'remaining_budget': remaining_budget,
        'budget_profit_pct': budget_profit_pct,
        'budget_profit_amount': budget_profit_amount,
        'gross_profit_amount': gross_profit_amount,
        'gross_profit_pct': gross_profit_pct,
        'incentive_share': incentive_share,
        'budget_categories': updated_categories
    }
