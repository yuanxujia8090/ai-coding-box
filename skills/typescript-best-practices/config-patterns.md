# Configuration Patterns

## Core Principles

- Load config from environment variables at startup; validate with Zod before use. Invalid config should crash immediately.
- Define a typed config object as single source of truth; avoid accessing `process.env` throughout the codebase.
- Use sensible defaults for development; require explicit values for production secrets.

## Typed Config with Zod Validation

```ts
import { z } from "zod";

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const config = ConfigSchema.parse(process.env);
```

## Access Config Values

Always import and use the typed `config` object — never access `process.env` directly in application code.

```ts
import { config } from "./config";

const server = app.listen(config.PORT);
const db = connect(config.DATABASE_URL);
```

## Config File Organization

- Define config schema and export in a single `config.ts` (or `env.ts`) file near the project root.
- Each module that needs config values imports from this single source.
- For complex projects with multiple services, split into domain-specific config files that all validate from `process.env`.
