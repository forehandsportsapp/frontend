export interface OptionsData {
  id: number;
  code: string;
  label: string;
}

export interface ProfileData {
  name: string;
  dob: string; // ISO 8601 string
  gender: string;
  phone: string;
  profilePicUrl?: string | null;
  profilePicPath?: string | null;
  playingHand?: string | null;
  primarySport?: string | null;
}

export interface OrganizationData {
  id?: string | null;
  name: string;
  description?: string | null;

  orgType?: OptionsData | null;
  orgTypeCode?: string | null;

  logoUrl?: string | null;
  logoPath?: string | null;
  establishedYear: number;
  website?: string | null;

  contactEmail: string;
  contactPhone: string;

  postalCode: string;
  state: string;
  city: string;
  address: string;

  verified: boolean;
}

export type TournamentState =
  | "drafted"
  | "published"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface TournamentData {
  id?: string | null;
  organizationId: string;
  organization?: OrganizationData | null;

  name: string;
  description: string;

  startDate: string; // ISO 8601 string
  endDate?: string | null;

  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
  venuePostalCode: string;
  venueCourts: number;

  logoUrl?: string | null;
  logoPath?: string | null;

  contactName: string;
  contactEmail: string;
  contactPhone: string;

  upiId?: string | null;

  tournamentState?: TournamentState | null;
  events?: EventData[] | null;
}

export type EventState =
  | "created"
  | "registration_closed"
  | "participants_finalized"
  | "scheduled"
  | "in_progress"
  | "round_over"
  | "completed"
  | "cancelled";

export interface EventData {
  id?: string | null;
  tournamentId: string;
  name: string;

  startDate: string; // ISO 8601 string
  dueDate: string; // ISO 8601 string

  sportsOptionCode?: string | null;
  sportsOption?: OptionsData | null;

  eventFormatCode?: string | null;
  eventFormat?: OptionsData | null;

  gender?: string | null;
  playerBornAfter?: string | null; // ISO 8601 string

  teamTypeId?: number | null;
  teamTypeCode?: string | null;
  teamType?: OptionsData | null;

  pointsPerSet: number;
  setsPerMatch: number;

  paymentModeCode?: string | null;
  paymentMode?: OptionsData | null;
  amount: number;

  winnerId?: string | null;
  eventState?: EventState | null;
  activeRound?: number | null;

  teams?: TeamData[] | null;
}

export type TeamStatus =
  | "created"
  | "registered"
  | "participating"
  | "rejected"
  | "disqualified";

export interface TeamData {
  id?: string | null;
  status?: TeamStatus | null;
  teamStatus?: TeamStatus | null;
  teamTypeCode?: string | null;
  teamType?: OptionsData | null;
  event?: EventData | null;
  participants?: ParticipantData[] | null;
}

export interface ParticipantData {
  id: string;
  eventId: string;
  name: string;
  userId?: string;
  user?: ProfileData | null;
  partnerId?: string; // for doubles
  status: "pending" | "confirmed" | "rejected";
  ageCategory?: string;
}

export interface MatchConfigData {
  scoringSystem: "sideout" | "rally";
  format: "singles" | "doubles";
  bestOf: number;
  pointsToWin: number;
  winByTwo: boolean;
  initialServer: 1 | 2;
  timeoutPerSet?: number;
  warmupMinutes?: number;
  switchSidesEvery?: number;
}

export interface ScoreEventData {
  seq: number;
  timestamp: number;
  actorId: string;
  type: "rally" | "fault" | "undo" | "set_end" | "match_end" | "server_change";
  details: Record<string, unknown>;
}

export interface LiveMatchStateData {
  matchId: string;
  currentSet: number;
  setScores: number[][]; // [setIndex][side0, side1]
  serverSide: 0 | 1;
  serverPlayerIndex?: number; // for doubles
  startedAt: number;
  scoreLog: ScoreEventData[];
}

export interface MatchData {
  id: string;
  eventId: string;
  round: number;
  slotIndex: number;
  player1Id?: string;
  player2Id?: string;
  pair1Ids?: string[];
  pair2Ids?: string[];
  scoreLog: ScoreEventData[];
  status: "upcoming" | "live" | "completed";
  config?: MatchConfigData;
  startedAt?: number;
  endedAt?: number;
}

export interface ScoreLockData {
  lockedBy?: string;
  expiresAt?: number;
}

export interface AppStateData {
  user: ProfileData | null;
  theme: "light" | "dark";
  orgs: OrganizationData[];
  activeOrgId?: string;
  tournaments: Record<string, TournamentData>;
  liveMatches: Record<string, LiveMatchStateData>;
  scoreLocks: Record<string, ScoreLockData>;
  offlineQueue: ScoreEventData[];
}

export interface TournamentSummaryEventData {
  eventId: string;
  eventName: string;
  eventState?: EventState | null;
  amount: number;
  totalCollected: number;
  totalTeams: number;
  enrolledParticipants: number;
  confirmedParticipants: number;
  totalMatches: number;
  completedMatches: number;
  liveMatches: number;
  remainingMatches: number;
  activeRound?: number | null;
  dueDate?: string | null;
  startDate?: string | null;
  stageText: string;
}

export interface TournamentSummaryData {
  tournamentId: string;
  updatedAt: string;
  events: TournamentSummaryEventData[];
}
