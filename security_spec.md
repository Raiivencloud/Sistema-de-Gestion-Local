# Security Specification - Bebidas Stock Manager

## Data Invariants
1. A Product must have a name, category, and non-negative stock/prices.
2. A Sale must be linked to a valid Product ID and have a positive quantity.
3. Every Sale must record the salePrice and costPrice at the time of transaction to ensure historical profit accuracy.
4. Timestamps (`createdAt`, `updatedAt`, `timestamp`) must be server-generated.

## The "Dirty Dozen" Payloads (Denial Tests)

1. **Identity Spoofing**: Attempt to create a product with a fake `ownerId` (if ownership implemented).
2. **Negative Stock**: Create/Update a product with `stock: -10`.
3. **Price Poisoning**: Update `salePrice` to `NaN` or a negative value.
4. **Massive Payload**: Attempt to write a 1MB string into the `name` field of a product.
5. **Orphaned Sale**: Create a Sale for a non-existent `productId`.
6. **Self-Assigned Admin**: Attempt to create an `admin` document in `/admins/{uid}`.
7. **Future Date Injection**: Send a Sale with a `timestamp` set to the year 2099.
8. **Shadow Field injection**: Adding `isPromoted: true` to a product when not in schema.
9. **Zero-Amount Sale**: Log a sale with `quantity: 0`.
10. **Resource Exhaustion**: Creating 100 categories in one batch with very long names.
11. **PII Leak**: Unauthorized read of a theoretical `users` collection.
12. **Update Gap**: Changing `costPrice` of a sale after it's been recorded.

## The Test Runner
(Tests would be implemented in `firestore.rules.test.ts` using the Firebase Emulators)
