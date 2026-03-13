import type { Room } from "@/types"
import { cn } from "@/lib/utils"

const FLOOR_MAP: Record<string, string> = {
  "astrids-rom": "second",
  "hannes-rom": "second",
  "bad-oppe": "second",
  soverom: "second",
}

function getFloor(slug: string): string {
  return FLOOR_MAP[slug] || "first"
}

interface SidebarProps {
  rooms: Room[]
  activeSlug: string
  open: boolean
  onClose: () => void
}

export function Sidebar({ rooms, activeSlug, open, onClose }: SidebarProps) {
  const sorted = [...rooms].sort((a, b) =>
    (b.lastModified || "").localeCompare(a.lastModified || "")
  )
  const first = sorted.filter((r) => getFloor(r.slug) === "first")
  const second = sorted.filter((r) => getFloor(r.slug) === "second")

  return (
    <>
      <nav
        className={cn(
          "w-64 min-w-64 bg-sidebar border-r border-sidebar-border p-2 overflow-y-auto",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:shadow-lg max-md:transition-transform max-md:duration-200",
          open ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        )}
      >
        <ul className="list-none m-0 p-0">
          <li className="text-xs font-medium text-muted-foreground px-2 pt-2 pb-1">
            Første etasje
          </li>
          {first.map((r) => (
            <li key={r.slug}>
              <a
                href={"#" + r.slug}
                onClick={onClose}
                className={cn(
                  "block px-2 py-1.5 text-sm rounded-md transition-colors no-underline",
                  activeSlug === r.slug
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {r.name}
              </a>
            </li>
          ))}
          <li className="text-xs font-medium text-muted-foreground px-2 pt-4 pb-1">
            Andre etasje
          </li>
          {second.map((r) => (
            <li key={r.slug}>
              <a
                href={"#" + r.slug}
                onClick={onClose}
                className={cn(
                  "block px-2 py-1.5 text-sm rounded-md transition-colors no-underline",
                  activeSlug === r.slug
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {r.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {open && (
        <div
          className="fixed inset-0 z-49 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}
