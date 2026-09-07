const fs = require('fs');
let content = fs.readFileSync('src/pages/LiveSession.tsx', 'utf8');

// Ensure getStudents is imported
if (!content.includes('getStudents,')) {
  content = content.replace('getStudentsByGroup,', 'getStudentsByGroup, getStudents,');
}

const target = `  const handleScanSuccess = (decodedText: string) => {
    try {
      const parts = decodedText.split('/');
      const scannedId = parts[parts.length - 1];
      
      const foundStudent = students.find(s => s.id === scannedId);
      if (foundStudent) {
        setAttendance(prev => ({
          ...prev,
          [scannedId]: { ...prev[scannedId], status: 'Hadir' }
        }));
        
        // Play success beep using Web Audio API
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
          }
        } catch (audioErr) {
          console.warn("Audio feedback failed");
        }

        // Ensure progress is also restored/set for Hadir
        setProgress(prev => {
          const nextProg = { ...prev };
          const current = nextProg[scannedId] || {};
          const r = (current.reading && current.reading > 0) ? current.reading : 80;
          const t = (current.tajwid && current.tajwid > 0) ? current.tajwid : 80;
          const w = (current.writing && current.writing > 0) ? current.writing : 80;`;

const replacement = `  const handleScanSuccess = async (decodedText: string) => {
    try {
      const parts = decodedText.split('/');
      const scannedId = parts[parts.length - 1];
      
      const foundStudent = students.find(s => s.id === scannedId);
      if (foundStudent) {
        setAttendance(prev => ({
          ...prev,
          [scannedId]: { ...prev[scannedId], status: 'Hadir' }
        }));
        
        // Play success beep using Web Audio API
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
          }
        } catch (audioErr) {
          console.warn("Audio feedback failed");
        }

        // Ensure progress is also restored/set for Hadir
        setProgress(prev => {
          const nextProg = { ...prev };
          const current = nextProg[scannedId] || {};
          const r = (current.reading && current.reading > 0) ? current.reading : 80;
          const t = (current.tajwid && current.tajwid > 0) ? current.tajwid : 80;
          const w = (current.writing && current.writing > 0) ? current.writing : 80;`;

content = content.replace(target, replacement);

const targetEnd = `          return nextProg;
        });
      }
    } catch (err) {
      console.error("Scan error", err);
    }
  };`;

const replacementEnd = `          return nextProg;
        });
      } else {
        // Find out which group the student belongs to
        try {
          const allStudents = await getStudents();
          const trueStudent = allStudents.find(s => s.id === scannedId);
          if (trueStudent) {
            const allGroups = await getGroups();
            const trueGroup = allGroups.find(g => g.id === trueStudent.groupId);
            
            // Play error beep
            try {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.setValueAtTime(100, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
              }
            } catch(e) {}

            return "TIDAK VALID: " + trueStudent.name + " berada di " + (trueGroup ? trueGroup.name : "Kelompok lain") + ".";
          } else {
            return "QR Code tidak dikenali atau siswa tidak ditemukan di database.";
          }
        } catch (dbErr) {
          return "Siswa tidak terdaftar di kelompok ini.";
        }
      }
    } catch (err) {
      console.error("Scan error", err);
      return "Terjadi kesalahan membaca QR Code.";
    }
  };`;

content = content.replace(targetEnd, replacementEnd);
fs.writeFileSync('src/pages/LiveSession.tsx', content);
console.log("Patched LiveSession.tsx");
