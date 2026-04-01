export interface Player {
  id: string;
  name: string;
  role: 'BAT' | 'BOWL' | 'AR' | 'WK';
  team: string;
  points: number;
  credits: number;
  status?: 'playing' | 'substitute' | 'unavailable';
}

export interface Match {
  id: string;
  team1: string;
  team2: string;
  startTime: string;
  status: 'upcoming' | 'live' | 'completed';
  score?: string;
  toss?: string;
  currentBatter?: string;
  currentBowler?: string;
  winners?: {
    first: string; // userId
    second: string; // userId
  };
}

export interface UserTeam {
  id: string;
  userId: string;
  matchId: string;
  players: string[]; // Array of player IDs
  captainId: string;
  viceCaptainId: string;
  totalPoints: number;
}

export interface Contest {
  id: string;
  matchId: string;
  name: string;
  participants: string[]; // Array of user IDs
  maxParticipants: number;
}
