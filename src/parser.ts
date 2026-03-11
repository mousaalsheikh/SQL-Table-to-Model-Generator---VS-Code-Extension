import { normalizeIdentifier } from './naming';
import { ColumnDefinition, DatabaseDialect, DatabaseDialectOption, TableDefinition } from './types';

function detectDialect(sql: string): DatabaseDialect {
  const lower = sql.toLowerCase();
  if (/\bnvarchar\b|\bidentity\b|\bgetdate\(\)|\b\[.+?\]/i.test(sql)) {
    return 'sqlserver';
  }

  if (/\bnumber\b|\bvarchar2\b|\bclob\b|\bsysdate\b/i.test(sql)) {
    return 'oracle';
  }

  return 'mysql';
}

function resolveDialect(sql: string, dialect?: DatabaseDialectOption): DatabaseDialect {
  if (!dialect || dialect === 'auto') {
    return detectDialect(sql);
  }

  return dialect;
}

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim();
}

function splitDefinitions(body: string): string[] {
  const items: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of body) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    }

    if (char === ',' && depth === 0) {
      if (current.trim()) {
        items.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items;
}

function extractTableName(sql: string): string {
  const match = sql.match(/create\s+table\s+([^\s(]+(?:\s*\.\s*[^\s(]+)*)/i);
  if (!match) {
    throw new Error('Could not find a CREATE TABLE statement.');
  }

  const rawName = match[1].replace(/\s+/g, '');
  const parts = rawName.split('.');
  return normalizeIdentifier(parts[parts.length - 1]);
}

function extractBody(sql: string): string {
  const createIndex = sql.toLowerCase().indexOf('create table');
  const firstParen = sql.indexOf('(', createIndex);
  if (firstParen === -1) {
    throw new Error('Could not find column definitions in the CREATE TABLE statement.');
  }

  let depth = 0;
  for (let index = firstParen; index < sql.length; index += 1) {
    const char = sql[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return sql.slice(firstParen + 1, index);
      }
    }
  }

  throw new Error('Could not parse the CREATE TABLE column block.');
}

function isConstraintLine(line: string): boolean {
  return /^(constraint|primary\s+key|foreign\s+key|unique|index|key|check)\b/i.test(line);
}

function parsePrimaryKeyColumns(lines: string[]): Set<string> {
  const primaryKeys = new Set<string>();

  for (const line of lines) {
    const match = line.match(/primary\s+key\s*\(([^)]+)\)/i);
    if (!match) {
      continue;
    }

    for (const key of match[1].split(',')) {
      primaryKeys.add(normalizeIdentifier(key));
    }
  }

  return primaryKeys;
}

function parseColumn(line: string, primaryKeys: Set<string>): ColumnDefinition | undefined {
  const cleaned = line.replace(/,$/, '').trim();
  if (!cleaned || isConstraintLine(cleaned)) {
    return undefined;
  }

  const match = cleaned.match(
    /^([`"\[\]\w$#.]+)\s+([a-zA-Z][a-zA-Z0-9_]*(?:\s+[a-zA-Z][a-zA-Z0-9_]*)*(?:\s*\([^)]*\))?)/i
  );
  if (!match) {
    return undefined;
  }

  const name = normalizeIdentifier(match[1]);
  const typeName = match[2].replace(/\s+/g, ' ').trim();
  const nullable = !/\bnot\s+null\b/i.test(cleaned) && !/\bprimary\s+key\b/i.test(cleaned);
  const isPrimaryKey = primaryKeys.has(name) || /\bprimary\s+key\b/i.test(cleaned);

  return {
    originalName: name,
    normalizedName: name,
    typeName,
    nullable,
    isPrimaryKey
  };
}

export function parseCreateTable(sql: string, dialect?: DatabaseDialectOption): TableDefinition {
  const cleanedSql = stripComments(sql);
  const resolvedDialect = resolveDialect(cleanedSql, dialect);
  const tableName = extractTableName(cleanedSql);
  const body = extractBody(cleanedSql);
  const lines = splitDefinitions(body);
  const primaryKeys = parsePrimaryKeyColumns(lines);
  const columns = lines
    .map((line) => parseColumn(line, primaryKeys))
    .filter((column): column is ColumnDefinition => Boolean(column));

  if (columns.length === 0) {
    throw new Error('No columns were detected. Paste a full CREATE TABLE script.');
  }

  return {
    originalName: tableName,
    normalizedName: tableName,
    columns,
    dialect: resolvedDialect
  };
}
