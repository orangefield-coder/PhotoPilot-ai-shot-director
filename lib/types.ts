export type ShotStatus = 'pending' | 'completed'

export type ShotType = string

export interface Shot {
  id: number
  title: string
  composition: string
  scene_prompt: string
  behavior: string
  lighting: string
  angle: string
  status: ShotStatus
  selectedPhoto?: string
  selectedPhotoIndex?: number
  savedRefs?: string[]  // URLs saved from XhsRefPanel or elsewhere
}

export interface SceneProfile {
  person: {
    person_count: number
    clothing: string
    style: string
    color_palette: string
  }
  scene: {
    type: string
    atmosphere?: string
    elements: string[]
  }
}

export interface Plan {
  plan_name: string
  shots: Shot[]
  profile?: SceneProfile
  xhsKeyword?: string  // keyword used to fetch ref images
}

export interface XhsRefItem {
  photoId: string
  title: string
  coverUrl: string
  link: string
  likeCount: number
  category: string
}

export interface PlanRecord {
  id: string
  created_at: string
  user_token: string
  scene_url: string | null
  selfie_url: string | null
  shot_type: string | null
  plan_json: Plan
  status: string
}

