const fs = require('fs');
let content = fs.readFileSync('src/pages/LiveSession.tsx', 'utf8');

const targetEnd = `          return nextProg;
        });
      }
    } catch (e) {
      console.warn("Invalid QR code format");
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
            return "QR Code tidak dikenali atau siswa tidak terdaftar.";
          }
        } catch (dbErr) {
          return "Siswa tidak terdaftar di kelompok ini.";
        }
      }
    } catch (e) {
      console.warn("Invalid QR code format");
      return "Format QR Code tidak valid.";
    }
  };`;

content = content.replace(targetEnd, replacementEnd);
fs.writeFileSync('src/pages/LiveSession.tsx', content);
console.log("Patched LiveSession.tsx End Block");
