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
