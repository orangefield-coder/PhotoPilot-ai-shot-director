export type ShotStatus = 'pending' | 'completed'

export type ShotType = string

export interface Shot {
  id: number
  title: string
  goal: string
  environment: string
  pose: string
  composition: string
  focal_length: string
  reason: string
  status: ShotStatus
}

export interface Plan {
  plan_name: string
  shots: Shot[]
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

export interface SceneProfile {
  person: {
    clothing: string
    style: string
    color_palette: string
  }
  scene: {
    type: string
    atmosphere: string
    elements: string[]
  }
}
