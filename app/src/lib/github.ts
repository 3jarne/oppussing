import type { Room } from "@/types"

const API = "https://api.github.com"
const REPO = "3jarne/oppussing"
const CACHE_KEY = "oppussing_rooms_cache"
const CACHE_TTL = 60000

function getToken(): string {
  return localStorage.getItem("gh_token") || ""
}

export function setToken(t: string) {
  localStorage.setItem("gh_token", t)
}

export function hasToken(): boolean {
  return !!getToken()
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" }
  if (hasToken()) h["Authorization"] = "Bearer " + getToken()
  return h
}

async function apiFetch<T>(path: string): Promise<T> {
  const resp = await fetch(API + path, { headers: authHeaders() })
  if (!resp.ok) throw new Error("GitHub API: " + resp.status)
  return resp.json()
}

function decodeBase64UTF8(b64: string): string {
  const binStr = atob(b64.replace(/\n/g, ""))
  const bytes = new Uint8Array(binStr.length)
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/å/g, "a")
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY)
}

export async function loadRooms(): Promise<Room[]> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null")
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data
    }
  } catch {
    // ignore
  }

  const files = await apiFetch<Array<{ name: string }>>(
    "/repos/" + REPO + "/contents"
  )
  const mdFiles = files.filter(
    (f) => f.name.endsWith(".md") && !f.name.startsWith("\u{1F3E0}")
  )

  const rooms = await Promise.all(
    mdFiles.map(async (f) => {
      const name = f.name.replace(/\.md$/, "")
      const slug = slugify(name)

      const fileData = await apiFetch<{ content: string; sha: string }>(
        "/repos/" + REPO + "/contents/" + encodeURIComponent(f.name)
      )
      const markdown = decodeBase64UTF8(fileData.content)

      const commits = await apiFetch<
        Array<{ commit: { author: { date: string } } }>
      >(
        "/repos/" +
          REPO +
          "/commits?path=" +
          encodeURIComponent(f.name) +
          "&per_page=1"
      )
      const lastModified =
        commits.length > 0 ? commits[0].commit.author.date : ""

      return {
        name,
        slug,
        markdown,
        lastModified,
        path: f.name,
        sha: fileData.sha,
      }
    })
  )

  localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: rooms }))
  return rooms
}

export async function saveRoom(
  room: Room,
  newMarkdown: string,
  commitMessage: string
): Promise<string> {
  const fileData = await apiFetch<{ sha: string }>(
    "/repos/" + REPO + "/contents/" + encodeURIComponent(room.path)
  )
  const encodedContent = btoa(unescape(encodeURIComponent(newMarkdown)))

  await fetch(
    API + "/repos/" + REPO + "/contents/" + encodeURIComponent(room.path),
    {
      method: "PUT",
      headers: Object.assign(
        { "Content-Type": "application/json" },
        authHeaders()
      ),
      body: JSON.stringify({
        message: commitMessage,
        content: encodedContent,
        sha: fileData.sha,
      }),
    }
  )

  clearCache()
  return fileData.sha
}

export async function uploadImage(
  file: File,
  roomSlug: string,
  roomName: string
): Promise<string> {
  if (!hasToken()) throw new Error("Trenger GitHub-token for opplasting")

  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.readAsDataURL(file)
  })

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const imgName = Date.now() + "." + ext
  const imgPath = "bilder/" + roomSlug + "/" + imgName

  await fetch(API + "/repos/" + REPO + "/contents/" + imgPath, {
    method: "PUT",
    headers: Object.assign(
      { "Content-Type": "application/json" },
      authHeaders()
    ),
    body: JSON.stringify({
      message: "Legg til bilde i " + roomName,
      content: base64,
    }),
  })

  return imgPath
}
