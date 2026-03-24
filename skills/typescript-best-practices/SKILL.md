---
name: typescript-best-practices
description: Provides TypeScript coding standards covering type-first development, discriminated unions, branded types, exhaustive switch handling, and Zod runtime validation. Apply when reading, writing, or reviewing TypeScript or JavaScript (.ts, .tsx, .js, .jsx) files.
---

# TypeScript Best Practices

## Pair with React Best Practices

When working with React components (`.tsx`, `.jsx` files or `@react` imports), always load `react-best-practices` alongside this skill. This skill covers TypeScript fundamentals; React-specific patterns (effects, hooks, refs, component design) are in the dedicated React skill.

## Instructions

- Enable `strict` mode; model data with interfaces and types. Strong typing catches bugs at compile time.
- Every code path returns a value or throws; use exhaustive `switch` with `never` checks in default. Unhandled cases become compile errors.
- Propagate errors with context; catching requires re-throwing or returning a typed result. Hidden failures delay debugging.
- Use `await` for async calls; wrap external calls with contextual error messages. Unhandled rejections crash Node processes.
- Add or update focused tests when changing logic; test behavior, not implementation details.
- Prefer `const` over `let`; use `readonly` and `Readonly<T>` for immutable data. Avoid mutating function parameters.
- Prefer smaller, focused files (~200 lines max); colocate tests (`foo.test.ts` alongside `foo.ts`). Group by feature, not by type.

## Anti-Patterns

- **Never use `any`** — use `unknown` and narrow, or a specific type.
- **Never use `enum`** — use `const` object + `as const` + `typeof` instead.
- **Never use non-null assertion `!`** — handle nullability explicitly with guards or `?.`/`??`.
- **Never use `// @ts-ignore` or `// @ts-expect-error`** without an explaining comment on the same line.
- **Never swallow errors in catch blocks** — re-throw with context or return a typed error result.
- **Never access `process.env` directly** in application code — use the typed config object.

## Make Illegal States Unrepresentable

Use the type system to prevent invalid states at compile time.

**Discriminated unions for mutually exclusive states:**

```ts
// Good: only valid combinations possible
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Bad: allows invalid combinations like { loading: true, error: Error }
type RequestState<T> = {
  loading: boolean;
  data?: T;
  error?: Error;
};
```

**Branded types for domain primitives (use `type-fest` `Opaque`):**

```ts
import type { Opaque } from 'type-fest';

type UserId = Opaque<string, 'UserId'>;
type OrderId = Opaque<string, 'OrderId'>;

// Compiler prevents passing OrderId where UserId expected
function getUser(id: UserId): Promise<User> { /* ... */ }
```

**Const assertions for literal unions:**

```ts
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'user' | 'guest'

// Type-safe guard (no unsafe cast)
function isValidRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}
```

**Required vs optional fields — be explicit:**

```ts
// Creation: some fields required
type CreateUser = { email: string; name: string };

// Update: all fields optional
type UpdateUser = Partial<CreateUser>;

// Database row: all fields present
type User = CreateUser & { id: UserId; createdAt: Date };
```

## Exhaustive Switch with Never Check

```ts
type Status = "active" | "inactive";

export function processStatus(status: Status): string {
  switch (status) {
    case "active":
      return "processing";
    case "inactive":
      return "skipped";
    default: {
      const _exhaustive: never = status;
      throw new Error(`unhandled status: ${_exhaustive}`);
    }
  }
}
```

## Error Handling

Use `try/catch` for control flow. Wrap external calls with context. Catch blocks must either re-throw with added context or return a meaningful typed result.

```ts
export async function fetchWidget(id: string): Promise<Widget> {
  const response = await fetch(`/api/widgets/${id}`);
  if (!response.ok) {
    throw new Error(`fetch widget ${id} failed: ${response.status}`);
  }
  return response.json();
}
```

## Runtime Validation with Zod

Define schemas as single source of truth; infer TypeScript types with `z.infer<>`. Use `safeParse` for user input, `parse` at trust boundaries.

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});

type User = z.infer<typeof UserSchema>;
```

For detailed Zod patterns (composition, transforms, custom validation), see [zod-patterns.md](zod-patterns.md).

## Configuration

Load config from environment variables at startup; validate with Zod. Define a typed config object as single source of truth — never access `process.env` directly.

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

For detailed config patterns, see [config-patterns.md](config-patterns.md).

## Additional Resources

- For advanced type utilities (type-fest, branded type helpers, utility recipes), see [advanced-types.md](advanced-types.md).
