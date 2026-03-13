import { Button } from "@/components/ui/button"
import { Menu, Settings } from "lucide-react"

interface HeaderProps {
  onMenuToggle: () => void
  onSettingsOpen: () => void
  editMode: boolean
  activeSlug: string
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  hasToken: boolean
}

export function Header({
  onMenuToggle,
  onSettingsOpen,
  editMode,
  activeSlug,
  onEdit,
  onCancel,
  onSave,
  saving,
  hasToken,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-4 px-6 h-14 border-b border-border bg-background sticky top-0 z-100">
      <Button
        variant="outline"
        size="icon-sm"
        className="md:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="size-4" />
      </Button>
      <h1 className="text-sm font-semibold flex-1 tracking-tight">
        <a href="#" className="text-foreground no-underline">
          Oppussing
        </a>
      </h1>
      <div className="flex gap-2 items-center">
        {activeSlug && hasToken && !editMode && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Rediger
          </Button>
        )}
        {editMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              Avbryt
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? "Lagrer..." : "Lagre"}
            </Button>
          </>
        )}
      </div>
      <Button variant="outline" size="icon-sm" onClick={onSettingsOpen}>
        <Settings className="size-4" />
      </Button>
    </header>
  )
}
