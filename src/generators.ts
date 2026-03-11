import { toSafeIdentifier } from './naming';
import { getTypeMap } from './typeMaps';
import { GenerateOptions, TableDefinition, TargetLanguage, TargetLanguageOption } from './types';

function normalizeTypeName(typeName: string): string {
  return typeName.toLowerCase().replace(/\s+/g, ' ').trim();
}

function getBaseType(typeName: string): string {
  return normalizeTypeName(typeName).split('(')[0].trim();
}

function mapType(typeName: string, dialectTypeMap: Record<string, string>, fallback: string): string {
  const normalized = normalizeTypeName(typeName);
  const base = getBaseType(typeName);
  return dialectTypeMap[normalized] ?? dialectTypeMap[base] ?? fallback;
}

function inferFallbackType(typeName: string, target: TargetLanguage): string {
  const normalized = normalizeTypeName(typeName);
  const base = getBaseType(typeName);

  const isBinary =
    /\b(binary|varbinary|blob|bytea|raw|image|bfile|long raw|rowversion|timestamp)\b/.test(normalized);
  if (isBinary) {
    switch (target) {
      case 'csharp':
        return 'byte[]';
      case 'typescript':
        return 'Uint8Array';
      case 'python':
        return 'bytes';
      case 'java':
        return 'byte[]';
      case 'json':
        return 'string';
    }
  }

  const isBoolean = /\b(bool|boolean|bit)\b/.test(base);
  if (isBoolean) {
    switch (target) {
      case 'csharp':
        return 'bool';
      case 'typescript':
        return 'boolean';
      case 'python':
        return 'bool';
      case 'java':
        return 'Boolean';
      case 'json':
        return 'boolean';
    }
  }

  const isJson = /\b(json|jsonb)\b/.test(base);
  if (isJson) {
    switch (target) {
      case 'csharp':
        return 'string';
      case 'typescript':
        return 'any';
      case 'python':
        return 'dict';
      case 'java':
        return 'Object';
      case 'json':
        return 'object';
    }
  }

  const isUuid = /\b(uuid|guid|uniqueidentifier)\b/.test(base);
  if (isUuid) {
    switch (target) {
      case 'csharp':
        return 'Guid';
      case 'typescript':
        return 'string';
      case 'python':
        return 'str';
      case 'java':
        return 'UUID';
      case 'json':
        return 'string';
    }
  }

  const isTemporal = /\b(date|time|timestamp|datetime|interval|year)\b/.test(base);
  if (isTemporal) {
    switch (target) {
      case 'csharp':
        return /\btime\b/.test(base) && !/\bdatetime|timestamp\b/.test(base) ? 'TimeSpan' : 'DateTime';
      case 'typescript':
        return /\bdate\b/.test(base) && !/\btime\b/.test(base) ? 'string' : 'Date';
      case 'python':
        if (/\bdate\b/.test(base) && !/\btime\b/.test(base)) {
          return 'date';
        }
        if (/\btime\b/.test(base) && !/\bdate|datetime|timestamp\b/.test(base)) {
          return 'time';
        }
        return 'datetime';
      case 'java':
        if (/\bdate\b/.test(base) && !/\btime\b/.test(base)) {
          return 'LocalDate';
        }
        if (/\btime\b/.test(base) && !/\bdate|datetime|timestamp\b/.test(base)) {
          return 'LocalTime';
        }
        return 'LocalDateTime';
      case 'json':
        return 'string';
    }
  }

  const isInteger = /\b(bigint|int|integer|smallint|tinyint|mediumint|serial)\b/.test(base);
  if (isInteger) {
    switch (target) {
      case 'csharp':
        return base === 'bigint' ? 'long' : 'int';
      case 'typescript':
        return 'number';
      case 'python':
        return 'int';
      case 'java':
        return base === 'bigint' ? 'Long' : 'Integer';
      case 'json':
        return 'number';
    }
  }

  const isNumeric = /\b(number|decimal|numeric|float|double|real|money|smallmoney|dec)\b/.test(base);
  if (isNumeric) {
    switch (target) {
      case 'csharp':
        return /\bfloat|real\b/.test(base) ? 'double' : 'decimal';
      case 'typescript':
        return 'number';
      case 'python':
        return 'float';
      case 'java':
        return /\bfloat|real\b/.test(base) ? 'Double' : 'BigDecimal';
      case 'json':
        return 'number';
    }
  }

  switch (target) {
    case 'csharp':
      return 'string';
    case 'typescript':
      return 'string';
    case 'python':
      return 'str';
    case 'java':
      return 'String';
    case 'json':
      return 'string';
  }
}

function resolveMappedType(typeName: string, dialectTypeMap: Record<string, string>, target: TargetLanguage): string {
  const normalized = typeName.toLowerCase().replace(/\s+/g, ' ').trim();
  const direct = mapType(normalized, dialectTypeMap, '');
  return direct || inferFallbackType(typeName, target);
}

function nullableSuffix(nullable: boolean, suffix: string): string {
  return nullable ? suffix : '';
}

function generateCSharp(table: TableDefinition, options: GenerateOptions): string {
  const typeMap = getTypeMap(table.dialect, 'csharp');

  const className = toSafeIdentifier(table.normalizedName, options.namingStyle);
  const lines = table.columns.map((column) => {
    const propertyName = toSafeIdentifier(column.normalizedName, options.namingStyle);
    const mappedType = resolveMappedType(column.typeName, typeMap, 'csharp');
    const isReferenceType = mappedType === 'string' || mappedType === 'byte[]';
    const propertyType = isReferenceType ? mappedType : `${mappedType}${nullableSuffix(column.nullable, '?')}`;
    return `    public ${propertyType} ${propertyName} { get; set; }${mappedType === 'string' ? ' = string.Empty;' : ''}`;
  });

  return [`public class ${className}`, '{', ...lines, '}'].join('\n');
}

function generateTypeScript(table: TableDefinition, options: GenerateOptions): string {
  const typeMap = getTypeMap(table.dialect, 'typescript');

  const interfaceName = toSafeIdentifier(table.normalizedName, options.namingStyle);
  const lines = table.columns.map((column) => {
    const propertyName = toSafeIdentifier(column.normalizedName, options.namingStyle);
    const propertyType = resolveMappedType(column.typeName, typeMap, 'typescript');
    const optional = column.nullable ? '?' : '';
    return `  ${propertyName}${optional}: ${propertyType};`;
  });

  return [`export interface ${interfaceName} {`, ...lines, '}'].join('\n');
}

function generateJson(table: TableDefinition, options: GenerateOptions): string {
  const output: Record<string, string | number | boolean | null | object> = {};
  for (const column of table.columns) {
    const propertyName = toSafeIdentifier(column.normalizedName, options.namingStyle);
    const lower = normalizeTypeName(column.typeName);
    if (/\b(int|integer|bigint|smallint|tinyint|mediumint|number|decimal|numeric|float|double|real|money|year|serial)\b/.test(lower)) {
      output[propertyName] = 0;
    } else if (/\b(bit|boolean)\b/.test(lower)) {
      output[propertyName] = false;
    } else if (/\b(json)\b/.test(lower)) {
      output[propertyName] = {};
    } else if (/\b(binary|varbinary|blob|raw|image|rowversion|timestamp)\b/.test(lower)) {
      output[propertyName] = '';
    } else {
      output[propertyName] = column.nullable ? null : '';
    }
  }

  return JSON.stringify(output, null, 2);
}

function generatePython(table: TableDefinition, options: GenerateOptions): string {
  const typeMap = getTypeMap(table.dialect, 'python');

  const className = toSafeIdentifier(table.normalizedName, options.namingStyle);
  const fields = table.columns.map((column) => {
    const propertyName = toSafeIdentifier(column.normalizedName, options.namingStyle);
    const propertyType = resolveMappedType(column.typeName, typeMap, 'python');
    const annotatedType = column.nullable ? `Optional[${propertyType}]` : propertyType;
    return `    ${propertyName}: ${annotatedType}`;
  });

  return [
    'from dataclasses import dataclass',
    'from datetime import date, datetime, time',
    'from typing import Optional',
    '',
    '@dataclass',
    `class ${className}:`,
    ...(fields.length > 0 ? fields : ['    pass'])
  ].join('\n');
}

function generateJava(table: TableDefinition, options: GenerateOptions): string {
  const typeMap = getTypeMap(table.dialect, 'java');

  const className = toSafeIdentifier(table.normalizedName, options.namingStyle);
  const fields = table.columns.map((column) => {
    const propertyName = toSafeIdentifier(column.normalizedName, options.namingStyle);
    const propertyType = resolveMappedType(column.typeName, typeMap, 'java');
    return `    private ${propertyType} ${propertyName};`;
  });

  return [
    'import java.math.BigDecimal;',
    'import java.time.LocalDate;',
    'import java.time.LocalDateTime;',
    'import java.time.LocalTime;',
    'import java.time.OffsetDateTime;',
    'import java.util.UUID;',
    '',
    `public class ${className} {`,
    ...fields,
    '}'
  ].join('\n');
}

export function generateTarget(table: TableDefinition, target: TargetLanguage, options: GenerateOptions): string {
  switch (target) {
    case 'csharp':
      return generateCSharp(table, options);
    case 'typescript':
      return generateTypeScript(table, options);
    case 'json':
      return generateJson(table, options);
    case 'python':
      return generatePython(table, options);
    case 'java':
      return generateJava(table, options);
    default:
      throw new Error(`Unsupported target language: ${String(target)}`);
  }
}

export function getDocumentLanguage(target: TargetLanguageOption): string {
  switch (target) {
    case 'all':
      return 'markdown';
    case 'csharp':
      return 'csharp';
    case 'typescript':
      return 'typescript';
    case 'json':
      return 'json';
    case 'python':
      return 'python';
    case 'java':
      return 'java';
  }
}

export function renderOutput(table: TableDefinition, options: GenerateOptions): string {
  const orderedTargets: TargetLanguage[] = ['csharp', 'typescript', 'json', 'python', 'java'];
  const fences: Record<TargetLanguage, string> = {
    csharp: 'csharp',
    typescript: 'ts',
    json: 'json',
    python: 'python',
    java: 'java'
  };

  if (options.targetLanguage !== 'all') {
    return generateTarget(table, options.targetLanguage, options);
  }

  return orderedTargets
    .map((target) => {
      const heading = target === 'csharp' ? 'C#' : target[0].toUpperCase() + target.slice(1);
      return [`## ${heading}`, `\`\`\`${fences[target]}`, generateTarget(table, target, options), '```'].join('\n');
    })
    .join('\n\n');
}
