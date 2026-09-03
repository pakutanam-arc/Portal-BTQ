const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentAttendance.tsx', 'utf8');

if (!code.includes("import { theme } from '../theme';")) {
    code = code.replace("import { useAuth } from '../contexts/AuthContext';", "import { useAuth } from '../contexts/AuthContext';\nimport { theme } from '../theme';");
}

code = code.replace(
    '<div className="space-y-6 max-w-[1240px] mx-auto pb-12">',
    '<div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">'
);

code = code.replace(
    '<h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">',
    '<h1 className={theme.typography.h1.replace(\'text-[#172033]\', \'text-white\')}>'
);

// If the container matches this exact string, let's just make it slightly smaller/more standard.
// It seems to be a custom banner though, so maybe just leave the banner alone.

fs.writeFileSync('src/pages/StudentAttendance.tsx', code);
