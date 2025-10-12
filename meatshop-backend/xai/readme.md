# 🧠 XAI — MeatShop (Decision Tree + SHAP + LIME + dtreeviz)

IA explicável que analisa e prevê **cancelamentos de pedidos** com base em variáveis do pedido.  
Este módulo utiliza **Decision Tree**, **SHAP**, **LIME** e **dtreeviz** para explicar o modelo.

As saídas gráficas e relatórios são gerados automaticamente dentro da pasta `xai/docs/`.

---

## 📁 Estrutura de pastas

```bash
meatshop-backend/
├─ data/
├─ node_modules/
├─ src/
├─ test/
├─ venv/
├─ xai/
│  ├─ __pycache__/
│  ├─ docs/                  # ← arquivos gerados (imagens, htmls)
│  ├─ orders.csv             # ← dataset sintético (gera automático se não existir)
│  ├─ readme.md          
│  └─ xai.py                 # ← script principal da IA explicável
└─ requirements.txt
```

---

## ⚙️ 1. Pré-requisitos

- **Python 3.10-3.13** (recomendado: 3.13)
- **pip** atualizado:  
  ```bash
  python -m pip install --upgrade pip
  ```
- **Graphviz** instalado (necessário para gerar as árvores)

## Instalar Graphviz
### Windows
```bash
winget install graphviz
```
ou
```bash
choco install graphviz -y
```
Se preferir manualmente: baixe em [graphviz.org/download](https://graphviz.org/download/), instale e adicione ao PATH:
```
C:\Program Files\Graphviz\bin
```
Depois, teste:
```bash
dot -V
```
Se aparecer algo como `dot - graphviz version 14.0.x`, está tudo certo ✅

### Linux (Ubuntu/Debian)
```bash
sudo apt update && sudo apt install graphviz -y
```

### macOS
```bash
brew install graphviz
```

---

## 🧩 2. Criar e ativar o ambiente virtual (venv)

O ambiente virtual isola as dependências da IA sem interferir no resto do sistema.

### Windows (PowerShell)
```powershell
cd "C:\...\meatshop-backend"
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux
```bash
cd /caminho/para/meatshop-backend
python3 -m venv venv
source venv/bin/activate
```

> 💡 Ao ativar o venv, o terminal mostrará `(venv)` no início da linha de comando.

---

## 📦 3. Instalar dependências

Com o ambiente virtual ativo:
```bash
pip install -r requirements.txt
```
Verifique se o `dtreeviz` está atualizado (versão >= 2.5):
```bash
pip show dtreeviz
```

---

## 🚀 4. Executar a IA

A partir da raiz do projeto **meatshop-backend**, execute:
```bash
python xai/xai.py
```

Saída esperada (resumo):
```
=== Metrics ===
...
✅ Graphviz render complete:
- ...\xai\docs\decision_tree_viz.svg

=== Files generated ===
- docs\confusion_matrix.png
- docs\decision_tree.png
- docs\decision_tree_viz.svg
- docs\lime_example.html
- docs\shap_summary.png
```

---

## 🧾 5. Resultados gerados (xai/docs)

| Arquivo | Descrição |
|:----------:|:------------:|
| `decision_tree_viz.svg` | Árvore interativa (dtreeviz) |
| `decision_tree.png` | Árvore simplificada (sklearn) |
| `confusion_matrix.png` | Matriz de confusão |
| `shap_summary.png` | Importância global dos atributos (SHAP) |
| `lime_example.html` | Explicação local (LIME) |

Para abrir (Windows PowerShell):
```bash
ii .\xai\docs\decision_tree_viz.svg
ii .\xai\docs\shap_summary.png
ii .\xai\docs\lime_example.html
```

---

## 🧠 6. Personalização

### a) Ajustar proporção de cancelamentos
No trecho abaixo, altere o valor `-1.2` (quanto mais negativo, menos cancelamentos):
```python
logit = (
    -1.2
    + (-0.01 * total_value)
    + (0.15 * delivery_hours)
    + (0.12 * items_count)
    + (-0.8 * is_frequent_customer)
)
```

### b) Aumentar complexidade da árvore
```python
model = DecisionTreeClassifier(max_depth=6, random_state=42, class_weight="balanced")
```

---

## ❗ 7. Solução de Problemas

| Erro | Causa | Solução |
|:------:|:--------:|:----------:|
| `dot` não reconhecido | Graphviz não está no PATH | Adicione `C:\Program Files\Graphviz\bin` |
| `ImportError: cannot import dtreeviz` | Versão antiga | Atualize: `pip install -U dtreeviz` |
| `Length of features is not equal to shap_values` | Incompatibilidade SHAP | Use `shap.Explainer(model, X_train)` |
| LIME só mostra barras azuis | Exemplo favorece "Delivered" | Teste outro índice (`iloc[20]`) |
| SVG muito pequeno | Escala baixa | Use `scale=2.5` ou defina `width/height` no `save()` |

---

## ⚡ 8. Comandos rápidos (cheat sheet)

```bash
# 1) entrar na pasta
cd meatshop-backend

# 2) criar ambiente virtual
python -m venv venv

# 3) ativar
venv\Scripts\activate    # Windows
# source venv/bin/activate  # Linux/Mac

# 4) instalar libs
pip install -r requirements.txt

# 5) executar IA
python xai/xai.py

# 6) abrir resultados
ii .\xai\docs\decision_tree_viz.svg
```

---

## 🧩 9. Tecnologias utilizadas

| Componente | Finalidade |
|:-------------:|:-------------:|
| **Python 3.13** | Linguagem base |
| **scikit-learn** | Treino da árvore de decisão |
| **dtreeviz** | Visualização interativa da árvore |
| **SHAP** | Interpretação global e local |
| **LIME** | Explicação local por amostra |
| **Matplotlib** | Geração de gráficos auxiliares |

---