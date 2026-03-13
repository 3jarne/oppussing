import { slugify } from "./github"
import type { RoomStats } from "@/types"

function parseInline(text: string): string {
  return text
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy">'
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(
      /\[\[([^\]]+)\]\]/g,
      (_, name: string) => '<a href="#' + slugify(name) + '">' + name + "</a>"
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
}

function pillify(text: string): string | null {
  const t = text
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/å/g, "a")
    .trim()
  if (t === "lav")
    return '<span class="pill pill-secondary" data-pill="Lav">Lav</span>'
  if (t === "middels")
    return '<span class="pill pill-secondary" data-pill="Middels">Middels</span>'
  if (t === "hog" || t === "hoy")
    return '<span class="pill pill-default" data-pill="Høy">Høy</span>'
  if (t === "sjolv" || t === "selv")
    return '<span class="pill pill-secondary" data-pill="Selv">Selv</span>'
  if (t === "handverkar" || t === "handverker")
    return '<span class="pill pill-default" data-pill="Håndverker">Håndverker</span>'
  return null
}

export function renderMarkdown(text: string): string {
  const lines = text.split("\n")
  let html = ""
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === "") {
      i++
      continue
    }
    const hm = line.match(/^(#{1,6})\s+(.+)$/)
    if (hm) {
      const level = hm[1].length
      html += "<h" + level + ">" + parseInline(hm[2]) + "</h" + level + ">"
      const headingText = hm[2].trim().toLowerCase()
      if (
        headingText === "planer" ||
        headingText === "ideer" ||
        headingText === "idéer"
      ) {
        let j = i + 1
        while (j < lines.length && lines[j].trim() === "") j++
        if (j >= lines.length || !lines[j].match(/^\|/)) {
          if (headingText === "planer") {
            html +=
              '<div class="empty-table-placeholder">Klikk for å legge til første plan</div>'
          }
        }
      }
      i++
      continue
    }
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      html += "<hr>"
      i++
      continue
    }
    if (line.match(/^\|/)) {
      const rows: string[] = []
      while (i < lines.length && lines[i].match(/^\|/)) {
        rows.push(lines[i])
        i++
      }
      if (rows.length >= 2) {
        const hdr = rows[0]
          .split("|")
          .filter((c) => c.trim() !== "")
          .map((c) => c.trim())
        html += "<table><thead><tr>"
        hdr.forEach((h) => {
          html += "<th>" + parseInline(h) + "</th>"
        })
        html += "</tr></thead><tbody>"
        const colTotals = new Array(hdr.length).fill(0)
        let hasSum = false
        for (let r = 2; r < rows.length; r++) {
          const cells = rows[r]
            .split("|")
            .filter((c) => c.trim() !== "")
            .map((c) => c.trim())
          html += "<tr>"
          cells.forEach((c, idx) => {
            const pill = pillify(c)
            const krMatch = c.match(/^([\d\s]+)\s*kr$/)
            if (krMatch) {
              colTotals[idx] += parseInt(krMatch[1].replace(/\s/g, ""), 10)
              hasSum = true
            }
            html += "<td>" + (pill || parseInline(c)) + "</td>"
          })
          html += "</tr>"
        }
        if (hasSum) {
          html += '<tr class="table-sum">'
          for (let ci = 0; ci < hdr.length; ci++) {
            if (colTotals[ci] > 0) {
              html +=
                "<td>" + colTotals[ci].toLocaleString("nb-NO") + " kr</td>"
            } else if (ci === 0) {
              html += "<td><strong>Totalt</strong></td>"
            } else {
              html += "<td></td>"
            }
          }
          html += "</tr>"
        }
        html += "</tbody></table>"
      }
      continue
    }
    if (line.match(/^>\s?/)) {
      const bq: string[] = []
      while (i < lines.length && lines[i].match(/^>\s?/)) {
        bq.push(lines[i].replace(/^>\s?/, ""))
        i++
      }
      html +=
        "<blockquote><p>" + parseInline(bq.join(" ")) + "</p></blockquote>"
      continue
    }
    if (line.match(/^[-*]\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        const t = lines[i].replace(/^[-*]\s/, "").trim()
        if (t) items.push(t)
        i++
      }
      if (items.length > 0) {
        html += "<ul>"
        items.forEach((it) => {
          html += "<li>" + parseInline(it) + "</li>"
        })
        html += "</ul>"
      }
      continue
    }
    const im = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (im) {
      const images: Array<{ alt: string; src: string }> = []
      while (i < lines.length) {
        const imm = lines[i].match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
        if (imm) {
          images.push({ alt: imm[1], src: imm[2] })
          i++
        } else if (lines[i].trim() === "") {
          i++
        } else {
          break
        }
      }
      if (images.length > 0) {
        html += '<div class="image-grid">'
        images.forEach((img) => {
          html +=
            '<figure class="image-card"><img src="' +
            img.src +
            '" alt="' +
            img.alt +
            '" loading="lazy">'
          html += "<figcaption>" + img.alt + "</figcaption></figure>"
        })
        html += "</div>"
      }
      continue
    }
    const pLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].match(/^[-*]\s/) &&
      !lines[i].match(/^>\s?/) &&
      !lines[i].match(/^(\*{3,}|-{3,}|_{3,})$/)
    ) {
      pLines.push(lines[i])
      i++
    }
    html += "<p>" + parseInline(pLines.join(" ")) + "</p>"
  }
  return html
}

export function getExcerpt(md: string): string {
  const lines = md.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    if (!l || l.match(/^#{1,6}\s/) || l === "-" || l === "- ") continue
    const c = l
      .replace(/^>\s?/, "")
      .replace(/^[-*]\s/, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .trim()
    if (c) return c.length > 120 ? c.substring(0, 120) + "..." : c
  }
  return ""
}

export function getRoomStats(md: string): RoomStats {
  const lines = md.split("\n")
  let planCount = 0
  let totalCost = 0
  let inTable = false
  let headerSkipped = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/^\|/)) {
      if (!inTable) {
        inTable = true
        headerSkipped = false
        continue
      }
      if (!headerSkipped) {
        headerSkipped = true
        continue
      }
      const cells = line
        .split("|")
        .filter((c) => c.trim() !== "")
      if (cells.length > 0 && cells[0].trim()) {
        planCount++
        cells.forEach((c) => {
          const m = c.trim().match(/^([\d\s]+)\s*kr$/)
          if (m) totalCost += parseInt(m[1].replace(/\s/g, ""), 10)
        })
      }
    } else {
      inTable = false
      headerSkipped = false
    }
  }
  return { count: planCount, cost: totalCost }
}

export function formatDate(iso: string): string {
  if (!iso) return ""
  try {
    return new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
