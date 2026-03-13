import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setToken, hasToken, clearCache } from "@/lib/github"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTokenSaved: () => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  onTokenSaved,
}: SettingsDialogProps) {
  const [tokenValue, setTokenValue] = useState(
    () => localStorage.getItem("gh_token") || ""
  )

  const connected = hasToken()

  const handleSave = () => {
    setToken(tokenValue.trim())
    clearCache()
    onOpenChange(false)
    onTokenSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Innstillinger</DialogTitle>
          <DialogDescription>
            {connected ? (
              <span className="text-green-600">✓ Koblet til GitHub</span>
            ) : (
              <span className="text-destructive">Ikke koblet til</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="token-input">
            GitHub Personal Access Token
          </label>
          <Input
            id="token-input"
            type="password"
            placeholder="ghp_..."
            value={tokenValue}
            onChange={(e) => setTokenValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Lag en token på{" "}
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Oppussing"
              target="_blank"
              className="underline"
            >
              github.com/settings/tokens
            </a>{" "}
            med <strong>repo</strong>-tilgang.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Lukk
          </Button>
          <Button onClick={handleSave}>Lagre</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
