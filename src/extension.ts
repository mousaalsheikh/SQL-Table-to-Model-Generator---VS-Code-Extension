import * as vscode from 'vscode';
import { getDocumentLanguage, renderOutput } from './generators';
import { parseCreateTable } from './parser';
import { DatabaseDialectOption, NamingStyle, TargetLanguageOption } from './types';

type GeneratorRequest = {
  dialect: DatabaseDialectOption;
  namingStyle: NamingStyle;
  targetLanguage: TargetLanguageOption;
  sql: string;
};

class GeneratorViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly item = new vscode.TreeItem('Open Generator', vscode.TreeItemCollapsibleState.None);

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (element) {
      return [];
    }

    this.item.description = 'Launch the SQL model generator';
    this.item.tooltip = 'Open the SQL Table to Model Generator panel';
    this.item.command = {
      command: 'sqlModelForge.generateModels',
      title: 'Open Generator'
    };
    this.item.contextValue = 'sqlModelForge.openGenerator';

    return [this.item];
  }
}

function getInitialSql(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return DEFAULT_SQL;
  }

  const { document, selection } = editor;
  const selectedSql = document.getText(selection).trim();
  if (selectedSql) {
    return selectedSql;
  }

  const fullDocumentSql = document.getText().trim();
  return fullDocumentSql || DEFAULT_SQL;
}

const DEFAULT_SQL = `CREATE TABLE dbo.CustomerOrders (
    OrderId INT NOT NULL PRIMARY KEY,
    CustomerName NVARCHAR(100) NOT NULL,
    TotalAmount DECIMAL(18,2) NULL,
    CreatedAt DATETIME NOT NULL
);`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDefaultFormState(initialSql: string): GeneratorRequest {
  return {
    dialect: 'auto',
    namingStyle: 'original',
    targetLanguage: 'all',
    sql: initialSql
  };
}

function getWebviewContent(webview: vscode.Webview, initialSql: string): string {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const defaultSql = escapeHtml(initialSql);
  const defaultState = JSON.stringify(getDefaultFormState(initialSql));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <title>SQL Table to Model Generator</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --panel: #111827;
      --panel-alt: #1f2937;
      --border: #334155;
      --text: #e5e7eb;
      --muted: #94a3b8;
      --accent: #f59e0b;
      --accent-strong: #d97706;
      --input: #020617;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: Consolas, 'SF Mono', Monaco, monospace;
      background:
        radial-gradient(circle at top right, rgba(245, 158, 11, 0.18), transparent 28%),
        linear-gradient(180deg, var(--bg), #020617 100%);
      color: var(--text);
    }
    .shell {
      max-width: 980px;
      margin: 0 auto;
      border: 1px solid var(--border);
      background: rgba(17, 24, 39, 0.94);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }
    .header {
      padding: 24px 22px 20px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      background:
        linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(15, 23, 42, 0) 42%),
        linear-gradient(180deg, rgba(30, 41, 59, 0.9), rgba(17, 24, 39, 0.88));
    }
    .header-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      margin-bottom: 12px;
      border: 1px solid rgba(245, 158, 11, 0.28);
      background: rgba(245, 158, 11, 0.08);
      color: #fbbf24;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .header h1 {
      margin: 0 0 6px;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
      max-width: 700px;
    }
    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    form {
      display: grid;
      gap: 18px;
      padding: 22px;
    }
    .row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    label {
      display: grid;
      gap: 8px;
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    select, textarea, button {
      font: inherit;
    }
    select, textarea {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--input);
      color: var(--text);
      padding: 12px;
    }
    select {
      min-height: 44px;
    }
    textarea {
      min-height: 320px;
      resize: vertical;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    button {
      border: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      color: #111827;
      padding: 12px 18px;
      font-weight: 700;
      cursor: pointer;
    }
    button.secondary {
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
    }
    .hint {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .status {
      min-height: 20px;
      font-size: 13px;
      color: #fca5a5;
    }
    .footer {
      padding: 0 22px 22px;
      color: var(--muted);
      font-size: 12px;
    }
    .footer a {
      color: #fbbf24;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    @media (max-width: 720px) {
      body { padding: 12px; }
      .row { grid-template-columns: 1fr; }
      form { padding: 16px; }
      .footer { padding: 0 16px 16px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <div class="header-top">
        <div>
          <div class="eyebrow">SQL Model Generator</div>
          <h1>Generate typed models from a table script</h1>
          <p>Paste a CREATE TABLE script, choose the database, naming style, and output target, then generate without losing the current form values.</p>
        </div>
        <div class="header-actions">
          <button type="submit" form="generator-form">Generate</button>
          <button type="button" class="secondary" id="resetForm">Reset</button>
        </div>
      </div>
    </div>
    <form id="generator-form">
      <div class="row">
        <label>
          Database Type
          <select id="dialect">
            <option value="auto">Auto detect</option>
            <option value="sqlserver">SQL Server</option>
            <option value="mysql">MySQL</option>
            <option value="oracle">Oracle</option>
          </select>
        </label>
        <label>
          Naming Option
          <select id="namingStyle">
            <option value="original">Keep original</option>
            <option value="pascal">PascalCase</option>
            <option value="camel">camelCase</option>
            <option value="snake">snake_case</option>
          </select>
        </label>
        <label>
          Output Language
          <select id="targetLanguage">
            <option value="all">All outputs</option>
            <option value="csharp">C#</option>
            <option value="typescript">TypeScript</option>
            <option value="json">JSON</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
        </label>
      </div>
      <label>
        Table Script
        <textarea id="sql" spellcheck="false">${defaultSql}</textarea>
      </label>
      <div class="actions">
        <div class="hint">Choose a single output language or keep all outputs in one Markdown document.</div>
      </div>
      <div class="status" id="status"></div>
    </form>
    <div class="footer">
      Built by <a href="https://kenzi.ai" id="kenziLink">Kenzi AI</a>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const form = document.getElementById('generator-form');
    const status = document.getElementById('status');
    const resetButton = document.getElementById('resetForm');
    const kenziLink = document.getElementById('kenziLink');
    const defaultState = ${defaultState};

    function currentState() {
      return {
        dialect: document.getElementById('dialect').value,
        namingStyle: document.getElementById('namingStyle').value,
        targetLanguage: document.getElementById('targetLanguage').value,
        sql: document.getElementById('sql').value
      };
    }

    function applyState(state) {
      const next = state || defaultState;
      document.getElementById('dialect').value = next.dialect;
      document.getElementById('namingStyle').value = next.namingStyle;
      document.getElementById('targetLanguage').value = next.targetLanguage;
      document.getElementById('sql').value = next.sql;
    }

    const savedState = vscode.getState();
    if (savedState) {
      applyState(savedState);
    }

    function persistState() {
      vscode.setState(currentState());
    }

    ['dialect', 'namingStyle', 'targetLanguage', 'sql'].forEach((id) => {
      const element = document.getElementById(id);
      element.addEventListener('input', persistState);
      element.addEventListener('change', persistState);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      status.textContent = '';
      status.style.color = '#86efac';
      persistState();
      vscode.postMessage({
        type: 'generate',
        payload: currentState()
      });
    });
    resetButton.addEventListener('click', () => {
      applyState(defaultState);
      status.textContent = '';
      status.style.color = '#fca5a5';
      persistState();
    });
    kenziLink.addEventListener('click', (event) => {
      event.preventDefault();
      vscode.postMessage({
        type: 'openExternal',
        payload: {
          url: 'https://kenzi.ai'
        }
      });
    });
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'error') {
        status.textContent = message.value;
        status.style.color = '#fca5a5';
      } else if (message.type === 'success') {
        status.textContent = message.value;
        status.style.color = '#86efac';
      }
    });
  </script>
</body>
</html>`;
}

async function openGeneratedDocument(content: string, language: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language,
    content
  });

  await vscode.window.showTextDocument(document, {
    preview: false,
    preserveFocus: true,
    viewColumn: vscode.ViewColumn.Beside
  });
}

async function handleGenerateRequest(panel: vscode.WebviewPanel, request: GeneratorRequest): Promise<void> {
  const sql = request.sql.trim();
  if (!sql) {
    panel.webview.postMessage({
      type: 'error',
      value: 'Paste a CREATE TABLE statement first.'
    });
    return;
  }

  try {
    const table = parseCreateTable(sql, request.dialect);
    const content = renderOutput(table, {
      namingStyle: request.namingStyle,
      targetLanguage: request.targetLanguage
    });

    await openGeneratedDocument(content, getDocumentLanguage(request.targetLanguage));
    panel.webview.postMessage({
      type: 'success',
      value: 'Models generated.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model generation failed.';
    panel.webview.postMessage({
      type: 'error',
      value: message
    });
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const viewProvider = new GeneratorViewProvider();
  const disposable = vscode.commands.registerCommand('sqlModelForge.generateModels', async () => {
    const initialSql = getInitialSql();
    const panel = vscode.window.createWebviewPanel(
      'sqlModelForge.generator',
      'SQL Table to Model Generator',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, initialSql);
    panel.webview.onDidReceiveMessage(
      async (message: { type?: string; payload?: GeneratorRequest | { url?: string } }) => {
        if (message.type === 'generate' && message.payload) {
          await handleGenerateRequest(panel, message.payload as GeneratorRequest);
        } else if (message.type === 'openExternal') {
          const url = (message.payload as { url?: string } | undefined)?.url;
          if (url) {
            await vscode.env.openExternal(vscode.Uri.parse(url));
          }
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(vscode.window.registerTreeDataProvider('sqlModelForge.startView', viewProvider));
}

export function deactivate(): void {}
