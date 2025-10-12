# Explainable AI Module — Decision Tree + SHAP + LIME
# - Trains a simple model
# - Generates global + local explanations
# - Saves artifacts into xai/docs/

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # write plots without opening a window
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay

import shap
from lime.lime_tabular import LimeTabularExplainer
import dtreeviz

# --- Paths
BASE_DIR = os.path.dirname(__file__)
DOCS_DIR = os.path.join(BASE_DIR, "docs")
CSV_PATH = os.path.join(BASE_DIR, "orders.csv")
os.makedirs(DOCS_DIR, exist_ok=True)

# Criar dados aleatorios no orders.csv se estiver vazio ou não existir
def generate_synthetic_orders(path: str, n: int = 500, seed: int = 42) -> None:
    rng = np.random.default_rng(seed)
    total_value = rng.normal(150, 60, n).clip(10, 600)
    delivery_hours = rng.integers(1, 7, n)
    items_count = rng.integers(1, 12, n)
    is_frequent_customer = rng.integers(0, 2, n)

    # Regra simulada: menor valor + mais horas + mais itens + não frequente => maior cancelamento
    logit = (
        -1.2
        + (-0.01 * total_value)
        + (0.32 * delivery_hours) 
        + (0.12 * items_count)
        + (-0.8 * is_frequent_customer)
    )
    prob = 1 / (1 + np.exp(-logit))
    canceled = (rng.uniform(0, 1, n) < prob).astype(int)

    pd.DataFrame({
        "total_value": np.round(total_value, 2),
        "delivery_hours": delivery_hours,
        "items_count": items_count,
        "is_frequent_customer": is_frequent_customer,
        "canceled": canceled
    }).to_csv(path, index=False)


def ensure_orders_csv() -> None:
    if not os.path.exists(CSV_PATH) or os.path.getsize(CSV_PATH) == 0:
        generate_synthetic_orders(CSV_PATH)


ensure_orders_csv()

# Carregar dados do CSV
data = pd.read_csv(CSV_PATH)
required_cols = ["total_value", "delivery_hours", "items_count", "is_frequent_customer", "canceled"]
missing = [c for c in required_cols if c not in data.columns]
if missing:
    raise ValueError(f"Missing columns in CSV: {missing}")

X = data[["total_value", "delivery_hours", "items_count", "is_frequent_customer"]]
y = data["canceled"].astype(int)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)

# Treinar arvore de decisão simples
model = DecisionTreeClassifier(max_depth=7, random_state=42, class_weight="balanced")
model.fit(X_train, y_train)

# --- Evaluate
y_pred = model.predict(X_test)
print("\n=== Metrics ===")
print(classification_report(y_test, y_pred, target_names=["not_canceled", "canceled"]))

cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["No", "Yes"])
disp.plot(values_format="d")
plt.title("Confusion Matrix - Decision Tree")
plt.tight_layout()
plt.savefig(os.path.join(DOCS_DIR, "confusion_matrix.png"), dpi=200)
plt.close()

plt.figure(figsize=(12, 7))
plot_tree(
    model,
    feature_names=X.columns,
    class_names=["No", "Yes"],
    filled=True,
    rounded=True,
    fontsize=9
)
plt.title("Decision Tree (max_depth=4)")
plt.tight_layout()
plt.savefig(os.path.join(DOCS_DIR, "decision_tree.png"), dpi=200)
plt.close()

# Visualização da arvore de decisão
try:
    viz_model = dtreeviz.model(
        model,
        X_train=X_train,
        y_train=y_train,
        feature_names=X.columns.tolist(),
        target_name="Order Status",
        class_names=["Delivered", "Canceled"]
    )

    v = viz_model.view()  # Renderiza o SVG na memoria
    svg_path = os.path.join(DOCS_DIR, "decision_tree_viz.svg")
    v.save(svg_path)
    print(f"✅ Graphviz render complete:\n- {svg_path}")

except Exception as e:
    print(f"⚠️ Warning (Graphviz render): {e}")

# SHAP explanations (global + local)
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

# Global summary
shap.summary_plot(shap_values, X_test, show=False)
plt.tight_layout()
plt.savefig(os.path.join(DOCS_DIR, "shap_summary.png"), dpi=200, bbox_inches="tight")
plt.close()

# Force plot local
try:
    idx = 0
    force = shap.force_plot(
        explainer.expected_value[1],
        shap_values[1][idx],
        X_test.iloc[idx],
        matplotlib=False
    )
    shap.save_html(os.path.join(DOCS_DIR, "shap_force.html"), force)
except Exception as e:
    print(f"Warning (SHAP force plot): {e}")

# LIME
lime_explainer = LimeTabularExplainer(
    training_data=X_train.values,
    feature_names=X.columns.tolist(),
    class_names=["not_canceled", "canceled"],
    mode="classification",
    discretize_continuous=True
)
lime_exp = lime_explainer.explain_instance(
    X_test.iloc[0].values,
    model.predict_proba,
    num_features=X.shape[1]
)
lime_exp.save_to_file(os.path.join(DOCS_DIR, "lime_example.html"))

# Resumo resultados
print("\n=== Files generated ===")
for f in sorted(os.listdir(DOCS_DIR)):
    print(f"- {os.path.join('docs', f)}")