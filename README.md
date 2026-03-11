# SQL Table to Model Generator

SQL Table to Model Generator is a VS Code extension for developers who want to paste a `CREATE TABLE` script from SQL Server, MySQL, or Oracle and immediately generate model output for:

- C#
- TypeScript
- JSON
- Python
- Java

It also supports property naming styles:

- Keep original
- `PascalCase`
- `camelCase`
- `snake_case`

## Why this name

`SQL Table to Model Generator` is explicit, searchable, and aligned with how developers search the marketplace:

- `sql model`
- `sql to c# class`
- `sql to typescript interface`
- `sql ddl generator`

The extension name is short enough to remember and specific enough to rank for intent-based searches.

## Usage

1. Run `SQL Table to Model Generator: Generate Models` from the Command Palette.
2. Paste your `CREATE TABLE` script into the `Table Script` textarea.
3. Choose the `Database Type`.
4. Choose the `Naming Option`.
5. Choose the `Output Language`.
6. Generate and review either a single output document or the combined Markdown document.

## Example input

```sql
CREATE TABLE dbo.CustomerOrders (
    OrderId INT NOT NULL PRIMARY KEY,
    CustomerName NVARCHAR(100) NOT NULL,
    TotalAmount DECIMAL(18,2) NULL,
    CreatedAt DATETIME NOT NULL
);
```

## Output targets

- C# class
- TypeScript interface
- JSON sample
- Python dataclass
- Java class

You can generate one target at a time with the correct VS Code language mode, or keep the combined Markdown output with every target section.

## Development

```bash
npm install
npm run build
```

Press `F5` in VS Code to launch the Extension Development Host.

## Manual testing in VS Code

There are currently no automated tests in this repo. Test the extension manually:

1. Open this project in VS Code.
2. Press `F5`.
3. A new `Extension Development Host` window will open and, in development mode, the generator panel opens automatically for manual testing.
4. In that new window, press `Cmd+Shift+P` on macOS or `Ctrl+Shift+P` on Windows/Linux.
5. Run `SQL Table to Model Generator: Generate Models`.
6. Paste a `CREATE TABLE` script into the textarea, or use the built-in default SQL already shown in the generator.
7. Pick a database type and naming style.
8. Confirm a new Markdown tab opens with generated C#, TypeScript, JSON, Python, and Java output.

If `F5` opens what looks like an empty window, that is still the correct debug host. Run the command from the Command Palette in that new window, or right-click inside the sample SQL editor and use the context menu command.

## Publish to VS Code Marketplace

1. Create a publisher in Azure DevOps / Visual Studio Marketplace.
2. Update the `publisher` field in `package.json` if needed.
3. Create a Personal Access Token with Marketplace publish rights.
4. Login once:

```bash
npx @vscode/vsce login <publisher-name>
```

5. Package locally:

```bash
npm run package
```

6. Publish:

```bash
npm run publish:marketplace
```

## Notes

- The generator uses local in-repo type maps plus type-family fallbacks for SQL Server, MySQL, and Oracle.
- The parser targets common `CREATE TABLE` patterns for SQL Server, MySQL, and Oracle.
- Column constraints beyond nullability and primary keys are ignored in generated models.
- Complex DDL variants can be added incrementally as needed.
