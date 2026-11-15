import { del, get, set } from 'idb-keyval'
import type { AppData } from './types'
import { todayISO } from './util'

/* Automatic backups to a folder the user picks once, via the File System Access API
   (Chrome and Edge on desktop). The folder handle is remembered in IndexedDB; the
   browser asks for permission again after a restart, which needs a click. */

const KEY = 'travelbud:backupDir'
const LATEST = 'TravelBud-backup.json'

type Perm = 'granted' | 'prompt' | 'denied'
interface DirHandle {
  name: string
  kind: 'directory'
  queryPermission(opts: { mode: 'readwrite' }): Promise<Perm>
  requestPermission(opts: { mode: 'readwrite' }): Promise<Perm>
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }> }>
}

export const supportsFolderBackup = (): boolean => typeof window !== 'undefined' && 'showDirectoryPicker' in window

export async function chooseBackupFolder(): Promise<DirHandle> {
  const picker = (window as unknown as { showDirectoryPicker: (o: object) => Promise<DirHandle> }).showDirectoryPicker
  const h = await picker({ mode: 'readwrite', id: 'travelbud-backup', startIn: 'documents' })
  await set(KEY, h)
  return h
}

export async function getBackupFolder(): Promise<DirHandle | null> {
  try {
    return ((await get(KEY)) as DirHandle | undefined) ?? null
  } catch {
    return null
  }
}

export const forgetBackupFolder = () => del(KEY)

export async function backupPermission(h: DirHandle): Promise<Perm> {
  try {
    return await h.queryPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

export async function requestBackupPermission(h: DirHandle): Promise<Perm> {
  try {
    return await h.requestPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

/** Write the latest backup, plus one dated copy per month so an old mistake can be undone. */
export async function writeBackup(h: DirHandle, data: AppData): Promise<void> {
  const json = JSON.stringify(data)
  const latest = await h.getFileHandle(LATEST, { create: true })
  const w = await latest.createWritable()
  await w.write(json)
  await w.close()
  const monthly = `TravelBud-backup-${todayISO().slice(0, 7)}.json`
  try {
    await h.getFileHandle(monthly)
  } catch {
    const f = await h.getFileHandle(monthly, { create: true })
    const w2 = await f.createWritable()
    await w2.write(json)
    await w2.close()
  }
}

/** A backup file, with or without the photos inside. */
export function backupFile(data: AppData, opts: { photos: boolean } = { photos: true }): File {
  const stamp = todayISO()
  const body = opts.photos
    ? data
    : {
        ...data,
        memories: data.memories.map(m => ({ ...m, photos: [] })),
        trips: data.trips.map(t => ({ ...t, cover: undefined, bookings: t.bookings.map(b => ({ ...b, photos: undefined })) })),
      }
  const json = JSON.stringify({ ...body, profile: { ...body.profile, lastBackup: stamp } })
  return new File([json], `TravelBud-backup-${stamp}${opts.photos ? '' : '-words-only'}.json`, { type: 'application/json' })
}

/** On a phone, hand the backup to the share sheet (Files, iCloud Drive, email…); elsewhere, download it. */
export async function shareBackup(data: AppData, opts: { photos: boolean } = { photos: true }): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = backupFile(data, opts)
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'TravelBud backup' })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      /* fall through to a download */
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

/** Phones have no folder backup, so a reminder is due after a week; elsewhere after a month. */
export const backupDueAfterDays = (): number => (supportsFolderBackup() ? 30 : 7)
