import { navigate } from "../lib/router";

interface Props {
  active: "home" | "bookmarks" | "settings";
}

const TABS = [
  {
    key: "home" as const,
    label: "홈",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "bookmarks" as const,
    label: "북마크",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <path
          d="M6 4h12a1 1 0 0 1 1 1v16l-7-4.5L5 21V5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "settings" as const,
    label: "설정",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2.8 13.6 5h2.9l1.4 2.5-1.4 2.5 1.4 2.5-1.4 2.5h-2.9L12 17.5 10.4 15H7.5l-1.4-2.5L7.5 10 6.1 7.5 7.5 5h2.9L12 2.8Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    ),
  },
];

export default function BottomNav({ active }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`bottom-nav-item ${active === tab.key ? "bottom-nav-active" : ""}`}
          onClick={() => navigate(tab.key)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
