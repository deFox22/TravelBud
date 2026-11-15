import { useEffect, useRef, useState } from 'react'
import type { AppData, Theme } from '../lib/types'
import { emptyData, normalize, useStore } from '../lib/store'
import { Field, Modal } from '../components/ui'
import { download, plural, todayISO } from '../lib/util'
import { Fox } from '../components/Fox'
import { Download, Upload, FolderCheck, FolderOpen } from 'lucide-react'
import { backupPermission, chooseBackupFolder, forgetBackupFolder, getBackupFolder, requestBackupPermission, supportsFolderBackup, writeBackup } from '../lib/backup'

export function Settings({ onClose }: { onClose: () => void }) {
  const { data, update, replace } = useStore()
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const stamp = todayISO()
    download(`travelbud-backup-${stamp}.json`, JSON.stringify({ ...data, profile: { ...data.profile, lastBackup: stamp } }, null, 2))
    update(d => ({ ...d, profile: { ...d.profile, lastBackup: stamp } }))
    setMsg('Backup downloaded. Keep it somewhere safe, like a cloud drive.')
  }

  const importJson = async (f: File | undefined) => {
    if (!f) return
    try {
      const parsed = JSON.parse(await f.text()) as Partial<AppData>
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.trips)) throw new Error('Not a TravelBud backup')
      const incoming = normalize(parsed)
      const summary = `${plural(incoming.places.length, 'place')}, ${plural(incoming.memories.length, 'memory', 'memories')}, ${plural(incoming.trips.length, 'trip')}, ${plural(incoming.sitters.length, 'sitter')}`
      if (!confirm(`Replace everything currently in TravelBud with this backup?\n\nBackup contains ${summary}.`)) return
      replace(incoming)
      setMsg(`Restored ${summary}.`)
    } catch (err) {
      setMsg(`Could not import that file: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const wipe = () => {
    if (!confirm('Erase ALL TravelBud data on this device? Export a backup first if you might want it back.')) return
    if (!confirm('Last chance. Really erase everything?')) return
    replace(emptyData())
    setMsg('Everything cleared.')
  }

  const photoCount = data.memories.reduce((s, m) => s + m.photos.length, 0) + data.trips.filter(t => t.cover).length

  const [folder, setFolder] = useState<{ name: string; perm: 'granted' | 'prompt' | 'denied' } | null>(null)
  const refreshFolder = async () => {
    const h = await getBackupFolder()
    if (!h) return setFolder(null)
    setFolder({ name: h.name, perm: await backupPermission(h) })
  }
  useEffect(() => {
    void refreshFolder()
  }, [])
  const pickFolder = async () => {
    try {
      const h = await chooseBackupFolder()
      await writeBackup(h, data)
      update(d => ({ ...d, profile: { ...d.profile, lastBackup: todayISO() } }))
      await refreshFolder()
      setMsg(`Backing up to “${h.name}”. A first copy was written just now.`)
    } catch {
      /* cancelled */
    }
  }

  return (
    <Modal title="Settings & backup" onClose={onClose}>
      <div className="form">
        <div className="row">
          <Field label="Your name" hint="Used for the greeting on the home page.">
            <input type="text" value={data.profile.name} onChange={e => update(d => ({ ...d, profile: { ...d.profile, name: e.target.value } }))} placeholder="First name" />
          </Field>
          <Field label="Home base">
            <input type="text" value={data.profile.homeBase} onChange={e => update(d => ({ ...d, profile: { ...d.profile, homeBase: e.target.value } }))} placeholder="City you fly out of" />
          </Field>
        </div>

        <Field label="Appearance">
          <div className="radio-group">
            {(['auto', 'light', 'dark'] as Theme[]).map(t => (
              <label key={t} className={data.profile.theme === t ? 'on' : ''}>
                <input type="radio" name="theme" checked={data.profile.theme === t} onChange={() => update(d => ({ ...d, profile: { ...d.profile, theme: t } }))} />
                {t === 'auto' ? '🌓 Match system' : t === 'light' ? '☀️ Light' : '🌙 Dark'}
              </label>
            ))}
          </div>
        </Field>

        <div className="divider" />

        <div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Your data</h3>
          <p className="muted small">
            Everything lives in this browser on this device: {plural(data.places.length, 'place')}, {plural(data.memories.length, 'memory', 'memories')}, {plural(data.trips.length, 'trip')}, {plural(data.sitters.length, 'sitter')}, and {plural(photoCount, 'photo')}. Nothing is uploaded anywhere. Export a backup now and then, and to move to another device.
          </p>
        </div>
        <div className="row">
          <button type="button" className="btn primary" onClick={exportJson}>
            <Download size={15} /> Export backup
          </button>
          <label className="btn file-btn" style={{ justifyContent: 'center' }}>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={e => importJson(e.target.files?.[0])} />
            <Upload size={15} /> Import backup
          </label>
        </div>
        {msg && <p className="small" style={{ color: 'var(--primary)' }}>{msg}</p>}

        <div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Automatic backup</h3>
          {!supportsFolderBackup() ? (
            <p className="muted small">Available in Chrome or Edge on a computer: pick a folder once (a cloud-synced one is ideal) and TravelBud keeps a backup file there up to date. On a phone, export a backup now and then.</p>
          ) : folder ? (
            <div className="pills">
              <span className="pill green">
                <FolderCheck size={13} /> {folder.name}
              </span>
              {folder.perm === 'prompt' && (
                <button
                  type="button"
                  className="btn sm primary"
                  onClick={async () => {
                    const h = await getBackupFolder()
                    if (h) await requestBackupPermission(h)
                    await refreshFolder()
                  }}
                >
                  Resume
                </button>
              )}
              <button type="button" className="btn sm" onClick={pickFolder}>
                Change folder
              </button>
              <button
                type="button"
                className="btn sm ghost"
                onClick={async () => {
                  await forgetBackupFolder()
                  await refreshFolder()
                }}
              >
                Stop
              </button>
              <span className="muted small" style={{ flexBasis: '100%' }}>
                Writes TravelBud-backup.json about 15 seconds after any change, plus one dated copy per month. Last backup {data.profile.lastBackup ? fmtDateShort(data.profile.lastBackup) : 'never'}.
              </span>
            </div>
          ) : (
            <div className="pills">
              <button type="button" className="btn" onClick={pickFolder}>
                <FolderOpen size={15} /> Choose a backup folder
              </button>
              <span className="muted small">Pick a folder inside Dropbox, OneDrive, or Google Drive and the backup follows you.</span>
            </div>
          )}
        </div>

        <div className="about">
          <Fox mood="happy" size={56} />
          <div>
            <div className="about-name">
              TravelBud <span className="muted small">v1.0</span>
            </div>
            <div className="muted small">All things travel, with Scout. Your memories, places, plans, and the people who watch the house, kept on this device.</div>
          </div>
        </div>

        <div className="danger-zone">
          <h3>Start over</h3>
          <p className="muted small" style={{ marginBottom: 10 }}>Erases all data on this device. Cannot be undone unless you have a backup.</p>
          <button type="button" className="btn danger" onClick={wipe}>
            Erase everything
          </button>
        </div>
      </div>
    </Modal>
  )
}

const fmtDateShort = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
