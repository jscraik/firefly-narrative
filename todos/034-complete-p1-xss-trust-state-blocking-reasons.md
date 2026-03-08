---
status: complete
priority: p1
issue_id: 034
tags:
  - code-review
  - security
  - xss
  - trust-state
dependencies: []
---

# Problem Statement

The `TrustStateIndicator` component renders `blockingReasons` array content directly into `<li>` elements without sanitization. These reasons come from external systems (sidecar app server errors, telemetry) and could potentially contain malicious content.

## Impact

- **Severity**: P1 (Critical - Blocks Merge)
- **CWE**: CWE-79 (Improper Neutralization of Input During Web Page Generation)
- **OWASP**: A03:2021 - Injection

# Findings

**Location**: `src/ui/components/TrustStateIndicator.tsx:175-177`

```tsx
{blockingReasons.slice(0, 3).map((reason) => (
  <li key={reason}>{reason}</li>
))}
```

**Data Flow**:
1. `blockingReasons` populated from `captureReliabilityStatus.reasons` (line 126-127)
2. `blockingReasons` populated from `codexAppServerStatus.lastError` (line 129-130)
3. Both sources come from external systems (sidecar app server, telemetry)

**Risk**: If an attacker can control error messages from the sidecar, they could potentially inject malicious content.

# Proposed Solutions

## Option A: Sanitize with DOMPurify (Recommended)

**Pros**:
- Industry-standard sanitization
- Handles all XSS vectors
- Easy to implement

**Cons**:
- Adds a dependency
- Slight runtime overhead

**Effort**: Small
**Risk**: Low

```bash
pnpm add dompurify
pnpm add -D @types/dompurify
```

```tsx
import DOMPurify from 'dompurify';

{blockingReasons.slice(0, 3).map((reason, index) => (
  <li key={`reason-${index}`}>{DOMPurify.sanitize(reason)}</li>
))}
```

## Option B: Escape HTML entities manually

**Pros**:
- No new dependency
- Faster runtime

**Cons**:
- More error-prone
- May miss edge cases

**Effort**: Small
**Risk**: Medium

```tsx
const escapeHtml = (str: string) =>
  str.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
```

## Option C: Use React's built-in escaping with textContent

**Pros**:
- No dependency
- React's default behavior

**Cons**:
- Already the default, but keys use raw values

**Effort**: Trivial
**Risk**: Low

```tsx
{blockingReasons.slice(0, 3).map((reason, index) => (
  <li key={`blocking-reason-${index}`}>{reason}</li>
))}
```

# Recommended Action

**Option C** (trivial fix) + verify React is escaping content. Change `key={reason}` to `key={`blocking-reason-${index}`}` to avoid using untrusted input as key.

# Technical Details

**Affected Files**:
- `src/ui/components/TrustStateIndicator.tsx`

**Components**:
- TrustStateIndicator

# Acceptance Criteria

- [ ] `key` prop uses index or hash, not raw reason string
- [ ] Verify React's default escaping is handling content (it should be)
- [ ] Add comment noting external input source
- [ ] Consider adding integration test with malicious-looking error message

# Work Log

_2026-03-08_: Initial finding from security review

# Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [React Security Best Practices](https://react.dev/learn/keeping-components-pure)
