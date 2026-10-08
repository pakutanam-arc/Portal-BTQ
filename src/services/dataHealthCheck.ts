import { 
  getGroups, 
  getTeachingJournals, 
  getAllStudentProgress, 
  addAuditLog,
  getStudentsByGroup,
  saveStudentProgress,
  StudentProgress
} from './db';

export interface HealthCheckResult {
  hasDiscrepancy: boolean;
  discrepancies: Array<{
    groupId: string;
    groupName: string;
    sessionCount: number;
    progressCount: number;
  }>;
}

export async function runDataHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    hasDiscrepancy: false,
    discrepancies: []
  };

  try {
    const groups = await getGroups();
    const { data: journals } = await getTeachingJournals(undefined, 1000);
    const progressRecords = await getAllStudentProgress();

    for (const group of groups) {
      const groupJournals = journals.filter(j => j.groupId === group.id);
      const uniqueSessionsInJournals = new Set(
        groupJournals.map(j => j.meetingNumber).filter(m => typeof m === 'number' && m > 0)
      );

      const groupProgress = progressRecords.filter(p => p.groupId === group.id);
      const uniqueSessionsInProgress = new Set(
        groupProgress.map(p => p.meetingNumber).filter(m => typeof m === 'number' && m > 0)
      );

      if (uniqueSessionsInJournals.size !== uniqueSessionsInProgress.size) {
        result.hasDiscrepancy = true;
        result.discrepancies.push({
          groupId: group.id,
          groupName: group.name,
          sessionCount: uniqueSessionsInJournals.size,
          progressCount: uniqueSessionsInProgress.size
        });

        await addAuditLog({
          actor: 'Admin Manual Audit',
          actorRole: 'admin',
          action: 'Health Check',
          category: 'sync',
          severity: 'warning',
          details: `Discrepancy detected in ${group.name}: ${uniqueSessionsInJournals.size} Sesi Mengajar vs ${uniqueSessionsInProgress.size} Capaian (Progress).`,
          metadata: { 
            groupId: group.id, 
            sessionCount: uniqueSessionsInJournals.size, 
            progressCount: uniqueSessionsInProgress.size,
            requiresSync: true
          }
        });
      }
    }
  } catch (error) {
    console.error("Data health check failed:", error);
    throw error;
  }
  
  return result;
}

export async function forceSyncGroupProgress(groupId: string): Promise<void> {
  try {
    const students = await getStudentsByGroup(groupId);
    const { data: journals } = await getTeachingJournals(groupId, 100);
    const progressRecords = await getAllStudentProgress();
    const groupProgress = progressRecords.filter(p => p.groupId === groupId);

    const validMeetings = new Set(journals.map(j => j.meetingNumber).filter(m => typeof m === 'number' && m > 0));

    // For every valid meeting in journals, ensure every student has a progress record
    for (const meeting of Array.from(validMeetings)) {
      for (const student of students) {
        const hasProgress = groupProgress.some(p => p.studentId === student.id && p.meetingNumber === meeting);
        if (!hasProgress) {
          // Create empty progress
          const emptyProgress: StudentProgress = {
            studentId: student.id,
            groupId: groupId,
            meetingNumber: meeting as number,
            sessionId: `session_${meeting}`,
            date: new Date().toISOString().split('T')[0],
            reading: 0,
            tajwid: 0,
            writing: 0,
            total: 0
          };
          await saveStudentProgress(emptyProgress);
        }
      }
    }

    await addAuditLog({
      actor: 'Admin',
      actorRole: 'admin',
      action: 'Force Sync',
      category: 'sync',
      severity: 'success',
      details: `Berhasil melakukan Force Sync data capaian untuk Kelompok ${groupId}. Semua gap data telah ditambal.`,
      metadata: { groupId, status: 'resolved' }
    });
  } catch (error) {
    console.error("Sync failed", error);
    throw error;
  }
}
