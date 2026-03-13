import type { Room } from "@/types"
import { getRoomStats, formatDate } from "@/lib/markdown"

interface LandingProps {
  rooms: Room[]
}

export function Landing({ rooms }: LandingProps) {
  const sorted = [...rooms].sort((a, b) =>
    (b.lastModified || "").localeCompare(a.lastModified || "")
  )

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Oppussing</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Oversikt over rom og områder
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {sorted.map((r) => {
          const stats = getRoomStats(r.markdown)
          return (
            <a
              key={r.slug}
              href={"#" + r.slug}
              className="flex flex-col gap-1.5 rounded-xl border bg-card p-5 text-card-foreground no-underline transition-colors hover:bg-accent"
            >
              <div className="text-sm font-semibold">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                Sist oppdatert: {formatDate(r.lastModified)}
              </div>
              {stats.count > 0 && (
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>
                    {stats.count} plan{stats.count !== 1 ? "er" : ""}
                  </span>
                  {stats.cost > 0 && (
                    <span>{stats.cost.toLocaleString("nb-NO")} kr</span>
                  )}
                </div>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
