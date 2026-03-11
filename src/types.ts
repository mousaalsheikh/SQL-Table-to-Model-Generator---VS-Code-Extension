export type DatabaseDialect = 'sqlserver' | 'mysql' | 'oracle';

export type DatabaseDialectOption = 'auto' | DatabaseDialect;

export type NamingStyle = 'original' | 'pascal' | 'camel' | 'snake';

export type TargetLanguage = 'csharp' | 'typescript' | 'json' | 'python' | 'java';

export type TargetLanguageOption = 'all' | TargetLanguage;

export interface ColumnDefinition {
  originalName: string;
  normalizedName: string;
  typeName: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface TableDefinition {
  originalName: string;
  normalizedName: string;
  columns: ColumnDefinition[];
  dialect: DatabaseDialect;
}

export interface GenerateOptions {
  namingStyle: NamingStyle;
  targetLanguage: TargetLanguageOption;
}
