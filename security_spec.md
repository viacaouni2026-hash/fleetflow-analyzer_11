# Security Specification - FleetFlow Analyzer

## Data Invariants
1. Global settings can only be modified by authenticated users.
2. Fleet mappings must have valid string IDs (coringa name).
3. All writes must include a server timestamp.

## The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Attempt to update `/settings/global` without being logged in.
2. **Identity Spoofing**: Attempt to set `updatedBy` to a different UID.
3. **Ghost Field Injection**: Attempt to add `isAdmin: true` to the `global` settings document.
4. **Invalid Type**: Attempt to set `logoSize` as a string instead of a number.
5. **Malicious ID**: Attempt to create a mapping with a 1MB string as the ID.
6. **Missing Required Field**: Attempt to create a mapping without `frota`.
7. **Bypassing Verification**: Attempt to write as a user with an unverified email (if rules require verification).
8. **Resource Poisoning**: Attempt to set `appName` to a 50KB string.
9. **Old Timestamp**: Attempt to set `updatedAt` to a past date manually instead of `request.time`.
10. **Mapping Hijack**: Attempt to update a mapping created by someone else (if we want ownership, but here it's likely shared).
11. **Blanket Read**: Attempt to list all documents in a non-existent collection.
12. **Circular Reference**: (Not applicable here).

## Test Runner (Conceptual)
We will verify that:
- `auth != null` is required for all writes.
- `request.resource.data.keys().hasAll(...)` is enforced.
- `request.resource.data.updatedAt == request.time` is enforced.
