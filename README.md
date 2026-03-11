# SQL Table to Model Generator

**SQL Table to Model Generator** is a VS Code extension by **[Kenzi.ai](https://kenzi.ai)** that converts `CREATE TABLE` scripts from SQL Server, MySQL, and Oracle into model code.

Supported outputs:

- C#
- TypeScript
- JSON
- Python
- Java

Supported naming styles:

- Keep original
- `PascalCase`
- `camelCase`
- `snake_case`

## Features

- Paste a `CREATE TABLE` statement and generate model output in seconds
- Supports SQL Server, MySQL, and Oracle table scripts
- Generates one output target at a time with the appropriate VS Code language mode
- Can also produce a combined Markdown document with all generated targets
- Lets you normalize property names to match your project conventions

## Installation

Install from the VS Code Marketplace:

1. Open **Extensions** in VS Code
2. Search for `SQL Table to Model Generator`
3. Select the extension published by `kenzi-ai`
4. Click **Install**

## Usage

1. Open the Command Palette
2. Run `SQL Table to Model Generator: Generate Models`
3. Paste your `CREATE TABLE` script into the `Table Script` field
4. Choose the `Database Type`
5. Choose the `Naming Option`
6. Choose the `Output Language`
7. Generate either a single model output or a combined Markdown document

You can also launch the generator from the extension sidebar or editor actions when working with SQL files.

## Example Input

```sql
CREATE TABLE dbo.CustomerOrders (
    OrderId INT NOT NULL PRIMARY KEY,
    CustomerName NVARCHAR(100) NOT NULL,
    TotalAmount DECIMAL(18,2) NULL,
    CreatedAt DATETIME NOT NULL
);
```

## Example Output

### C#

```csharp
public class CustomerOrders
{
    public int OrderId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal? TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### TypeScript

```ts
export interface CustomerOrders {
  orderId: number;
  customerName: string;
  totalAmount?: number | null;
  createdAt: string;
}
```

### Python

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class CustomerOrders:
    order_id: int
    customer_name: str
    total_amount: Optional[float] = None
    created_at: str
```

## Supported Inputs

The parser is designed for common `CREATE TABLE` patterns, including:

- Standard column definitions
- Nullability
- Primary key markers
- Common SQL data types in SQL Server, MySQL, and Oracle

## Current Limitations

- Column constraints beyond nullability and primary keys are ignored in generated models
- Foreign keys, indexes, checks, triggers, and other schema-level objects are not represented
- Very complex or vendor-specific DDL variants may not parse correctly yet
- Type mapping relies on local extension rules and fallback type families

## Notes

- This extension is intended to speed up model scaffolding, not replace schema review
- Generated output should still be validated against your project conventions and runtime requirements

## License

[MIT](LICENSE)
