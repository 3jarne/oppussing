export interface Room {
  name: string
  slug: string
  markdown: string
  lastModified: string
  path: string
  sha: string
}

export interface RoomStats {
  count: number
  cost: number
}
