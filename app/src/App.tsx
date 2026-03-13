import { useState, useEffect, useCallback } from "react"
import type { Room } from "@/types"
import { loadRooms, hasToken, saveRoom, clearCache } from "@/lib/github"
import { domToMarkdown } from "@/lib/dom-to-markdown"
import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"
import { Landing } from "@/components/Landing"
import { RoomView } from "@/components/RoomView"
import { SettingsDialog } from "@/components/SettingsDialog"
import { Button } from "@/components/ui/button"

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState(() => location.hash.slice(1))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await loadRooms()
      setRooms(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    const onHash = () => {
      setSlug(location.hash.slice(1))
      setEditMode(false)
      setSidebarOpen(false)
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  const room = rooms.find((r) => r.slug === slug)

  const handleSave = async () => {
    if (!room) return
    setSaving(true)
    try {
      const content = document.querySelector(".room-content")?.parentElement
      if (content) {
        // Upload replaced images first
        const replacedImgs = content.querySelectorAll(
          'img[data-replaced="true"]'
        ) as NodeListOf<HTMLImageElement>
        for (let ri = 0; ri < replacedImgs.length; ri++) {
          const rimg = replacedImgs[ri]
          const dataUrl = rimg.src
          const base64Data = dataUrl.split(",")[1]
          const rext =
            (rimg.dataset.file || "jpg").split(".").pop()?.toLowerCase() ||
            "jpg"
          const rimgName = Date.now() + "-" + ri + "." + rext
          const rimgPath = "bilder/" + room.slug + "/" + rimgName

          await fetch(
            "https://api.github.com/repos/3jarne/oppussing/contents/" +
              rimgPath,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/vnd.github+json",
                Authorization:
                  "Bearer " + localStorage.getItem("gh_token"),
              },
              body: JSON.stringify({
                message: "Erstatt bilde i " + room.name,
                content: base64Data,
              }),
            }
          )

          rimg.src = rimgPath
          rimg.removeAttribute("data-replaced")
        }

        const newMarkdown = domToMarkdown(content as HTMLElement)
        await saveRoom(room, newMarkdown, "Oppdater " + room.name)
      }

      setEditMode(false)
      clearCache()
      await fetchRooms()
    } catch (err) {
      alert("Feil ved lagring: " + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Laster...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-muted-foreground">
        <p>Kunne ikke laste data.</p>
        <p className="text-sm">{error}</p>
        <Button onClick={() => setSettingsOpen(true)}>
          Legg til GitHub-token
        </Button>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onTokenSaved={fetchRooms}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onSettingsOpen={() => setSettingsOpen(true)}
        editMode={editMode}
        activeSlug={slug}
        onEdit={() => setEditMode(true)}
        onCancel={() => {
          setEditMode(false)
          fetchRooms()
        }}
        onSave={handleSave}
        saving={saving}
        hasToken={hasToken()}
      />
      <div className="flex" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
        <Sidebar
          rooms={rooms}
          activeSlug={slug}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 p-8 max-w-[calc(720px+4rem*2)]">
          {!slug ? (
            <Landing rooms={rooms} />
          ) : room ? (
            <RoomView
              key={room.slug + (editMode ? "-edit" : "-view")}
              room={room}
              editMode={editMode}
              onMarkdownChange={() => {}}
              onReload={fetchRooms}
            />
          ) : (
            <div>
              <h1 className="text-xl font-semibold">Ikke funnet</h1>
              <p>
                <a href="#" className="underline">
                  Tilbake til oversikten
                </a>
              </p>
            </div>
          )}
        </main>
      </div>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onTokenSaved={fetchRooms}
      />
    </div>
  )
}
