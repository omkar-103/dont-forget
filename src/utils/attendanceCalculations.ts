import {
  AttendanceRecord,
  AttendanceType,
  Subject,
  SubjectAttendanceSummary,
  GlobalAttendanceSummary,
  AttendanceSettings,
} from '../types';

export function calculateTheoryAttendance(records: AttendanceRecord[]): {
  attended: number;
  missed: number;
  total: number;
  percentage: number | null;
} {
  const theory = records.filter((r) => r.type === 'theory');
  const attended = theory.filter((r) => r.status === 'attended').length;
  const missed = theory.filter((r) => r.status === 'missed').length;
  const total = attended + missed;
  const percentage = total > 0 ? (attended / total) * 100 : null;

  return { attended, missed, total, percentage };
}

export function calculatePracticalAttendance(records: AttendanceRecord[]): {
  attended: number;
  missed: number;
  total: number;
  percentage: number | null;
} {
  const practical = records.filter((r) => r.type === 'practical');
  const attended = practical.filter((r) => r.status === 'attended').length;
  const missed = practical.filter((r) => r.status === 'missed').length;
  const total = attended + missed;
  const percentage = total > 0 ? (attended / total) * 100 : null;

  return { attended, missed, total, percentage };
}

export function calculateSubjectAttendance(
  subject: Subject,
  records: AttendanceRecord[],
  requiredAttendance = 75
): SubjectAttendanceSummary {
  const subjectRecords = records.filter((r) => r.subjectId === subject.id);
  const theory = calculateTheoryAttendance(subjectRecords);
  const practical = calculatePracticalAttendance(subjectRecords);

  const attended = theory.attended + practical.attended;
  const missed = theory.missed + practical.missed;
  const total = attended + missed;
  const percentage = total > 0 ? (attended / total) * 100 : null;

  // Status risk determination
  let status: 'Safe' | 'At Risk' | 'Critical' | 'Excellent' | 'No Data' = 'No Data';
  if (percentage !== null) {
    if (percentage >= 90) status = 'Excellent';
    else if (percentage >= requiredAttendance) status = 'Safe';
    else if (percentage < 65) status = 'Critical';
    else status = 'At Risk';
  }

  // Classes needed to reach required attendance
  const classesNeeded =
    percentage !== null
      ? calculateClassesNeededToReachTarget(attended, total, requiredAttendance)
      : 0;

  // Projections
  const nextAttendedProjection =
    total > 0 ? ((attended + 1) / (total + 1)) * 100 : 100;
  const nextMissedProjection =
    total > 0 ? (attended / (total + 1)) * 100 : 0;

  return {
    subjectId: subject.id,
    name: subject.name,
    code: subject.code,
    active: subject.active,
    theory,
    practical,
    overall: {
      attended,
      missed,
      total,
      percentage,
    },
    requiredPercentage: requiredAttendance,
    status,
    classesNeeded,
    nextAttendedProjection,
    nextMissedProjection,
  };
}

/**
 * Given attended = A, total = T, target percentage = targetPct (e.g. 75):
 * Find smallest integer x >= 0 such that (A + x) / (T + x) >= targetPct / 100
 */
export function calculateClassesNeededToReachTarget(
  attended: number,
  total: number,
  targetPct: number
): number {
  if (total === 0) return 0;
  const p = targetPct / 100;
  const currentRatio = attended / total;
  if (currentRatio >= p) return 0;
  if (p >= 1) {
    return Infinity; // Can never reach 100% if missed > 0
  }

  // (A + x) >= p * (T + x)
  // A + x >= p*T + p*x
  // x * (1 - p) >= p*T - A
  // x >= (p*T - A) / (1 - p)
  const numerator = p * total - attended;
  const denominator = 1 - p;
  const x = Math.ceil(numerator / denominator);
  return Math.max(0, x);
}

export function calculateGlobalSummary(
  subjects: Subject[],
  records: AttendanceRecord[],
  settings: AttendanceSettings
): GlobalAttendanceSummary {
  const activeSubjects = subjects.filter((s) => s.active);
  const activeSubjectIds = new Set(activeSubjects.map((s) => s.id));
  const activeRecords = records.filter((r) => activeSubjectIds.has(r.subjectId));

  // Global Theory
  const theoryRecords = activeRecords.filter((r) => r.type === 'theory');
  const theoryAttended = theoryRecords.filter((r) => r.status === 'attended').length;
  const theoryTotal = theoryRecords.length;
  const theoryPercentage = theoryTotal > 0 ? (theoryAttended / theoryTotal) * 100 : null;

  // Global Practical
  const practicalRecords = activeRecords.filter((r) => r.type === 'practical');
  const practicalAttended = practicalRecords.filter((r) => r.status === 'attended').length;
  const practicalTotal = practicalRecords.length;
  const practicalPercentage =
    practicalTotal > 0 ? (practicalAttended / practicalTotal) * 100 : null;

  // Global Overall (sum of actual classes, not average of percentages)
  const totalAttended = theoryAttended + practicalAttended;
  const totalClasses = theoryTotal + practicalTotal;
  const overallPercentage = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : null;

  // Subject Summaries
  const subjectSummaries = activeSubjects.map((s) =>
    calculateSubjectAttendance(s, activeRecords, settings.requiredAttendance)
  );

  // Lowest overall subject (ignore subjects with no attendance data)
  const subjectsWithData = subjectSummaries.filter(
    (s) => s.overall.percentage !== null
  );

  let lowestOverall: { subjectId: string; name: string; percentage: number } | null = null;
  if (subjectsWithData.length > 0) {
    const minSub = [...subjectsWithData].sort(
      (a, b) => (a.overall.percentage ?? 0) - (b.overall.percentage ?? 0)
    )[0];
    if (minSub && minSub.overall.percentage !== null) {
      lowestOverall = {
        subjectId: minSub.subjectId,
        name: minSub.name,
        percentage: minSub.overall.percentage,
      };
    }
  }

  // Lowest theory
  const subjectsWithTheory = subjectSummaries.filter((s) => s.theory.percentage !== null);
  let lowestTheory: { subjectId: string; name: string; percentage: number } | null = null;
  if (subjectsWithTheory.length > 0) {
    const minSub = [...subjectsWithTheory].sort(
      (a, b) => (a.theory.percentage ?? 0) - (b.theory.percentage ?? 0)
    )[0];
    if (minSub && minSub.theory.percentage !== null) {
      lowestTheory = {
        subjectId: minSub.subjectId,
        name: minSub.name,
        percentage: minSub.theory.percentage,
      };
    }
  }

  // Lowest practical
  const subjectsWithPractical = subjectSummaries.filter((s) => s.practical.percentage !== null);
  let lowestPractical: { subjectId: string; name: string; percentage: number } | null = null;
  if (subjectsWithPractical.length > 0) {
    const minSub = [...subjectsWithPractical].sort(
      (a, b) => (a.practical.percentage ?? 0) - (b.practical.percentage ?? 0)
    )[0];
    if (minSub && minSub.practical.percentage !== null) {
      lowestPractical = {
        subjectId: minSub.subjectId,
        name: minSub.name,
        percentage: minSub.practical.percentage,
      };
    }
  }

  // At-risk subjects (current < requiredAttendance)
  const atRiskSubjects = subjectSummaries.filter(
    (s) => s.overall.percentage !== null && s.overall.percentage < settings.requiredAttendance
  );

  return {
    overall: {
      attended: totalAttended,
      total: totalClasses,
      percentage: overallPercentage,
    },
    theory: {
      attended: theoryAttended,
      total: theoryTotal,
      percentage: theoryPercentage,
    },
    practical: {
      attended: practicalAttended,
      total: practicalTotal,
      percentage: practicalPercentage,
    },
    lowestOverall,
    lowestTheory,
    lowestPractical,
    atRiskSubjects,
    subjects: subjectSummaries,
    requiredAttendance: settings.requiredAttendance,
  };
}
