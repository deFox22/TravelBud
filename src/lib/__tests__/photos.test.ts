import { describe, expect, it } from 'vitest'
import { allPhotos, stripPhotos } from '../photos'
import { emptyData } from '../store'
import type { AppData } from '../types'

const sample = (): AppData => {
  const d = emptyData()
  d.memories.push({ id: 'm1', title: 'm', date: '2026-01-01', locationText: '', body: '', photos: [{ id: 'p1', dataUrl: 'data:1', thumb: 'data:t1', caption: 'hi' }], people: [], tags: [], favorite: false, createdAt: '' })
  d.trips.push({ id: 't1', title: 't', destination: '', startDate: '', endDate: '', status: 'planning', placeIds: [], budget: 0, currency: 'USD', expenses: [], itinerary: [], packing: [], bookings: [{ id: 'b1', kind: 'stay', title: 's', confirmation: '', date: '', notes: '', photos: [{ id: 'p2', dataUrl: 'data:2' }] }], ideas: [], notes: '', createdAt: '' })
  return d
}

describe('photo split', () => {
  it('finds photos on memories and bookings', () => {
    expect(allPhotos(sample()).map(p => p.id)).toEqual(['p1', 'p2'])
  })
  it('strips pixels but keeps ids and captions, without touching the original', () => {
    const d = sample()
    const lean = stripPhotos(d)
    expect(lean.memories[0].photos[0]).toEqual({ id: 'p1', dataUrl: '', caption: 'hi' })
    expect(lean.trips[0].bookings[0].photos?.[0]).toEqual({ id: 'p2', dataUrl: '' })
    expect(d.memories[0].photos[0].dataUrl).toBe('data:1')
    expect(JSON.stringify(lean)).not.toContain('data:1')
  })
})
