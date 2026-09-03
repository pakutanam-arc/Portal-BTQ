const fs = require('fs');
const glob = require('glob');

const files = [
    'src/pages/Certifications.tsx',
    'src/pages/Curriculum.tsx',
    'src/pages/Journals.tsx',
    'src/pages/MentorAttendance.tsx',
    'src/pages/Progress.tsx',
    'src/pages/Reports.tsx',
    'src/pages/Settings.tsx',
    'src/pages/Students.tsx'
];

files.forEach(file => {
    let code = fs.readFileSync(file, 'utf8');
    
    if (!code.includes("import { theme } from '../theme';")) {
        // Insert theme import near top, assuming "import { " exists in all
        code = code.replace("import { ", "import { theme } from '../theme';\nimport { ");
    }

    code = code.replace(
        '<div className="space-y-6 max-w-[1240px] mx-auto pb-12">',
        '<div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">'
    );
    code = code.replace(
        '<div className="space-y-6 max-w-[1240px] mx-auto">',
        '<div className="flex flex-col gap-4 sm:gap-6 w-full">'
    );
    
    // Convert common title patterns
    code = code.replace(
        '<h1 className="text-2xl font-black text-[#172033] tracking-tight">',
        '<h1 className={theme.typography.h1}>'
    );
    code = code.replace(
        '<h1 className="text-xl sm:text-2xl font-black text-[#172033] tracking-tight">',
        '<h1 className={theme.typography.h1}>'
    );
    
    code = code.replace(
        '<h1 className="text-2xl lg:text-3xl font-black tracking-tight">',
        '<h1 className={theme.typography.h1.replace(\'text-[#172033]\', \'\')}>'
    );

    // Some specific ones
    code = code.replace(
        '<h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">',
        '<h1 className={theme.typography.h1}>'
    );

    fs.writeFileSync(file, code);
});
