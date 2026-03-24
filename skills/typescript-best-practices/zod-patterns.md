# Zod Runtime Validation Patterns

## Core Principles

- Define schemas as single source of truth; infer TypeScript types with `z.infer<>`. Avoid duplicating types and schemas.
- Use `safeParse` for user input where failure is expected; use `parse` at trust boundaries where invalid data is a bug.
- Compose schemas with `.extend()`, `.pick()`, `.omit()`, `.merge()` for DRY definitions.
- Add `.transform()` for data normalization at parse time (trim strings, parse dates).
- Include descriptive error messages; use `.refine()` for custom validation logic.

## Schema as Source of Truth

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.string().transform((s) => new Date(s)),
});

type User = z.infer<typeof UserSchema>;
```

## Return Parse Results to Callers

Never swallow parse errors — return them to callers for proper handling.

```ts
import { z, SafeParseReturnType } from "zod";

export function parseUserInput(raw: unknown): SafeParseReturnType<unknown, User> {
  return UserSchema.safeParse(raw);
}

// Caller handles both success and error:
const result = parseUserInput(formData);
if (!result.success) {
  setErrors(result.error.flatten().fieldErrors);
  return;
}
await submitUser(result.data);
```

## Strict Parsing at Trust Boundaries

At API boundaries where invalid data indicates a contract violation, use `parse` (throws on failure):

```ts
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`fetch user ${id} failed: ${response.status}`);
  }
  const data = await response.json();
  return UserSchema.parse(data); // throws if API contract violated
}
```

## Schema Composition

```ts
const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });
const UpdateUserSchema = CreateUserSchema.partial();
const UserWithPostsSchema = UserSchema.extend({
  posts: z.array(PostSchema),
});
```

## Custom Validation with refine

```ts
const PasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .refine(
    (pw) => /[A-Z]/.test(pw) && /[0-9]/.test(pw),
    "Password must contain at least one uppercase letter and one number"
  );
```
