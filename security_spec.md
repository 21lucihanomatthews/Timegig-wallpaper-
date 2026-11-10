# Firebase Security Specification - TimeGiG

## Data Invariants
1. **User Profile**: A user can only manage their own profile. Profile UIDs must match the authenticated UID.
2. **Referrals**: Referrals belong to a tenant (user). Access to referral data and documents is strictly limited to the tenant who owns the referral path.
3. **Gigs**: Gigs are private to the user who initiated them.
4. **Saved Locations**: Map bookmarks are private to the user who created them.
5. **Verified Email**: All write operations require a verified email (`auth.token.email_verified == true`).

## The Dirty Dozen Payloads (Target: Deny)
1. **Identity Spoofing**: Attempting to create a user profile with a different UID than the auth token.
2. **Privilege Escalation**: Attempting to set `totalProfit` or `referralCode` during user registration (if these are system-managed).
3. **Cross-Tenant Access**: Attempting to read referrals from a different user's subcollection.
4. **Referral Hijacking**: Attempting to update a referral document that belongs to another user.
5. **Orphaned Document**: Creating a referral document without a parent referral document existing.
6. **Malicious ID**: Using a 2KB string as a document ID to bloat the database.
7. **Type Poisoning**: Sending a boolean where a string is expected (e.g., `name: true`).
8. **Size Attack**: Sending a 500KB string for the `name` field.
9. **Status Shortcut**: A user attempting to set a referral status to `approved` directly if that should be a restricted action (assuming standard tenant flow).
10. **Shadow Field**: Adding `isAdmin: true` to a user profile payload.
11. **Timestamp Spoofing**: Sending a client-side `updatedAt` instead of `request.time`.
12. **Unverified Write**: Attempting to save a location without a verified email.

## Test Runner (Logic Check)
The tests will ensure that:
- `get`, `list`, `create`, `update`, `delete` operations follow the ownership rule (`userId == request.auth.uid`).
- Field types and sizes are validated.
- Relational integrity is maintained via `exists()`.
