import unittest
from cost_engine import (
    calculate_budget_profit_pct,
    calculate_gross_profit_amount,
    calculate_gross_profit_pct,
    calculate_category_expenses,
    calculate_category_balance,
    calculate_incentive_share,
    calculate_project_metrics
)

class TestCostEngineFormulas(unittest.TestCase):

    def test_budget_profit_pct(self):
        # Contract = 66,000, Budget = 56,000
        # Profit % = (66000 - 56000) / 66000 = 10000 / 66000 = 0.1515
        self.assertAlmostEqual(calculate_budget_profit_pct(66000, 56000), 0.1515, places=4)

    def test_gross_profit_amount(self):
        # Contract = 66,000, Expenses = 42,000
        # Gross profit = 24,000
        self.assertEqual(calculate_gross_profit_amount(66000, 42000), 24000.0)

    def test_category_expenses_sumif(self):
        items = [
            {'material_number': 10, 'amount': 5000},
            {'material_number': 10, 'amount': 3000},
            {'material_number': 20, 'amount': 15000},
            {'material_number': 90, 'amount': 1200}
        ]
        # SUMIF code 10 = 5000 + 3000 = 8000
        self.assertEqual(calculate_category_expenses(items, 10), 8000.0)
        # SUMIF code 20 = 15000
        self.assertEqual(calculate_category_expenses(items, 20), 15000.0)

    def test_incentive_share(self):
        # Gross profit = 20,000, rate = 25% -> 5,000
        self.assertEqual(calculate_incentive_share(20000), 5000.0)

    def test_project_metrics_rollup(self):
        project = {
            'contract_price': 100000,
            'budget_price': 80000,
            'budget_categories': [
                {'code': 10, 'description': 'MATERIALS', 'budget': 30000},
                {'code': 20, 'description': 'SUB CONTRACTOR', 'budget': 50000}
            ],
            'expense_items': [
                {'material_number': 10, 'amount': 12000},
                {'material_number': 10, 'amount': 8000},
                {'material_number': 20, 'amount': 40000}
            ]
        }
        res = calculate_project_metrics(project)
        self.assertEqual(res['total_actual_expenses'], 60000.0)
        self.assertEqual(res['gross_profit_amount'], 40000.0)
        self.assertEqual(res['gross_profit_pct'], 0.4)
        self.assertEqual(res['remaining_budget'], 20000.0)
        self.assertEqual(res['incentive_share'], 10000.0)

if __name__ == '__main__':
    unittest.main()
