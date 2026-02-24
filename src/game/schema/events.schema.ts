import type { GameEvent } from '../types'
import rawEvents from '../data/events.json'

export const EVENT_REGISTRY: GameEvent[] = rawEvents as unknown as GameEvent[]
