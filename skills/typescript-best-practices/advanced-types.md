# Advanced Type Utilities

## type-fest

For advanced type utilities beyond TypeScript builtins, use [type-fest](https://github.com/sindresorhus/type-fest):

- `Opaque<T, Token>` — branded types for domain primitives (preferred over manual `& { __brand }` pattern)
- `PartialDeep<T>` — recursive partial for nested objects
- `ReadonlyDeep<T>` — recursive readonly for immutable data
- `LiteralUnion<Literals, Fallback>` — literals with autocomplete + string fallback
- `SetRequired<T, K>` / `SetOptional<T, K>` — targeted field modifications
- `Simplify<T>` — flatten complex intersection types in IDE tooltips

```ts
import type { Opaque, PartialDeep, SetRequired } from 'type-fest';

// Branded type (preferred over manual approach)
type UserId = Opaque<string, 'UserId'>;

// Deep partial for patch operations
type UserPatch = PartialDeep<User>;

// Make specific fields required
type UserWithEmail = SetRequired<Partial<User>, 'email'>;
```

## Branded Type Creation Pattern

When using `Opaque` from type-fest, provide a creation function for each branded type:

```ts
import type { Opaque } from 'type-fest';
import { createOpaqueType } from './utils/branded';

type UserId = Opaque<string, 'UserId'>;

export const { create: createUserId, isType: isUserId } = createOpaqueType<UserId>(
  (id: string) => isValidUUID(id),
  'UserId'
);
```

## Utility Type Recipes

```ts
// Make specific fields readonly
type ReadonlyFields<T, K extends keyof T> = T & { readonly [P in K]: T[P] };

// Deep required (inverse of PartialDeep)
type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

// Extract keys by value type
type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
```
