# AI Development Instructions

## General Guidelines

- **Dark Mode**: Always use dark mode as default. Add all theme variables in [styles.scss](src/styles.scss)
- **Code Reusability**: Always use the least amount of code possible. Reuse functions, components, and models whenever possible
- **DRY Principle**: Don't Repeat Yourself - extract common logic into shared services or utilities

## Type Safety

- **No `any` or `unknown`**: Always use proper types. All models are centralized in [shared/models](src/app/shared/models)
- **Shared Models**: Use existing models from:
  - [transaction.model.ts](src/app/shared/models/transaction.model.ts) - Transaction, Word, ColumnConfig
  - [csv.model.ts](src/app/shared/models/csv.model.ts) - CsvData, CsvRow, CashewTransaction
  - [common.model.ts](src/app/shared/models/common.model.ts) - SelectOption, BankPattern, ConversionFormat, FillColumnRequest, FileInfo

## Component Structure

- **Signals**: Use Angular signals for reactive state management
- **Standalone Components**: All components should be standalone with explicit imports
- **Smart/Dumb Pattern**: Separate container components (logic) from presentational components (display)
- **Shared Components**: Place reusable components in [shared/components](src/app/shared/components)

## Services

- **Single Responsibility**: Each service should have one clear purpose
- **Injectable**: Use `providedIn: 'root'` for singleton services
- **Type Safety**: Always type service methods and return values

## File Organization

```
src/app/
├── components/        # Global components (navbar, etc)
├── pages/            # Route components
├── services/         # Business logic services
└── shared/
    ├── components/   # Reusable UI components
    └── models/       # All TypeScript interfaces and types
```

## Naming Conventions

- **Files**: `kebab-case.component.ts`, `kebab-case.service.ts`, `kebab-case.model.ts`
- **Classes**: `PascalCase`
- **Interfaces**: `PascalCase`
- **Variables/Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

## Best Practices

- Always import types from shared models, never define inline
- Use TypeScript strict mode
- Keep components focused and small (<200 lines)
- Extract complex logic into services
- Use readonly for immutable properties
- Prefer composition over inheritance