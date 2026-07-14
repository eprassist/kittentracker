import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function base(props: P) {
  return {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const HomeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
  </svg>
);

export const ChartIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 3v18h18" />
    <path d="m6.5 14 4-5 3.5 3 4.5-6" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const FeedIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h16M4 12h16M4 19h10" />
  </svg>
);

export const CatIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9.5V4l3.5 2.5h9L20 4v5.5a8 8 0 0 1-16 0Z" />
    <path d="M9 11.5h.01M15 11.5h.01" strokeWidth={2.6} />
    <path d="M10.5 15c.5.6 2.5.6 3 0" />
  </svg>
);

export const GearIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
  </svg>
);

export const CameraIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
);

export const ImageIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m5 18 5-5 3 3 3-3 3.5 3.5" />
  </svg>
);

export const PlayIcon = (p: P) => (
  <svg {...base({ fill: "currentColor", stroke: "none", ...p })}>
    <path d="M8 5.5v13l11-6.5Z" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
  </svg>
);

export const PencilIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m14.5 5 4.5 4.5L8.5 20H4v-4.5Z" />
  </svg>
);

export const XIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronLeftIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
  </svg>
);

export const ArrowUpIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 19V5m-6 6 6-6 6 6" />
  </svg>
);

export const ArrowDownIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14m-6-6 6 6 6-6" />
  </svg>
);

export const AlertIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 2.5 20h19Z" />
    <path d="M12 9.5V14M12 17h.01" strokeWidth={2.2} />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

export const PawIcon = (p: P) => (
  <svg {...base({ fill: "currentColor", stroke: "none", ...p })}>
    <ellipse cx="6.2" cy="10" rx="1.9" ry="2.5" transform="rotate(-24 6.2 10)" />
    <ellipse cx="9.9" cy="7.3" rx="2" ry="2.6" transform="rotate(-7 9.9 7.3)" />
    <ellipse cx="14.1" cy="7.3" rx="2" ry="2.6" transform="rotate(7 14.1 7.3)" />
    <ellipse cx="17.8" cy="10" rx="1.9" ry="2.5" transform="rotate(24 17.8 10)" />
    <path d="M12 11.2c2.9 0 5.2 1.9 5.2 4.4 0 1.7-1.3 2.6-2.6 2.6-1 0-1.7-.45-2.6-.45s-1.6.45-2.6.45c-1.3 0-2.6-.9-2.6-2.6 0-2.5 2.3-4.4 5.2-4.4Z" />
  </svg>
);
