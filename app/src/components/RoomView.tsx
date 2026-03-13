import { useRef, useCallback } from "react"
import type { Room } from "@/types"
import { renderMarkdown, formatDate } from "@/lib/markdown"
import { hasToken, uploadImage, clearCache } from "@/lib/github"
import { domToMarkdown } from "@/lib/dom-to-markdown"

interface RoomViewProps {
  room: Room
  editMode: boolean
  onMarkdownChange: (md: string) => void
  onReload: () => void
}

export function RoomView({
  room,
  editMode,
  onMarkdownChange,
  onReload,
}: RoomViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const html = renderMarkdown(room.markdown)
  const dateStr = formatDate(room.lastModified)

  // Extract subtitle from blockquote after h1
  const processed = html.replace(
    /(<h1>.*?<\/h1>)(\s*<blockquote><p>(.*?)<\/p><\/blockquote>)?/,
    (_match: string, h1: string, _bqBlock: string, bqText: string) => {
      const sub =
        '<p class="subtitle text-sm text-muted-foreground' +
        (bqText ? "" : " empty:hidden") +
        '">' +
        (bqText || "") +
        "</p>"
      return (
        '<div class="room-header flex justify-between items-start mb-6"><div class="flex-1">' +
        h1 +
        sub +
        '</div><span class="text-xs text-muted-foreground whitespace-nowrap ml-4 mt-0.5">Sist oppdatert: ' +
        dateStr +
        "</span></div>"
      )
    }
  )

  // Collect markdown from DOM when requested
  const getMarkdown = useCallback(() => {
    if (contentRef.current) {
      return domToMarkdown(contentRef.current)
    }
    return room.markdown
  }, [room.markdown])

  // Expose getMarkdown via onMarkdownChange
  // We call it when save is triggered from parent
  if (editMode && contentRef.current) {
    onMarkdownChange(getMarkdown())
  }

  const handleEnterEditMode = useCallback(() => {
    const content = contentRef.current
    if (!content) return

    // Make elements editable
    content
      .querySelectorAll("h1, h2, h3, p, li, figcaption")
      .forEach((el) => {
        if (
          (el as HTMLElement).closest(".upload-area") ||
          el.classList.contains("date-label") ||
          el.classList.contains("text-muted-foreground")
        )
          return
        if (el.querySelector("img")) return
        el.setAttribute("contenteditable", "true")
      })

    // Make subtitle editable even when empty
    content.querySelectorAll(".subtitle").forEach((el) => {
      el.setAttribute("contenteditable", "true")
      el.classList.remove("empty:hidden")
      if (!el.textContent?.trim()) {
        ;(el as HTMLElement).style.minHeight = "1.4em"
        ;(el as HTMLElement).style.borderBottom = "1px dashed var(--border)"
      }
    })

    // Make table cells editable
    content.querySelectorAll("table").forEach((table) => {
      makeTableEditable(table as HTMLTableElement)
    })

    // Empty table placeholders
    content.querySelectorAll(".empty-table-placeholder").forEach((ph) => {
      ph.addEventListener("click", () => {
        const table = createEmptyPlanTable()
        ph.parentNode!.insertBefore(table, ph)
        makeTableEditable(table)
        const addBtn = createAddRowBtn(table)
        table.parentNode!.insertBefore(addBtn, table.nextSibling)
        ph.remove()
        addTableRow(table)
      })
    })

    // Image edit overlays
    content.querySelectorAll(".image-card, img").forEach((el) => {
      if (
        (el as HTMLElement).closest(".upload-area") ||
        (el as HTMLElement).closest(".img-edit-actions")
      )
        return
      let img: HTMLImageElement | null
      let container: HTMLElement
      if (el.tagName === "FIGURE") {
        img = el.querySelector("img")
        container = el as HTMLElement
      } else if (
        el.tagName === "IMG" &&
        !(el as HTMLElement).closest(".image-card")
      ) {
        img = el as HTMLImageElement
        container = el as HTMLElement
      } else {
        return
      }
      if (!img) return

      const actions = document.createElement("div")
      actions.className =
        "img-edit-actions absolute top-2 right-2 flex gap-1"

      const replaceBtn = document.createElement("button")
      replaceBtn.className =
        "bg-black/60 text-white border-none rounded-md px-2 py-1 text-xs font-medium cursor-pointer hover:bg-black/80"
      replaceBtn.textContent = "Erstatt"
      replaceBtn.addEventListener("click", () => {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = "image/*"
        input.addEventListener("change", () => {
          if (input.files!.length > 0) {
            const file = input.files![0]
            const reader = new FileReader()
            reader.onload = () => {
              img!.src = reader.result as string
              img!.dataset.replaced = "true"
              img!.dataset.file = file.name
            }
            reader.readAsDataURL(file)
          }
        })
        input.click()
      })

      const delBtn = document.createElement("button")
      delBtn.className =
        "bg-black/60 text-white border-none rounded-md px-2 py-1 text-xs font-medium cursor-pointer hover:bg-destructive"
      delBtn.textContent = "Slett"
      delBtn.addEventListener("click", () => container.remove())

      actions.appendChild(replaceBtn)
      actions.appendChild(delBtn)
      container.style.position = "relative"
      container.appendChild(actions)
    })

    // Add bullet buttons
    content.querySelectorAll("ul").forEach((ul) => {
      const addLiBtn = document.createElement("button")
      addLiBtn.className =
        "add-row-btn block w-full p-2 border border-dashed border-border rounded-md bg-transparent text-muted-foreground text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors -mt-4 mb-6"
      addLiBtn.textContent = "+ Legg til punkt"
      addLiBtn.addEventListener("click", () => {
        const li = document.createElement("li")
        li.setAttribute("contenteditable", "true")
        ul.appendChild(li)
        li.focus()
      })
      ul.parentNode!.insertBefore(addLiBtn, ul.nextSibling)
    })
  }, [])

  // Trigger edit setup after render
  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      ;(contentRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node
      if (node && editMode) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => handleEnterEditMode())
      }
    },
    [editMode, handleEnterEditMode]
  )

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    )
    if (files.length === 0 || !hasToken()) return
    for (const file of files) {
      try {
        await uploadImage(file, room.slug, room.name)
      } catch (err) {
        alert("Feil: " + (err as Error).message)
      }
    }
    clearCache()
    onReload()
  }

  return (
    <div
      ref={setContentRef}
      className={editMode ? "editing" : ""}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div
        className="room-content prose"
        dangerouslySetInnerHTML={{ __html: processed }}
      />
      {hasToken() && !editMode && (
        <div className="mt-6 p-6 border border-dashed border-border rounded-lg text-center cursor-pointer hover:border-ring hover:bg-accent transition-colors">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="upload-input"
            onChange={async (e) => {
              const files = Array.from(e.target.files || [])
              for (const file of files) {
                try {
                  await uploadImage(file, room.slug, room.name)
                } catch (err) {
                  alert("Feil: " + (err as Error).message)
                }
              }
              clearCache()
              onReload()
            }}
          />
          <label htmlFor="upload-input" className="cursor-pointer">
            <div className="text-2xl mb-2">📷</div>
            <p className="text-sm text-muted-foreground">
              Dra bilder hit eller klikk for å laste opp
            </p>
          </label>
        </div>
      )}
    </div>
  )
}

// --- Helper functions for edit mode (DOM manipulation) ---

function createEmptyPlanTable(): HTMLTableElement {
  const table = document.createElement("table")
  table.className = "w-full caption-bottom text-sm"
  table.innerHTML =
    "<thead><tr><th>Hva</th><th>Kompleksitet</th><th>Kostnad</th><th>Utføring</th></tr></thead><tbody></tbody>"
  return table
}

function makeTableEditable(table: HTMLTableElement) {
  table.querySelectorAll("tbody tr:not(.table-sum)").forEach((tr) => {
    const cells = tr.querySelectorAll("td")
    cells.forEach((td) => {
      const pill = td.querySelector("[data-pill]") as HTMLElement | null
      if (pill) {
        const value = pill.dataset.pill!
        const isUtforing = value === "Selv" || value === "Håndverker"
        const select = document.createElement("select")
        select.className =
          "appearance-none border-none bg-transparent text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer outline-none"
        if (isUtforing) {
          select.innerHTML = "<option>Selv</option><option>Håndverker</option>"
        } else {
          select.innerHTML =
            "<option>Lav</option><option>Middels</option><option>Høy</option>"
        }
        select.value = value
        updateSelectStyle(select)
        select.addEventListener("change", () => updateSelectStyle(select))
        td.innerHTML = ""
        td.appendChild(select)
      } else {
        td.setAttribute("contenteditable", "true")
      }
    })

    const delTd = document.createElement("td")
    delTd.style.width = "30px"
    delTd.innerHTML =
      '<button class="row-delete opacity-0 group-hover:opacity-100 bg-transparent border-none text-muted-foreground cursor-pointer text-sm p-1 rounded hover:text-destructive hover:bg-accent transition-opacity" title="Slett rad">&times;</button>'
    delTd.querySelector("button")!.addEventListener("click", () => tr.remove())
    tr.appendChild(delTd)
    ;(tr as HTMLElement).classList.add("group")
  })

  const lastTh = document.createElement("th")
  lastTh.style.width = "30px"
  table.querySelector("thead tr")!.appendChild(lastTh)

  const addBtn = createAddRowBtn(table)
  table.parentNode!.insertBefore(addBtn, table.nextSibling)
}

function createAddRowBtn(table: HTMLTableElement): HTMLButtonElement {
  const addBtn = document.createElement("button")
  addBtn.className =
    "add-row-btn block w-full p-2 border border-dashed border-border rounded-md bg-transparent text-muted-foreground text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors -mt-4 mb-6"
  addBtn.textContent = "+ Legg til rad"
  addBtn.addEventListener("click", () => addTableRow(table))
  return addBtn
}

function addTableRow(table: HTMLTableElement) {
  const headerCells = table.querySelectorAll("thead th")
  const numCols = headerCells.length - 1
  const tbody = table.querySelector("tbody")!
  const sumRow = tbody.querySelector(".table-sum")
  const tr = document.createElement("tr")
  tr.classList.add("group")

  for (let i = 0; i < numCols; i++) {
    const hText = headerCells[i].textContent!.toLowerCase()
    const td = document.createElement("td")
    td.className = "p-2 align-middle"
    if (hText === "kompleksitet") {
      const sel = document.createElement("select")
      sel.className =
        "appearance-none border-none bg-transparent text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer outline-none"
      sel.innerHTML =
        "<option>Lav</option><option>Middels</option><option>Høy</option>"
      updateSelectStyle(sel)
      sel.addEventListener("change", () => updateSelectStyle(sel))
      td.appendChild(sel)
    } else if (hText === "utføring" || hText === "utforing") {
      const sel = document.createElement("select")
      sel.className =
        "appearance-none border-none bg-transparent text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer outline-none"
      sel.innerHTML = "<option>Selv</option><option>Håndverker</option>"
      updateSelectStyle(sel)
      sel.addEventListener("change", () => updateSelectStyle(sel))
      td.appendChild(sel)
    } else if (hText === "kostnad") {
      td.setAttribute("contenteditable", "true")
      td.textContent = "0 kr"
    } else {
      td.setAttribute("contenteditable", "true")
    }
    tr.appendChild(td)
  }

  const delTd = document.createElement("td")
  delTd.style.width = "30px"
  delTd.innerHTML =
    '<button class="row-delete opacity-100 bg-transparent border-none text-muted-foreground cursor-pointer text-sm p-1 rounded hover:text-destructive hover:bg-accent" title="Slett rad">&times;</button>'
  delTd.querySelector("button")!.addEventListener("click", () => tr.remove())
  tr.appendChild(delTd)

  if (sumRow) tbody.insertBefore(tr, sumRow)
  else tbody.appendChild(tr)

  const first = tr.querySelector("[contenteditable]") as HTMLElement | null
  if (first) first.focus()
}

function updateSelectStyle(select: HTMLSelectElement) {
  const v = select.value
  select.className = select.className
    .replace(/bg-\S+/g, "")
    .replace(/text-\S+/g, "")
    .trim()
  if (v === "Lav" || v === "Middels" || v === "Selv") {
    select.className +=
      " bg-secondary text-secondary-foreground border border-border"
  } else {
    select.className += " bg-primary text-primary-foreground"
  }
}
