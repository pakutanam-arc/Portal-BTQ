# System Implementation Plan: Smart Natural Student Sorting & Default Score Rules

Provide consistent, natural alphanumeric student sorting across all application views: primary sorting by grade number (e.g., 7 < 8 < 9), secondary sorting by class section/letter (e.g., 9A < 9B < 9C), and tertiary sorting alphabetically by student name (A-Z). Update baseline default initial score fallbacks from 80 to 0.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following rules were confirmed:
> 1. **Global Scope Sorting**: Applied across all student lists, including Kelola Santri, Rapor Santri, Rekap Absensi, and Admin/Mentor Dashboard tables.
> 2. **Natural Grade & Section Parsing**: Smart extraction handles format variations (e.g., "7A", "Kelas 8B", "9 C", "VIII A") by parsing the numeric grade first, then the sub-class suffix letter, and finally student name.
> 3. **Default Score baseline**: All unassessed or fallback student score entries (reading, tajwid, writing, memorization, and overall total) now default to `0` instead of `80`.

- **Confirmed Decision 1**: Apply sorting across all views (Students management, Reports sheet/modal, Attendance, Progress, and Dashboard panels).
- **Confirmed Decision 2**: Use smart natural sorting: Grade number (7 < 8 < 9) -> Class section letter (A < B < C) -> Student name (A-Z).
- **Confirmed Decision 3**: Baseline default score for new or unentered records is set to `0`.

---

## 1. Overview & Core Concept

Currently, student lists are sorted either arbitrarily by insertion order or purely by student name. This implementation introduces a unified helper (`sortStudents` / `compareStudentsByClassAndName`) in `src/utils/studentUtils.ts` that enforces:
- **Primary key**: Grade Number (numeric extraction: 7 < 8 < 9).
- **Secondary key**: Class Section Suffix (alphabetic letter: A < B < C).
- **Tertiary key**: Student Name (locale-aware Indonesian alphabetic comparison: A-Z).

---

## 2. User Experience & Visual Design

- **Predictable Ordering**: Mentors and admins will see student lists sorted logically by grade (7 -> 8 -> 9), by class group (7A -> 7B -> 8A -> 9A -> 9C), and then by name within each class.
- **Consistent Navigation**: Seamless user experience across student management tables, attendance inputs, batch report printing, and progress tracking.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1**: Centralized Utility in `studentUtils.ts`.
  - *Chosen Approach*: Implement `extractClassComponents(className)` and `compareStudentsByClassAndName(a, b)` in `src/utils/studentUtils.ts` and use it across all list views.
  - *Why*: Guarantees single source of truth for sorting behavior and eliminates duplicate sorting logic.
  - *Alternatives Considered*: Independent sorting in each page (rejected: prone to drift and inconsistencies).

- **Decision 2**: Robust Class Parsing with Roman Numerals Support.
  - *Chosen Approach*: Regex-based parser that converts standard numbers ("7", "8", "9") and Roman numerals ("VII", "VIII", "IX") into numeric grade numbers, while extracting sub-class letters ("A", "B", "C").
  - *Why*: Gracefully handles user variations in inputting class names.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    src/utils/studentUtils.ts                    │
│  - extractClassComponents(className) => { gradeNum, section }   │
│  - compareStudentsByClassAndName(studentA, studentB) => number  │
│  - sortStudents(studentsList) => sortedArray                    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       ▼                          ▼                          ▼
┌──────────────┐         ┌─────────────────┐        ┌──────────────────┐
│ Students.tsx │         │   Reports.tsx   │        │ Dashboard Panels │
│ (Management) │         │  (Rapor Sheet)  │        │ (Admin & Mentor) │
└──────────────┘         └─────────────────┘        └──────────────────┘
```

### Data Structures & Comparison Logic
```typescript
interface ClassComponents {
  gradeNumber: number; // e.g., 7, 8, 9 (0 if unparsed)
  section: string;     // e.g., "A", "B", "C"
  rawClass: string;
}

export function extractClassComponents(className?: string): ClassComponents {
  if (!className) return { gradeNumber: 999, section: '', rawClass: '' };
  const str = className.trim();
  
  // Convert Roman numerals to numbers if present
  let normalized = str
    .replace(/\bVII\b/i, '7')
    .replace(/\bVIII\b/i, '8')
    .replace(/\bIX\b/i, '9');
    
  const match = normalized.match(/(\d+)\s*([a-zA-Z]*)/);
  if (match) {
    return {
      gradeNumber: parseInt(match[1], 10),
      section: (match[2] || '').toUpperCase(),
      rawClass: str
    };
  }
  return { gradeNumber: 999, section: str.toUpperCase(), rawClass: str };
}

export function compareStudentsByClassAndName(
  a: { className?: string; name: string },
  b: { className?: string; name: string }
): number {
  const classA = extractClassComponents(a.className);
  const classB = extractClassComponents(b.className);

  if (classA.gradeNumber !== classB.gradeNumber) {
    return classA.gradeNumber - classB.gradeNumber;
  }

  const sectionCmp = classA.section.localeCompare(classB.section, 'id');
  if (sectionCmp !== 0) return sectionCmp;

  return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
}
```

---

## 5. Affected Files & Execution Strategy

1. **`src/utils/studentUtils.ts`**: Add `extractClassComponents`, `compareStudentsByClassAndName`, and `sortStudents`.
2. **`src/pages/Students.tsx`**: Apply `sortStudents` when displaying student table & filters.
3. **`src/pages/Reports.tsx` / `BatchOfficialReportModal.tsx` / `OfficialReportSheet.tsx`**: Apply `sortStudents` for single and batch report generation.
4. **`src/pages/StudentAttendance.tsx` / `Progress.tsx` / `LiveSession.tsx`**: Sort active student lists prior to rendering attendance and progress forms.
5. **`src/components/dashboard/AdminDashboard.tsx` & `GroupSummaryTable.tsx`**: Sort group student summaries consistently.
6. **Verification**: Execute `lint_applet` and `compile_applet` to ensure full build integrity.
