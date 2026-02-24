import type { GovernmentEvent } from '../types'
import rawData from '../data/governmentEvents.json'

export const GOVERNMENT_EVENTS: GovernmentEvent[] = rawData as unknown as GovernmentEvent[]
