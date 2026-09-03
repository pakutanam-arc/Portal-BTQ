export const theme = {
  colors: {
    primary: {
      bg: 'bg-[#0362D0]',
      text: 'text-[#0362D0]',
      border: 'border-[#0362D0]',
      lightBg: 'bg-[#0362D0]/10',
      hoverBg: 'hover:bg-[#0252b3]',
    },
    secondary: {
      bg: 'bg-[#C99A2E]',
      text: 'text-[#C99A2E]',
      border: 'border-[#C99A2E]',
      lightBg: 'bg-[#C99A2E]/15',
    },
    accent: {
      bg: 'bg-[#950415]',
      text: 'text-[#950415]',
      border: 'border-[#950415]',
      lightBg: 'bg-[#950415]/10',
    },
    surface: {
      main: 'bg-white',
      canvas: 'bg-[#F5F6F8]', // Main app background
      border: 'border-[#E6E8EC]',
    },
    text: {
      primary: 'text-[#172033]',
      secondary: 'text-slate-500',
      muted: 'text-slate-400',
      inverse: 'text-white',
    },
    status: {
      success: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
      },
      danger: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
      }
    }
  },
  
  layout: {
    // Standardized page padding scaling from mobile to desktop
    pagePadding: 'p-4 sm:p-6 lg:p-8 xl:px-10',
    // Constrains maximum width on ultra-wide monitors
    container: 'mx-auto w-full max-w-[1440px]',
    // Wrapper for main content areas
    pageWrapper: 'flex-1 p-4 sm:p-6 lg:p-8 xl:px-10 relative z-0 mx-auto w-full max-w-[1440px]',
  },
  
  card: {
    // Base card styles with consistent radii and shadows
    base: 'bg-white border border-[#E6E8EC] rounded-xl shadow-sm',
    // Standard inner padding for cards
    padding: 'p-4 sm:p-5',
    // Header section inside a card
    header: 'mb-4 border-b border-[#E6E8EC] pb-3',
  },
  
  typography: {
    // Page headers
    h1: 'text-2xl sm:text-3xl font-black text-[#172033] tracking-tight',
    // Section headers
    h2: 'text-xl sm:text-2xl font-extrabold text-[#172033] tracking-tight',
    // Card/Component headers
    h3: 'text-lg sm:text-xl font-bold text-[#172033]',
    // Subtitles
    subtitle: 'text-sm sm:text-base font-medium text-slate-500',
    // Standard body text
    body: 'text-sm text-[#172033]',
    // Small instructional text
    small: 'text-xs font-medium text-slate-500',
    // Uppercase labels for badges, table headers, etc.
    label: 'text-[10px] sm:text-xs font-black uppercase tracking-wider',
  },
  
  animation: {
    hover: 'transition-colors duration-200 ease-in-out',
    slideUp: 'transition-transform duration-300 ease-out transform',
  }
};
