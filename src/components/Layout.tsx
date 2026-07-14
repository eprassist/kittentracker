import { NavLink, Outlet } from "react-router-dom";
import { CatIcon, ChartIcon, FeedIcon, HomeIcon, PlusIcon } from "./Icons";

const tabs = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/chart", label: "Chart", icon: ChartIcon },
  { to: "/log", label: "Log", icon: PlusIcon, primary: true },
  { to: "/timeline", label: "Feed", icon: FeedIcon },
  { to: "/kittens", label: "Kittens", icon: CatIcon },
];

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-page">
      <main className="flex-1 px-4 pt-safe pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-around pb-safe">
          {tabs.map(({ to, label, icon: Icon, primary }) =>
            primary ? (
              <NavLink key={to} to={to} aria-label="Log a weigh-in" className="relative -mt-5 flex flex-col items-center px-3">
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 ${isActive ? "bg-accent" : "bg-accent/90"}`}
                    >
                      <Icon width={26} height={26} strokeWidth={2.4} />
                    </span>
                    <span className={`mt-0.5 text-[10px] font-medium ${isActive ? "text-accent" : "text-muted"}`}>{label}</span>
                  </>
                )}
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 pt-2.5 pb-1.5 ${isActive ? "text-accent" : "text-muted"}`
                }
              >
                <Icon />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
