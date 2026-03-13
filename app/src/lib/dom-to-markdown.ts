export function domToMarkdown(container: HTMLElement): string {
  let md = ""
  const children = container.children
  for (let i = 0; i < children.length; i++) {
    md += domElToMarkdown(children[i] as HTMLElement)
  }
  return md.trimEnd() + "\n"
}

function domElToMarkdown(el: HTMLElement): string {
  let md = ""
  if (
    el.classList?.contains("upload-area") ||
    el.classList?.contains("progress-bar") ||
    el.classList?.contains("upload-status") ||
    el.classList?.contains("date-label") ||
    el.classList?.contains("add-row-btn") ||
    el.classList?.contains("empty-table-placeholder")
  )
    return ""

  const tag = el.tagName

  // Room header wrapper
  if (tag === "DIV" && el.classList.contains("room-header")) {
    const h1 = el.querySelector("h1")
    const sub = el.querySelector(".subtitle")
    if (h1) md += "# " + h1.textContent!.trim() + "\n\n"
    if (sub) {
      const subText = sub.textContent!.trim()
      if (subText) md += "> " + subText + "\n\n"
    }
    return md
  }

  if (tag === "H1") md += "# " + el.textContent!.trim() + "\n\n"
  else if (tag === "H2") md += "## " + el.textContent!.trim() + "\n\n"
  else if (tag === "H3") md += "### " + el.textContent!.trim() + "\n\n"
  else if (tag === "P") {
    const text = el.textContent!.trim()
    if (text && !el.classList.contains("subtitle")) md += text + "\n\n"
  } else if (tag === "BLOCKQUOTE")
    md += "> " + el.textContent!.trim() + "\n\n"
  else if (tag === "UL") {
    el.querySelectorAll("li").forEach((li) => {
      const t = li.textContent!.trim()
      if (t) md += "- " + t + "\n"
    })
    md += "\n"
  } else if (tag === "HR") md += "---\n\n"
  else if (tag === "IMG") {
    const img = el as HTMLImageElement
    md += "![" + (img.alt || "") + "](" + img.getAttribute("src") + ")\n\n"
  } else if (tag === "DIV" && el.classList.contains("image-grid")) {
    el.querySelectorAll("figure.image-card").forEach((fig) => {
      const img = fig.querySelector("img")
      if (!img) return
      const caption = fig.querySelector("figcaption")
      const alt = caption
        ? caption.textContent!.trim()
        : img.alt || ""
      md += "![" + alt + "](" + img.getAttribute("src") + ")\n\n"
    })
    return md
  } else if (tag === "FIGURE" && el.classList.contains("image-card")) {
    const img = el.querySelector("img")
    if (img) {
      const caption = el.querySelector("figcaption")
      const alt = caption
        ? caption.textContent!.trim()
        : img.alt || ""
      md += "![" + alt + "](" + img.getAttribute("src") + ")\n\n"
    }
  } else if (tag === "TABLE") {
    md += tableToMarkdown(el) + "\n"
  } else if (tag === "DIV" && el.dataset.slot === "table-container") {
    const table = el.querySelector("table")
    if (table) md += tableToMarkdown(table) + "\n"
  }
  return md
}

function tableToMarkdown(table: HTMLElement): string {
  const headers: string[] = []
  table.querySelectorAll("thead th").forEach((th) => {
    const t = th.textContent!.trim()
    if (t) headers.push(t)
  })
  if (headers.length === 0) return ""

  let md = "| " + headers.join(" | ") + " |\n"
  md += "|" + headers.map(() => "---").join("|") + "|\n"

  table.querySelectorAll("tbody tr:not(.table-sum)").forEach((tr) => {
    const cells: string[] = []
    const tds = tr.querySelectorAll("td")
    for (let i = 0; i < tds.length; i++) {
      const td = tds[i]
      if (td.querySelector(".row-delete")) continue
      const select = td.querySelector("select") as HTMLSelectElement | null
      if (select) {
        cells.push(select.value)
      } else {
        const pill = td.querySelector("[data-pill]") as HTMLElement | null
        if (pill) {
          cells.push(pill.dataset.pill!)
        } else {
          cells.push(td.textContent!.trim())
        }
      }
    }
    if (cells.length > 0 && cells.some((c) => c)) {
      md += "| " + cells.join(" | ") + " |\n"
    }
  })
  return md
}
