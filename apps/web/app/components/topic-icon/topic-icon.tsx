/**
 * Ikony specjalizacji wróżek — cienka linia, 16×16, styl aplikacji.
 * Użycie: <TopicIcon name="Tarot" /> lub <TopicIcon name="Astrologia" size={20} />
 */

const svgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

function IconTarot(size: number) {
  return (
    <svg {...svgProps(size)}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 7L14 11H10L12 15" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconAstrologia(size: number) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="M4.9 4.9l2.1 2.1" />
      <path d="M17 17l2.1 2.1" />
      <path d="M4.9 19.1l2.1-2.1" />
      <path d="M17 7l2.1-2.1" />
    </svg>
  );
}

function IconRuny(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M8 3v18" />
      <path d="M8 3l8 6" />
      <path d="M8 12l8-3" />
      <rect x="3" y="1" width="18" height="22" rx="2" strokeDasharray="3 3" strokeWidth="1" />
    </svg>
  );
}

function IconNumerologia(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M7 4v16" />
      <path d="M5 6l2-2" />
      <path d="M13 4c2 0 3 1.5 3 3s-1 3-3 3 3 1.5 3 3.5-1 3.5-3 3.5" />
      <circle cx="19" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconJasnowidztwo(size: number) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="13" r="6" />
      <path d="M12 7V3" />
      <path d="M8.5 8.5L6 6" />
      <path d="M15.5 8.5L18 6" />
      <ellipse cx="12" cy="13" rx="2.5" ry="2" strokeDasharray="2 2" strokeWidth="1" />
    </svg>
  );
}

function IconMedium(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
      <path d="M9 16c0 0 1.5 2 3 2s3-2 3-2" strokeWidth="1" />
    </svg>
  );
}

function IconHoroskopy(size: number) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
    </svg>
  );
}

function IconKarty(size: number) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3" y="4" width="12" height="16" rx="2" />
      <rect x="9" y="2" width="12" height="16" rx="2" />
      <path d="M15 8l-2 4 2 4" />
    </svg>
  );
}

function IconReiki(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3v4" />
      <path d="M8 5l4 2 4-2" />
      <path d="M7 14c0-3 2.5-4 5-4s5 1 5 4" />
      <path d="M9 21c0-2 1.3-3 3-3s3 1 3 3" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconWahadlo(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 2v10" />
      <path d="M8 2h8" />
      <circle cx="12" cy="16" r="4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSennik(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="14" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="15" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChiromancja(size: number) {
  return (
    <svg {...svgProps(size)}>
      {/* Dłoń — 5 palców + dłoń */}
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 9V4a1.5 1.5 0 0 1 3 0v7" />
      <path d="M14 9.5V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M8 13H6.5a1.5 1.5 0 0 0 0 3H8" />
      <path d="M8 13a4 4 0 0 0 0 6h6a4 4 0 0 0 4-4V12" />
      {/* Linie na dłoni */}
      <path d="M9 16c2-1 4-1 6 0" strokeWidth="1" strokeDasharray="2 1.5" />
      <path d="M10 18.5c1.5-0.5 3-0.5 4 0" strokeWidth="1" strokeDasharray="2 1.5" />
    </svg>
  );
}

function IconFengShui(size: number) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <path d="M12 3c-2.5 3-2.5 6 0 9s-2.5 6 0 9" />
      <circle cx="12" cy="7.5" r="1.5" />
      <circle cx="12" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconMedytacja(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
      <path d="M8 20l2-6h4l2 6" />
      <path d="M10 14c-3 0-5 1-5 3" />
      <path d="M14 14c3 0 5 1 5 3" />
      <path d="M12 8v6" />
    </svg>
  );
}

function IconAniol(size: number) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v5" />
      <path d="M8 21l4-7 4 7" />
      <path d="M6 13c2-2 4-2 6-1" />
      <path d="M18 13c-2-2-4-2-6-1" />
      <ellipse cx="12" cy="4" rx="5" ry="1.5" strokeWidth="1" />
    </svg>
  );
}

function IconBiorytmy(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
      <path d="M2 12c2 4 4 4 6 0s4-4 6 0 4 4 6 0" strokeDasharray="3 2" strokeWidth="1" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChanneling(size: number) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="5" r="3" />
      <path d="M12 8v4" />
      <path d="M8 14l4 2 4-2" />
      <path d="M6 18l6 3 6-3" />
      <path d="M12 12v9" strokeDasharray="2 2" strokeWidth="1" />
    </svg>
  );
}

function IconKartyCyganskie(size: number) {
  return (
    <svg {...svgProps(size)}>
      <rect x="4" y="3" width="10" height="14" rx="1.5" />
      <rect x="10" y="7" width="10" height="14" rx="1.5" />
      <circle cx="9" cy="10" r="2" strokeDasharray="2 1" strokeWidth="1" />
      <path d="M15 12l-1.5 3 1.5 3" strokeWidth="1" />
    </svg>
  );
}

function IconKartyLenormand(size: number) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 9l4-3 4 3" />
      <path d="M8 15l4 3 4-3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconKrysztalowa(size: number) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="11" r="6" />
      <ellipse cx="12" cy="11" rx="3" ry="2" strokeDasharray="2 2" strokeWidth="1" />
      <path d="M6 19h12" />
      <path d="M8 19l4 2 4-2" />
      <path d="M10 8l1 2" strokeWidth="1" />
    </svg>
  );
}

function IconPsychologia(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M9.5 2a5.5 5.5 0 0 1 4.9 8H16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1" />
      <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 2 1 3.5 2.5 4.5" />
      <path d="M12 14v4" />
      <path d="M9 22h6" />
      <path d="M12 18h0" />
    </svg>
  );
}

function IconRekawiczkaRuniczna(size: number) {
  return (
    <svg {...svgProps(size)}>
      {/* Rękawiczka — kciuk + korpus */}
      <path d="M7 4h8a3 3 0 0 1 3 3v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9a2 2 0 0 1 2-2h1V4z" />
      <path d="M4 9l-1 3a2 2 0 0 0 2 2h1" />
      {/* Mankiet */}
      <path d="M6 18h10" />
      <path d="M5 20h12" />
      {/* Runa na rękawiczce */}
      <path d="M11 8v6" strokeWidth="1.2" />
      <path d="M11 8l3 3" strokeWidth="1.2" />
      <path d="M11 11l3 3" strokeWidth="1.2" />
    </svg>
  );
}

function IconZiololecznictwo(size: number) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 22V12" />
      <path d="M12 12C12 8 16 4 20 4c0 4-4 8-8 8" />
      <path d="M12 15C12 11 8 7 4 7c0 4 4 8 8 8" />
      <circle cx="12" cy="22" r="0" />
      <path d="M9 22h6" />
    </svg>
  );
}

function IconDefault(size: number) {
  return (
    <svg {...svgProps(size)}>
      <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
    </svg>
  );
}

const ICON_MAP: Record<string, (size: number) => JSX.Element> = {
  'tarot': IconTarot,
  'karty tarota': IconTarot,
  'astrologia': IconAstrologia,
  'horoskopy': IconHoroskopy,
  'horoskop': IconHoroskopy,
  'runy': IconRuny,
  'numerologia': IconNumerologia,
  'jasnowidztwo': IconJasnowidztwo,
  'jasnowidzenie': IconJasnowidztwo,
  'medium': IconMedium,
  'mediumizm': IconMedium,
  'karty': IconKarty,
  'karty anielskie': IconAniol,
  'reiki': IconReiki,
  'wahadełko': IconWahadlo,
  'wahadło': IconWahadlo,
  'radiestezja': IconWahadlo,
  'radiestezja i wahadło': IconWahadlo,
  'biorytmy': IconBiorytmy,
  'channeling': IconChanneling,
  'chenneling': IconChanneling,
  'karty cygańskie': IconKartyCyganskie,
  'karty cyganskie': IconKartyCyganskie,
  'karty lenormand': IconKartyLenormand,
  'lenormand': IconKartyLenormand,
  'kryształowa kula': IconKrysztalowa,
  'krysztalowa kula': IconKrysztalowa,
  'psychologia i wsparcie': IconPsychologia,
  'psychologia': IconPsychologia,
  'wsparcie': IconPsychologia,
  'rękawiczka runiczna': IconRekawiczkaRuniczna,
  'rekawiczka runiczna': IconRekawiczkaRuniczna,
  'ziołolecznictwo': IconZiololecznictwo,
  'ziolecznictwo': IconZiololecznictwo,
  'zioła': IconZiololecznictwo,
  'sennik': IconSennik,
  'sny': IconSennik,
  'interpretacja snów': IconSennik,
  'chiromancja': IconChiromancja,
  'czytanie z dłoni': IconChiromancja,
  'feng shui': IconFengShui,
  'medytacja': IconMedytacja,
  'anioły': IconAniol,
  'aniołoterapia': IconAniol,
  'wróżby': IconDefault,
  'inne': IconDefault,
};

interface TopicIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function TopicIcon({ name, size = 16, className }: TopicIconProps) {
  const key = name.toLowerCase().trim();
  // Exact match first, then partial match (e.g. "Chiromancja - czytanie z dłoni")
  const renderIcon = ICON_MAP[key]
    ?? Object.entries(ICON_MAP).find(([k]) => key.includes(k))?.[1]
    ?? IconDefault;
  return <span className={className} style={{ display: 'inline-flex', flexShrink: 0 }}>{renderIcon(size)}</span>;
}
