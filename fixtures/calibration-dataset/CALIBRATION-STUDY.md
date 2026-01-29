# Calibration Study: Session-to-Commit Linking

**Generated:** 2026-01-29
**Status:** Ready for Algorithm Testing
**Build Plan Epic:** Epic 1 Stories 1.1-1.3

---

## Purpose

This calibration dataset provides 10 test repositories with **known correct session-to-commit mappings** for validating the linking algorithm before production deployment. The algorithm must achieve ≥70% precision to be considered production-ready.

**Evidence:** Build Plan Epic 1 Story 1.1 requires 10 repos with verified links. ✓

---

## Dataset Overview

### Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Repos** | 10 |
| Small Repos (<100 commits) | 3 |
| Medium Repos (100-1k commits) | 5 |
| Large Repos (1k-10k commits) | 2 |
| **Total Commits** | 7,858 |
| **Total Sessions** | 86 |
| **Total Ground Truth Mappings** | 83 |
| **Unlinked Sessions** | 3 |

### Expected Calibration Outcomes at 0.7 Threshold

| Confidence Level | Count | Expected Behavior |
|-----------------|-------|-------------------|
| High (≥0.8) | 53 | Auto-linked |
| Medium (0.7-0.8) | 24 | Auto-linked |
| Low (<0.7) | 6 | Unlinked |
| **Expected Accuracy** | **~92.8%** | 77/83 correctly classified |

---

## Repository Structure

Each test repository contains:

```
fixtures/calibration-dataset/
├── generate-dataset.ts          # Dataset generator script
├── dataset-summary.json         # Overall statistics
├── CALIBRATION-STUDY.md         # This documentation
├── calibration-run-script.ts    # Script to run algorithm on dataset
└── repo_<size>_<index>/         # Individual test repos
    ├── commits.json             # Git commit history (mock)
    ├── sessions.json            # Session files matching SessionExcerpt schema
    ├── ground-truth.json        # Known correct mappings (answer key)
    └── metadata.json            # Repo metadata and edge cases
```

---

## Edge Cases Covered

| # | Edge Case | Occurrences | Description |
|---|-----------|-------------|-------------|
| 1 | **Unlinked sessions** | 3 | Sessions with no matching commit in time window |
| 2 | **Multi-session commits** | 5 | Single commit linked to multiple sessions |
| 3 | **Long duration sessions** | 2 | 4-hour sessions may produce ambiguous matches |
| 4 | **Missing duration** | 2 | Duration should be inferred from message timestamps |

**Evidence:** Build Plan Epic 1 Story 1.1 requires edge case coverage. ✓

---

## Ground Truth Format

Each `ground-truth.json` file contains the answer key for validation:

```json
[
  {
    "sessionId": "session_1234567890_abc123",
    "commitSha": "a1b2c3d4",
    "confidence": 0.92,
    "reason": "Perfect temporal and file overlap"
  },
  {
    "sessionId": "session_1234567890_def456",
    "commitSha": "e5f6g7h8",
    "confidence": 0.72,
    "reason": "Low confidence: temporal proximity but minimal file overlap"
  }
]
```

### Fields

- **sessionId**: Session identifier (matches `sessions.json` → `id`)
- **commitSha**: Git commit SHA (matches `commits.json` → `sha`)
- **confidence**: Expected algorithm confidence (0.0-1.0)
- **reason**: Human-readable explanation of expected match quality

---

## Session File Format

Sessions follow the `SessionExcerpt` schema from the application:

```json
{
  "id": "session_1234567890_abc123",
  "tool": "claude-code",
  "durationMin": 15,
  "messages": [
    {
      "id": "msg_1234567890_xyz789",
      "role": "user",
      "text": "Update src/components/Button.tsx with new feature",
      "files": ["src/components/Button.tsx"]
    },
    {
      "id": "msg_1234567890_xyz790",
      "role": "assistant",
      "text": "I'll update Button.tsx with the requested changes.",
      "files": ["src/components/Button.tsx", "src/components/Button.test.tsx"]
    }
  ]
}
```

**Evidence:** Matches `narrative/src/core/types.ts` SessionExcerpt type. ✓

---

## Commit File Format

Commits represent mock git history for testing:

```json
{
  "sha": "a1b2c3d4",
  "authored_at": "2024-01-15T14:32:00Z",
  "message": "Add Badge component",
  "files": [
    "src/components/Badge.tsx",
    "src/components/Badge.test.tsx",
    "src/ui/components/Badge.tsx"
  ]
}
```

### Fields

- **sha**: Git commit SHA (8 characters for testing)
- **authored_at**: ISO timestamp of commit author date
- **message**: Commit message
- **files**: Array of changed file paths

---

## Calibration Procedure

### Step 1: Run Algorithm on Dataset

Execute the linking algorithm on all 10 repos:

```bash
npx tsx fixtures/calibration-dataset/calibration-run-script.ts
```

This will:
1. Load each repo's sessions and commits
2. Run the linking algorithm (temporal + file overlap scoring)
3. Generate links for sessions with confidence ≥0.7
4. Output results to `calibration-results.json`

### Step 2: Measure Accuracy

Compare algorithm output against ground truth:

```typescript
// Accuracy calculation
const correctLinks = results.filter(r =>
  r.algorithmLink?.commitSha === r.groundTruth.commitSha
).length;

const accuracy = (correctLinks / totalGroundTruth) * 100;
```

**Success criteria:** Accuracy must be between 65-80% to validate the 0.7 threshold.

**Evidence:** Build Plan Epic 1 Story 1.2 defines accuracy measurement. ✓

### Step 3: Adjust Threshold if Needed

Per Build Plan Epic 1 Story 1.3:

| Accuracy | Action |
|----------|--------|
| **< 65%** | Lower threshold to 0.6 and re-measure |
| **65-80%** | ✓ Threshold validated; document baseline |
| **> 80%** | Raise threshold to 0.75 and re-measure |

**Evidence:** Build Plan Epic 1 Story 1.3 defines threshold adjustment rules. ✓

---

## Expected Results

### At 0.7 Threshold (Default)

| Metric | Expected Value |
|--------|----------------|
| **Precision** | ~93% (77/83 correct) |
| **Recall** | ~88% (73/83 sessions linked) |
| **False Positives** | ~6% (5/83 wrong links) |
| **False Negatives** | ~12% (10/83 unlinked when should link) |

### By Repository Size

| Repo Size | Commits | Sessions | Expected Accuracy |
|-----------|---------|----------|-------------------|
| Small | 20-50 | 5-6 | ~95% |
| Medium | 100-1000 | 6-10 | ~93% |
| Large | 2000 | 8-12 | ~90% |

**Rationale:** Larger repos have more commit noise, potentially reducing accuracy.

---

## Validation Checklist

Before signing off on the calibration study:

- [ ] **Story 1.1:** Dataset created with 10 repos
  - [ ] 3 small repos (<100 commits)
  - [ ] 5 medium repos (100-1k commits)
  - [ ] 2 large repos (1k-10k commits)
  - [ ] Each repo has 5-10 session files
  - [ ] Ground truth mappings manually verified
  - [ ] Edge cases documented

- [ ] **Story 1.2:** Algorithm run on all repos
  - [ ] No errors during execution
  - [ ] Accuracy measured: (correct / total) × 100
  - [ ] Results documented with per-repo breakdown
  - [ ] Performance measured (should be <3 sec per session)

- [ ] **Story 1.3:** Threshold validated
  - [ ] If accuracy <65%: threshold lowered to 0.6
  - [ ] If accuracy >80%: threshold raised to 0.75
  - [ ] Final threshold documented in Evidence Map
  - [ ] Calibration study signed off

---

## Evidence Map

| Source | Evidence |
|--------|----------|
| `dataset-summary.json` | Overall dataset statistics |
| `repo_*/ground-truth.json` | Per-repo answer keys |
| `repo_*/metadata.json` | Per-repo edge cases |
| `calibration-results.json` | Algorithm output (generated after run) |
| Build Plan Epic 1 Story 1.1 | Dataset requirements |
| Build Plan Epic 1 Story 1.2 | Accuracy measurement requirements |
| Build Plan Epic 1 Story 1.3 | Threshold adjustment rules |

---

## Next Steps

1. **Implement Linking Algorithm** (Epic 3)
   - Story 3.1: Temporal overlap scoring
   - Story 3.2: File overlap scoring (Jaccard similarity)
   - Story 3.3: Combine scores with 0.7 threshold
   - Story 3.4: Full `link_session_to_commits()` function

2. **Run Calibration Study**
   - Execute `calibration-run-script.ts` on this dataset
   - Generate accuracy report
   - Adjust threshold if needed

3. **Sign Off**
   - Document final threshold and baseline
   - Proceed to Epic 4 (Badge UI) if accuracy ≥65%

**Evidence:** Build Plan Epic sequencing requires calibration before UI implementation. ✓
