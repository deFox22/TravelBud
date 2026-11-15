export type Page = 'home' | 'memories' | 'places' | 'trips' | 'sitters' | 'wallet' | 'insights' | 'badges' | 'me'

export type PlaceStatus = 'visited' | 'wishlist'

export interface Place {
  id: string
  name: string
  country: string
  countryCode: string
  lat: number
  lng: number
  status: PlaceStatus
  rating: number
  firstVisited?: string
  notes: string
  createdAt: string
}

export interface Photo {
  id: string
  dataUrl: string
  /** Small version for grids and lists; falls back to dataUrl for older photos. */
  thumb?: string
  caption?: string
}

export interface Memory {
  id: string
  title: string
  date: string
  placeId?: string
  tripId?: string
  lat?: number
  lng?: number
  locationText: string
  body: string
  photos: Photo[]
  people: string[]
  tags: string[]
  favorite: boolean
  createdAt: string
}

export type TripStatus = 'dreaming' | 'planning' | 'booked' | 'completed'

export interface ItineraryItem {
  id: string
  time: string
  text: string
  done: boolean
}

export interface ItineraryDay {
  id: string
  date: string
  title: string
  items: ItineraryItem[]
}

export interface PackingItem {
  id: string
  text: string
  packed: boolean
}

export type BookingKind = 'flight' | 'stay' | 'train' | 'car' | 'activity' | 'other'

export interface Booking {
  id: string
  kind: BookingKind
  title: string
  confirmation: string
  date: string
  notes: string
  /** Listing or reservation link (Airbnb, Vrbo, hotel site…). */
  url?: string
  address?: string
  host?: string
  wifi?: string
  /** Door code, lockbox, parking: how to get in. */
  access?: string
  photos?: Photo[]
}

export interface Expense {
  id: string
  label: string
  amount: number
  category: string
}

export interface TripIdea {
  id: string
  text: string
  url: string
  scheduled: boolean
}

export interface Trip {
  id: string
  title: string
  destination: string
  startDate: string
  endDate: string
  status: TripStatus
  cover?: string
  placeIds: string[]
  budget: number
  currency: string
  expenses: Expense[]
  itinerary: ItineraryDay[]
  packing: PackingItem[]
  bookings: Booking[]
  ideas: TripIdea[]
  notes: string
  sitterId?: string
  createdAt: string
}

export type SitterRole = 'housesitter' | 'petsitter' | 'neighbor' | 'family' | 'friend' | 'other'

export interface SitterStint {
  id: string
  from: string
  to: string
  tripId?: string
  notes: string
}

export interface Sitter {
  id: string
  name: string
  role: SitterRole
  phone: string
  email: string
  rating: number
  trusted: boolean
  hasKey: boolean
  notes: string
  stints: SitterStint[]
  createdAt: string
}

export type DocKind = 'passport' | 'id' | 'license' | 'visa' | 'global_entry' | 'tsa_pre' | 'insurance' | 'vaccination' | 'other'

export interface TravelDoc {
  id: string
  kind: DocKind
  label: string
  holder: string
  number: string
  issued: string
  expires: string
  notes: string
}

export interface LoyaltyProgram {
  id: string
  program: string
  number: string
  tier: string
  notes: string
}

export interface EmergencyContact {
  id: string
  name: string
  relation: string
  phone: string
  email: string
}

export interface Pet {
  id: string
  name: string
  kind: string
  routine: string
  meds: string
  notes: string
}

export interface HomeVendor {
  id: string
  role: string
  name: string
  phone: string
}

export interface HomeGuide {
  address: string
  wifiName: string
  wifiPassword: string
  alarmCode: string
  keyInfo: string
  trashDay: string
  thermostat: string
  parking: string
  plants: string
  quirks: string
  pets: Pet[]
  vendors: HomeVendor[]
}

export type Theme = 'auto' | 'light' | 'dark'

export interface Profile {
  name: string
  homeBase: string
  theme: Theme
  lastBackup?: string
  /** Badges you have been shown as earned, with the day each unlocked. */
  badges?: { id: string; earnedAt: string }[]
  /** Day Scout's postcard was dismissed with "Later"; it rests until tomorrow. */
  postcardDismissed?: string
}

export interface AppData {
  version: 1
  places: Place[]
  memories: Memory[]
  trips: Trip[]
  sitters: Sitter[]
  docs: TravelDoc[]
  loyalty: LoyaltyProgram[]
  contacts: EmergencyContact[]
  home: HomeGuide
  profile: Profile
}
