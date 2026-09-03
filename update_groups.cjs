const fs = require('fs');
let code = fs.readFileSync('src/pages/Groups.tsx', 'utf8');

if (!code.includes("import { theme } from '../theme';")) {
    code = code.replace("import { db } from '../services/firebase';", "import { db } from '../services/firebase';\nimport { theme } from '../theme';");
}

code = code.replace(
    '<div className="space-y-6 max-w-[1240px] mx-auto">',
    '<div className="flex flex-col gap-4 sm:gap-6 w-full">'
);

code = code.replace(
    '<h1 className="text-2xl font-black text-[#172033] tracking-tight">10 Kelompok Bimbingan BTQ</h1>',
    '<h1 className={theme.typography.h1}>10 Kelompok Bimbingan BTQ</h1>'
);

code = code.replace(
    '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">',
    '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E6E8EC] shadow-xs">'
);

fs.writeFileSync('src/pages/Groups.tsx', code);
