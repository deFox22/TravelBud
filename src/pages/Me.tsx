import { useEffect, useState } from 'react'
import { Camera, ChartColumn, ChevronRight, IdCard, KeyRound, Settings as SettingsIcon, Share2, Smartphone, X, type LucideIcon } from 'lucide-react'
import { backupDueAfterDays, shareBackup, supportsFolderBackup } from '../lib/backup'
import { canPromptInstall, dismissHomeScreenTip, homeScreenTipDismissed, isIOS, isStandalone, onInstallChange, promptInstall } from '../lib/pwa'
import type { Page } from '../lib/types'
import { useStore } from '../lib/store'
import { CountUp, StatStrip } from '../components/ui'
import { Fox } from '../components/Fox'
import { BADGES, completedTrips, isEarned, visitedPlaces } from '../lib/badges'
import { daysBetween, fmtDate, plural, todayISO } from '../lib/util'

const BASE = import.meta.env.BASE_URL

/** Me: who you are, the numbers, and the doors to everything that isn't a trip. */
export function Me({ go, openSettings }: { go: (p: Page, id?: string) => void; openSettings: () => void }) {
  const { data, update } = useStore()
  const [tip, setTip] = useState(() => !isStandalone() && isIOS() && !homeScreenTipDismissed())
  const [installable, setInstallable] = useState(canPromptInstall)
  useEffect(() => onInstallChange(() => setInstallable(canPromptInstall())), [])
  const since = data.profile.lastBackup ? daysBetween(data.profile.lastBackup, todayISO()) : null
  const backupDue = since === null || since > backupDueAfterDays()
  const countries = new Set(visitedPlaces(data).map(p => p.country).filter(Boolean)).size
  const badges = BADGES.filter(b => isEarned(b, data)).length
  const rows: { icon: LucideIcon; label: string; sub: string; onClick: () => void }[] = [
    { icon: Camera, label: 'Memories', sub: plural(data.memories.length, 'memory', 'memories'), onClick: () => go('memories') },
    { icon: IdCard, label: 'Travel wallet', sub: `${plural(data.docs.length, 'document')} · ${plural(data.loyalty.length, 'program')} · ${plural(data.contacts.length, 'contact')}`, onClick: () => go('wallet') },
    { icon: KeyRound, label: 'Sitters & home guide', sub: data.sitters.length ? plural(data.sitters.length, 'trusted person', 'trusted people') : 'Who watches the house', onClick: () => go('sitters') },
    { icon: ChartColumn, label: 'Insights & year in review', sub: 'Globe, stamps, year by year', onClick: () => go('insights') },
    { icon: SettingsIcon, label: 'Settings & backup', sub: data.profile.lastBackup ? `Last backup ${fmtDate(data.profile.lastBackup)}` : 'Theme, export, import', onClick: openSettings },
  ]
  if (!supportsFolderBackup())
    rows.splice(4, 0, {
      icon: Share2,
      label: 'Back up now',
      sub: backupDue ? (since === null ? 'No backup yet: hand a copy to Files or iCloud Drive' : `Due: last one ${plural(since, 'day')} ago`) : `Last backup ${fmtDate(data.profile.lastBackup)} · weekly is plenty`,
      onClick: async () => {
        const how = await shareBackup(data)
        if (how !== 'cancelled') update(d => ({ ...d, profile: { ...d.profile, lastBackup: todayISO() } }))
      },
    })
  return (
    <div className="page">
      <div className="me-head card">
        <Fox variant="ranger" size={120} />
        <div>
          <p className="eyebrow">Ranger</p>
          <h1>{data.profile.name || 'Traveler'}</h1>
          <p className="muted">{data.profile.homeBase ? `Home base ${data.profile.homeBase}` : 'Set your name and home base in Settings'}</p>
        </div>
      </div>
      <StatStrip
        stats={[
          { n: <CountUp n={countries} />, label: countries === 1 ? 'country' : 'countries' },
          { n: <CountUp n={completedTrips(data).length} />, label: 'trips' },
          { n: <CountUp n={badges} />, label: 'badges' },
          { n: <CountUp n={visitedPlaces(data).length} />, label: 'stamps' },
        ]}
        onPress={() => go('badges')}
      />
      {tip && (
        <div className="card pad home-tip">
          <Smartphone size={22} />
          <div>
            <b>Put TravelBud on your Home Screen</b>
            <p className="muted small">In Safari, tap Share, then <b>Add to Home Screen</b>. It opens full screen and works offline.</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Dismiss"
            onClick={() => {
              dismissHomeScreenTip()
              setTip(false)
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {installable && (
        <button type="button" className="card pad home-tip" onClick={() => void promptInstall()}>
          <Smartphone size={22} />
          <div>
            <b>Install TravelBud</b>
            <p className="muted small">Its own window, an icon on your device, and it works offline.</p>
          </div>
          <ChevronRight size={18} className="muted" />
        </button>
      )}
      <div className="card rows">
        {rows.map(r => (
          <button type="button" key={r.label} className="row-item" onClick={r.onClick}>
            <span className="row-ico">
              <r.icon size={20} />
            </span>
            <span className="row-text">
              <span className="row-label">{r.label}</span>
              <span className="row-sub">{r.sub}</span>
            </span>
            <ChevronRight size={18} className="muted" />
          </button>
        ))}
      </div>
      <div className="about">
        <img src={`${BASE}brand/logo/travelbud-mark.svg`} alt="" width={48} height={48} />
        <div>
          <div className="about-name">TravelBud</div>
          <div className="muted small">v2 · Daylight Trail. Everything stays on this device.</div>
        </div>
      </div>
    </div>
  )
}
