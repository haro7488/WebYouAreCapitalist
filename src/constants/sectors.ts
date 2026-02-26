import type { Sector } from '@game/index'

/** 섹터 한국어 이름 (단일 정의) */
export const SECTOR_NAMES: Record<Sector, string> = {
  food: '외식',
  tech: '기술',
  realEstate: '부동산',
  logistics: '물류',
  energy: '에너지',
  finance: '금융',
  information: '정보',
  rnd: '연구개발',
}

/** 섹터 아이콘 */
export const SECTOR_ICONS: Record<Sector, string> = {
  food: '🍔', tech: '💻', realEstate: '🏢', logistics: '🚛',
  energy: '⚡', finance: '💰', information: '🔍', rnd: '🔬',
}

/** 섹터 아이콘+이름 (CompanyDetail용) */
export const SECTOR_NAMES_WITH_ICON: Record<Sector, string> = {
  food: '🍔 외식',
  tech: '💻 기술',
  realEstate: '🏢 부동산',
  logistics: '🚛 물류',
  energy: '⚡ 에너지',
  finance: '💰 금융',
  information: '🔍 정보',
  rnd: '🔬 연구개발',
}
