"""
PJ Cost Record - Flask Web Application Backend
Serves RESTful APIs for Dashboard statistics, Projects CRUD, Expense items management,
Category definitions, Cashflow forecasts, and Formula Engine calculations.
"""

from flask import Flask, render_template, jsonify, request
import data_manager
from cost_engine import calculate_project_metrics

app = Flask(__name__, template_folder="templates", static_folder="static")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/categories", methods=["GET"])
def get_categories():
    db = data_manager.get_db()
    return jsonify({"success": True, "categories": db.get("categories", [])})

@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    db = data_manager.get_db()
    projects = db.get("projects", [])
    categories = db.get("categories", [])
    forecasts = db.get("forecasts", [])

    total_contract = sum(p.get("contract_price", 0.0) for p in projects)
    total_budget = sum(p.get("budget_price", 0.0) for p in projects)
    total_expenses = sum(p.get("total_actual_expenses", 0.0) for p in projects)
    total_gross_profit = sum(p.get("gross_profit_amount", 0.0) for p in projects)
    overall_profit_pct = round(total_gross_profit / total_contract, 4) if total_contract > 0 else 0.0

    status_counts = {"In Progress": 0, "Completed": 0, "Pending": 0}
    for p in projects:
        st = p.get("status", "In Progress")
        status_counts[st] = status_counts.get(st, 0) + 1

    # Category expense totals across all projects
    category_expenses = {c["code"]: {"name": c["name"], "budget": 0.0, "expense": 0.0} for c in categories}
    for p in projects:
        for cat in p.get("budget_categories", []):
            code = cat.get("code")
            if code in category_expenses:
                category_expenses[code]["budget"] += cat.get("budget", 0.0)
                category_expenses[code]["expense"] += cat.get("expense", 0.0)

    # Top profitable projects
    top_projects = sorted(projects, key=lambda x: x.get("gross_profit_amount", 0.0), reverse=True)[:5]

    return jsonify({
        "success": True,
        "metrics": {
            "total_projects": len(projects),
            "total_contract": round(total_contract, 2),
            "total_budget": round(total_budget, 2),
            "total_expenses": round(total_expenses, 2),
            "total_gross_profit": round(total_gross_profit, 2),
            "overall_profit_pct": overall_profit_pct,
            "status_counts": status_counts
        },
        "category_expenses": category_expenses,
        "top_projects": [
            {
                "id": p["id"],
                "job_code": p.get("job_code"),
                "project_name": p.get("project_name"),
                "client_name": p.get("client_name"),
                "contract_price": p.get("contract_price"),
                "gross_profit_amount": p.get("gross_profit_amount"),
                "gross_profit_pct": p.get("gross_profit_pct")
            }
            for p in top_projects
        ],
        "forecasts": forecasts
    })

@app.route("/api/projects", methods=["GET"])
def get_projects():
    db = data_manager.get_db()
    projects = db.get("projects", [])

    search_q = request.args.get("q", "").strip().lower()
    status_filter = request.args.get("status", "").strip()
    client_filter = request.args.get("client", "").strip()

    filtered = []
    for p in projects:
        if status_filter and p.get("status") != status_filter:
            continue
        if client_filter and client_filter.lower() not in p.get("client_name", "").lower():
            continue
        if search_q:
            match_q = (
                search_q in p.get("job_code", "").lower() or
                search_q in p.get("project_name", "").lower() or
                search_q in p.get("client_name", "").lower() or
                search_q in p.get("offer_no", "").lower() or
                search_q in p.get("description", "").lower()
            )
            if not match_q:
                continue
        filtered.append(p)

    return jsonify({"success": True, "count": len(filtered), "projects": filtered})

@app.route("/api/projects/<project_id>", methods=["GET"])
def get_project_detail(project_id):
    pj = data_manager.get_project_by_id(project_id)
    if not pj:
        return jsonify({"success": False, "message": "Project not found"}), 404
    return jsonify({"success": True, "project": pj})

@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.json or {}
    if not data.get("project_name") or not data.get("job_code"):
        return jsonify({"success": False, "message": "Project Name and Job Code are required"}), 400

    categories = data_manager.get_db().get("categories", [])
    default_cat_breakdown = [
        {"code": c["code"], "description": c["name"], "budget": 0.0, "expense": 0.0, "balance": 0.0}
        for c in categories
    ]

    new_pj = {
        "id": f"PJ-{len(data_manager.get_db().get('projects', []))+1:03d}",
        "job_code": data.get("job_code"),
        "offer_no": data.get("offer_no", ""),
        "client_name": data.get("client_name", ""),
        "project_name": data.get("project_name"),
        "description": data.get("description", ""),
        "status": data.get("status", "In Progress"),
        "start_date": data.get("start_date", ""),
        "contract_price": float(data.get("contract_price") or 0.0),
        "budget_price": float(data.get("budget_price") or 0.0),
        "expense_items": [],
        "budget_categories": data.get("budget_categories") or default_cat_breakdown
    }

    saved = data_manager.save_project(new_pj)
    return jsonify({"success": True, "message": "Project created successfully", "project": saved}), 201

@app.route("/api/projects/<project_id>", methods=["PUT"])
def update_project(project_id):
    pj = data_manager.get_project_by_id(project_id)
    if not pj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    data = request.json or {}
    pj["job_code"] = data.get("job_code", pj.get("job_code"))
    pj["offer_no"] = data.get("offer_no", pj.get("offer_no"))
    pj["client_name"] = data.get("client_name", pj.get("client_name"))
    pj["project_name"] = data.get("project_name", pj.get("project_name"))
    pj["description"] = data.get("description", pj.get("description"))
    pj["status"] = data.get("status", pj.get("status"))
    pj["start_date"] = data.get("start_date", pj.get("start_date"))
    pj["contract_price"] = float(data.get("contract_price", pj.get("contract_price")))
    pj["budget_price"] = float(data.get("budget_price", pj.get("budget_price")))

    if "budget_categories" in data:
        pj["budget_categories"] = data["budget_categories"]

    saved = data_manager.save_project(pj)
    return jsonify({"success": True, "message": "Project updated successfully", "project": saved})

@app.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project_route(project_id):
    pj = data_manager.get_project_by_id(project_id)
    if not pj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    data_manager.delete_project(project_id)
    return jsonify({"success": True, "message": "Project deleted successfully"})

@app.route("/api/projects/<project_id>/items", methods=["POST"])
def add_expense_item(project_id):
    pj = data_manager.get_project_by_id(project_id)
    if not pj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    data = request.json or {}
    items = pj.get("expense_items", [])
    new_item = {
        "item_id": f"item_{len(items)+10}_{int(request.date.timestamp() if hasattr(request, 'date') else 100)}",
        "vendor": data.get("vendor", ""),
        "material_number": int(data.get("material_number") or 90),
        "description": data.get("description", ""),
        "text_quo": data.get("text_quo", ""),
        "amount": float(data.get("amount") or 0.0),
        "updated_by": data.get("updated_by", ""),
        "date": data.get("date", ""),
        "po": data.get("po", "")
    }

    items.append(new_item)
    pj["expense_items"] = items
    saved = data_manager.save_project(pj)
    return jsonify({"success": True, "message": "Expense item added", "project": saved}), 201

@app.route("/api/projects/<project_id>/items/<item_id>", methods=["PUT"])
def update_expense_item(project_id, item_id):
    pj = data_manager.get_project_by_id(project_id)
    if not pj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    items = pj.get("expense_items", [])
    data = request.json or {}
    found = False

    for item in items:
        if item.get("item_id") == item_id:
            item["vendor"] = data.get("vendor", item.get("vendor"))
            item["material_number"] = int(data.get("material_number", item.get("material_number")))
            item["description"] = data.get("description", item.get("description"))
            item["text_quo"] = data.get("text_quo", item.get("text_quo"))
            item["amount"] = float(data.get("amount", item.get("amount")))
            item["updated_by"] = data.get("updated_by", item.get("updated_by"))
            item["date"] = data.get("date", item.get("date"))
            item["po"] = data.get("po", item.get("po"))
            found = True
            break

    if not found:
        return jsonify({"success": False, "message": "Expense item not found"}), 404

    pj["expense_items"] = items
    saved = data_manager.save_project(pj)
    return jsonify({"success": True, "message": "Expense item updated", "project": saved})

@app.route("/api/projects/<project_id>/items/<item_id>", methods=["DELETE"])
def delete_expense_item(project_id, item_id):
    pj = data_manager.get_project_by_id(project_id)
    if not pj:
        return jsonify({"success": False, "message": "Project not found"}), 404

    items = [it for it in pj.get("expense_items", []) if it.get("item_id") != item_id]
    pj["expense_items"] = items
    saved = data_manager.save_project(pj)
    return jsonify({"success": True, "message": "Expense item deleted", "project": saved})

@app.route("/api/reload-excel", methods=["POST"])
def reload_excel():
    db = data_manager.parse_excel_to_db()
    return jsonify({"success": True, "message": "Reloaded data from Excel workbook", "count": len(db.get("projects", []))})

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

