import type { CreatorProfile } from "~/types/api"

export interface FollowedCreatorSnapshot extends CreatorProfile {
  followedAt: string
}
