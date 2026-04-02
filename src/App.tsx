import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, query, where, onSnapshot, setDoc, doc, getDoc, arrayUnion } from './firebase';
import { Match, Player, UserTeam, Contest } from './types';
import { getIPLMatches, getIPLPlayers, getLiveUpdate } from './services/cricketService';
import { Trophy, Users, Clock, LogOut, LogIn, ChevronRight, Check, AlertCircle, Edit3, Award, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myTeam, setMyTeam] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'matches' | 'team-builder' | 'live' | 'leaderboard'>('matches');
  const [allWinners, setAllWinners] = useState<any[]>([]);
  const [contestTeams, setContestTeams] = useState<UserTeam[]>([]);
  const [contestUsers, setContestUsers] = useState<Record<string, any>>({});
  const [teamValidation, setTeamValidation] = useState({
    wk: 0, bat: 0, bowl: 0, ar: 0, team1: 0, team2: 0
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL
        }, { merge: true });
      } else {
        setLoading(false);
        setLoadingMessage('');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && matches.length === 0) {
      fetchMatches();
      fetchWinners();
    }
  }, [user]);

  useEffect(() => {
    if (view === 'live' && selectedMatch) {
      const q = query(collection(db, 'teams'), where('matchId', '==', selectedMatch.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const teams = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserTeam));
        setContestTeams(teams);

        // Fetch user profiles for these teams
        teams.forEach(async (t) => {
          if (!contestUsers[t.userId]) {
            const uDoc = await getDoc(doc(db, 'users', t.userId));
            if (uDoc.exists()) {
              setContestUsers(prev => ({ ...prev, [t.userId]: uDoc.data() }));
            }
          }
        });
      });
      return () => unsubscribe();
    }
  }, [view, selectedMatch]);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    setLoadingMessage('Fetching Latest Fixtures...');
    try {
      const m = await getIPLMatches();
      if (m.length === 0) {
        setError('Failed to fetch matches. Please try again.');
      }
      const sortedMatches = m.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setMatches(sortedMatches);
    } catch (err: any) {
      if (err.message?.includes('429')) {
        setError('API Quota exceeded. Please wait a moment and try again.');
      } else {
        setError('An error occurred while fetching matches.');
      }
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const fetchWinners = () => {
    const q = query(collection(db, 'matches'), where('status', '==', 'completed'));
    return onSnapshot(q, (snapshot) => {
      const winnersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllWinners(winnersData);
    });
  };

  useEffect(() => {
    if (selectedMatch) {
      const selectedPlayers = players.filter(p => myTeam.includes(p.id));
      setTeamValidation({
        wk: selectedPlayers.filter(p => p.role === 'WK').length,
        bat: selectedPlayers.filter(p => p.role === 'BAT').length,
        bowl: selectedPlayers.filter(p => p.role === 'BOWL').length,
        ar: selectedPlayers.filter(p => p.role === 'AR').length,
        team1: selectedPlayers.filter(p => p.team === selectedMatch.team1).length,
        team2: selectedPlayers.filter(p => p.team === selectedMatch.team2).length,
      });
    }
  }, [myTeam, players, selectedMatch]);

  const handleSelectMatch = async (match: Match) => {
    setLoading(true);
    setError(null);
    setLoadingMessage('Fetching Match Details...');
    setSelectedMatch(match);
    
    try {
      // Fetch players for the match
      setLoadingMessage('Fetching Player Rosters...');
      const p = await getIPLPlayers(match.id, match.team1, match.team2);
      if (p.length === 0) {
        setError('Failed to fetch players. Please try again.');
        setLoading(false);
        return;
      }
      setPlayers(p);

      // Check if team already exists
      setLoadingMessage('Checking Your Squad...');
      const teamId = `${user.uid}_${match.id}`;
      const teamDoc = await getDoc(doc(db, 'teams', teamId));

      if (teamDoc.exists()) {
        const data = teamDoc.data();
        setMyTeam(data.players || []);
        setCaptainId(data.captainId || null);
        setViceCaptainId(data.viceCaptainId || null);
      } else {
        setMyTeam([]);
        setCaptainId(null);
        setViceCaptainId(null);
      }

      // If live, fetch latest score immediately
      if (match.status === 'live') {
        setLoadingMessage('Fetching Live Score...');
        const update = await getLiveUpdate(match);
        setSelectedMatch({ ...match, ...update });
        setView('live');
      } else if (match.status === 'completed') {
        setView('live');
      } else {
        setView('team-builder');
      }
    } catch (error: any) {
      if (error.message?.includes('429')) {
        setError('API Quota exceeded. Please wait a moment and try again.');
      } else {
        setError('Error selecting match. Please try again.');
      }
      console.error("Error selecting match:", error);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const togglePlayer = (playerId: string) => {
    if (selectedMatch?.status !== 'upcoming') return; // Cannot edit once live
    
    if (myTeam.includes(playerId)) {
      setMyTeam(myTeam.filter(id => id !== playerId));
      if (captainId === playerId) setCaptainId(null);
      if (viceCaptainId === playerId) setViceCaptainId(null);
    } else {
      if (myTeam.length < 11) {
        setMyTeam([...myTeam, playerId]);
      }
    }
  };

  const saveTeam = async () => {
    if (!selectedMatch) return;

    // Validate constraints
    if (myTeam.length !== 11) {
      setError("Select exactly 11 players.");
      return;
    }

    if (teamValidation.wk < 1) {
      setError("At least 1 Wicket Keeper (WK) required.");
      return;
    }
    if (teamValidation.bat < 1) {
      setError("At least 1 Batter (BAT) required.");
      return;
    }
    if (teamValidation.bowl < 1) {
      setError("At least 1 Bowler (BOWL) required.");
      return;
    }

    if (teamValidation.team1 < 4) {
      setError(`Select at least 4 players from ${selectedMatch.team1}.`);
      return;
    }
    if (teamValidation.team2 < 4) {
      setError(`Select at least 4 players from ${selectedMatch.team2}.`);
      return;
    }

    if (!captainId || !viceCaptainId) {
      setError("Select Captain and Vice-Captain.");
      return;
    }

    const teamId = `${user.uid}_${selectedMatch.id}`;
    await setDoc(doc(db, 'teams', teamId), {
      userId: user.uid,
      matchId: selectedMatch.id,
      players: myTeam,
      captainId,
      viceCaptainId,
      totalPoints: 0,
      updatedAt: new Date().toISOString()
    });

    const contestId = `contest_${selectedMatch.id}`;
    await setDoc(doc(db, 'contests', contestId), {
      matchId: selectedMatch.id,
      name: `${selectedMatch.team1} vs ${selectedMatch.team2} Friends Room`,
      participants: arrayUnion(user.uid),
      maxParticipants: 20
    }, { merge: true });

    alert("Team saved successfully!");
    setView('live');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'playing': return 'bg-green-500';
      case 'substitute': return 'bg-yellow-500';
      case 'unavailable': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#E4E3E0] font-mono">
      <div className="text-4xl font-black italic uppercase tracking-tighter mb-4 animate-pulse">CRIC_FREAKS</div>
      <div className="text-xs opacity-50 uppercase tracking-widest">{loadingMessage || 'LOADING_SYSTEM...'}</div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-10 h-10 text-[#F27D26]" />
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">CRIC_FREAKS</h1>
          </div>
          <p className="font-mono text-sm mb-8 opacity-70 italic">V2.0 // PRO_FANTASY_LEAGUE</p>
          <button 
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="w-full bg-black text-white py-4 font-bold uppercase flex items-center justify-center gap-3 hover:bg-[#F27D26] transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Connect with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#F27D26] selection:text-white">
      {/* Header */}
      <header className="border-b-2 border-black bg-white p-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('matches')}>
          <Trophy className="w-6 h-6 text-[#F27D26]" />
          <span className="font-black italic text-xl tracking-tighter">CRIC_FREAKS</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <div className="flex items-center gap-1">
              {matches.some(m => m.status === 'live') && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
              <span className="text-[10px] font-mono opacity-50 uppercase">Match_Day</span>
            </div>
            <span className="text-xs font-black italic uppercase">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <button onClick={() => setView('leaderboard')} className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all">
            <Award className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-mono opacity-50 uppercase">User_Session</span>
            <span className="text-sm font-bold">{user.displayName}</span>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-8">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border-2 border-red-500 text-red-700 flex items-center justify-between gap-4 font-mono text-xs"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button 
              onClick={() => view === 'matches' ? fetchMatches() : handleSelectMatch(selectedMatch!)}
              className="px-4 py-2 bg-red-500 text-white font-bold uppercase hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {view === 'matches' && (
            <motion.div 
              key="matches"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-2 border-black pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-11px font-mono uppercase opacity-50 italic">Live_Feed</h2>
                    <button 
                      onClick={fetchMatches}
                      className="text-[8px] font-mono underline opacity-30 hover:opacity-100 uppercase"
                    >
                      Refresh_Fixtures
                    </button>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">IPL_Match_Center</h3>
                </div>
              </div>

              <div className="grid gap-8">
                {Array.from(new Set(matches.map(m => new Date(m.startTime).toDateString()))).map(date => (
                  <div key={date} className="space-y-4">
                    <h4 className="text-[10px] font-mono font-black uppercase tracking-widest border-b border-black/10 pb-1">{date === new Date().toDateString() ? 'TODAY' : date}</h4>
                    <div className="grid gap-4">
                      {matches.filter(m => new Date(m.startTime).toDateString() === date).map((match) => (
                        <div 
                          key={match.id}
                          onClick={() => handleSelectMatch(match)}
                          className="group bg-white border-2 border-black p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 cursor-pointer hover:shadow-[8px_8px_0px_0px_rgba(242,125,38,1)] transition-all"
                        >
                          <div className="flex items-center gap-4 sm:gap-8 flex-1 w-full sm:w-auto">
                            <div className="text-center flex-1 sm:w-24">
                              <span className="block text-2xl sm:text-3xl font-black italic">{match.team1}</span>
                              <span className="text-[10px] font-mono opacity-50">HOME</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-mono font-bold text-[#F27D26]">VS</span>
                              <div className="h-px w-8 sm:w-12 bg-black opacity-20"></div>
                            </div>
                            <div className="text-center flex-1 sm:w-24">
                              <span className="block text-2xl sm:text-3xl font-black italic">{match.team2}</span>
                              <span className="text-[10px] font-mono opacity-50">AWAY</span>
                            </div>
                          </div>

                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 opacity-50" />
                              <div className="text-right">
                                <span className="block text-[10px] font-mono opacity-50 uppercase">{new Date(match.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                <span className="text-xs sm:text-sm font-mono font-black italic">{new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <div className={cn(
                              "px-3 py-1 text-[10px] font-mono font-bold uppercase border relative overflow-hidden",
                              match.status === 'live' ? "bg-[#F27D26] text-white border-[#F27D26]" : "border-black opacity-50"
                            )}>
                              {match.status === 'live' && <div className="absolute inset-0 bg-white/20 animate-[pulse_1s_infinite]"></div>}
                              <span className="relative z-10">{match.status}</span>
                            </div>
                            {match.toss && <span className="text-[8px] font-mono opacity-50 uppercase truncate max-w-[100px]">{match.toss}</span>}
                          </div>
                          <ChevronRight className="hidden sm:block w-6 h-6 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'team-builder' && selectedMatch && (
            <motion.div 
              key="builder"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="w-full sm:w-auto">
                  <button onClick={() => setView('matches')} className="text-xs font-mono uppercase opacity-50 hover:opacity-100 mb-2 flex items-center gap-1">
                    ← BACK_TO_FEED
                  </button>
                  <h3 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">Manage_Squad</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] opacity-50 uppercase">{selectedMatch.team1} vs {selectedMatch.team2}</span>
                    {selectedMatch.status !== 'upcoming' && (
                      <span className="bg-red-100 text-red-600 text-[10px] font-mono px-2 py-0.5 border border-red-200">LOCKED</span>
                    )}
                  </div>
                </div>
                <div className="bg-black text-white p-4 flex flex-wrap gap-4 sm:gap-8 w-full sm:w-auto justify-center">
                  <div className="text-center">
                    <span className="block text-2xl font-black italic">{myTeam.length}/11</span>
                    <span className="text-[10px] font-mono opacity-50 uppercase">Players</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-2xl font-black italic">
                      {players.filter(p => myTeam.includes(p.id)).reduce((acc, p) => acc + p.credits, 0).toFixed(1)}/100
                    </span>
                    <span className="text-[10px] font-mono opacity-50 uppercase">Credits</span>
                  </div>
                  <div className="hidden md:flex gap-4 border-l border-white/20 pl-8">
                    <div className="text-center">
                      <span className={cn("block text-sm font-black italic", teamValidation.wk < 1 ? "text-red-400" : "text-green-400")}>{teamValidation.wk}</span>
                      <span className="text-[8px] font-mono opacity-50 uppercase">WK</span>
                    </div>
                    <div className="text-center">
                      <span className={cn("block text-sm font-black italic", teamValidation.bat < 1 ? "text-red-400" : "text-green-400")}>{teamValidation.bat}</span>
                      <span className="text-[8px] font-mono opacity-50 uppercase">BAT</span>
                    </div>
                    <div className="text-center">
                      <span className={cn("block text-sm font-black italic", teamValidation.bowl < 1 ? "text-red-400" : "text-green-400")}>{teamValidation.bowl}</span>
                      <span className="text-[8px] font-mono opacity-50 uppercase">BOWL</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-sm font-black italic">{teamValidation.ar}</span>
                      <span className="text-[8px] font-mono opacity-50 uppercase">AR</span>
                    </div>
                  </div>
                  <div className="hidden md:flex gap-4 border-l border-white/20 pl-8">
                    <div className="text-center">
                      <span className={cn("block text-sm font-black italic", teamValidation.team1 < 4 ? "text-red-400" : "text-green-400")}>{teamValidation.team1}</span>
                      <span className="text-[8px] font-mono opacity-50 uppercase">{selectedMatch.team1}</span>
                    </div>
                    <div className="text-center">
                      <span className={cn("block text-sm font-black italic", teamValidation.team2 < 4 ? "text-red-400" : "text-green-400")}>{teamValidation.team2}</span>
                      <span className="text-[8px] font-mono opacity-50 uppercase">{selectedMatch.team2}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white border-2 border-black overflow-hidden">
                    <div className="grid grid-cols-5 sm:grid-cols-6 p-3 border-b-2 border-black bg-black text-white text-[10px] font-mono uppercase tracking-widest">
                      <div className="col-span-2 sm:col-span-3">Player_Name</div>
                      <div className="text-center">Role</div>
                      <div className="text-center">Status</div>
                      <div className="text-center">CR</div>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                      {players.map((player) => (
                        <div 
                          key={player.id}
                          onClick={() => togglePlayer(player.id)}
                          className={cn(
                            "grid grid-cols-5 sm:grid-cols-6 p-4 border-b border-black/10 cursor-pointer transition-colors hover:bg-[#F27D26]/5",
                            myTeam.includes(player.id) && "bg-[#F27D26]/10 border-l-4 border-l-[#F27D26]",
                            selectedMatch.status !== 'upcoming' && "cursor-not-allowed opacity-80"
                          )}
                        >
                          <div className="col-span-2 sm:col-span-3 flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 flex-shrink-0 flex items-center justify-center border-2 border-black font-black italic text-xs",
                              myTeam.includes(player.id) ? "bg-black text-white" : "bg-white"
                            )}>
                              {myTeam.includes(player.id) ? <Check className="w-4 h-4" /> : player.team.substring(0, 2)}
                            </div>
                            <div className="truncate">
                              <span className="block font-bold text-xs sm:text-sm uppercase truncate">{player.name}</span>
                              <span className="text-[10px] font-mono opacity-50">{player.team}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <span className="px-1.5 py-0.5 border border-black text-[9px] font-mono font-bold">{player.role}</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className={cn("w-2 h-2 rounded-full", getStatusColor(player.status))}></div>
                              <span className="text-[8px] font-mono uppercase opacity-50">{player.status || 'NA'}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center font-mono font-bold text-xs">
                            {player.credits}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black italic uppercase text-xl mb-4 border-b-2 border-black pb-2">Squad_Setup</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-mono uppercase opacity-50 block mb-2">Captain (2x)</label>
                        <select 
                          disabled={selectedMatch.status !== 'upcoming'}
                          className="w-full p-3 border-2 border-black font-bold uppercase text-xs sm:text-sm bg-white"
                          value={captainId || ''}
                          onChange={(e) => setCaptainId(e.target.value)}
                        >
                          <option value="">Choose Captain</option>
                          {players.filter(p => myTeam.includes(p.id)).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase opacity-50 block mb-2">Vice-Captain (1.5x)</label>
                        <select 
                          disabled={selectedMatch.status !== 'upcoming'}
                          className="w-full p-3 border-2 border-black font-bold uppercase text-xs sm:text-sm bg-white"
                          value={viceCaptainId || ''}
                          onChange={(e) => setViceCaptainId(e.target.value)}
                        >
                          <option value="">Choose Vice-Captain</option>
                          {players.filter(p => myTeam.includes(p.id)).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {selectedMatch.status === 'upcoming' ? (
                      <button 
                        disabled={myTeam.length !== 11 || !captainId || !viceCaptainId}
                        onClick={saveTeam}
                        className="w-full mt-8 bg-black text-white py-4 font-black uppercase italic tracking-widest disabled:opacity-30 hover:bg-[#F27D26] transition-colors"
                      >
                        {myTeam.length === 11 ? 'UPDATE_SQUAD' : 'SELECT_11_PLAYERS'}
                      </button>
                    ) : (
                      <div className="mt-8 p-4 border-2 border-red-500 bg-red-50 text-red-600 text-center font-black italic uppercase text-sm">
                        MATCH_LOCKED
                      </div>
                    )}
                  </div>

                  <div className="bg-white border-2 border-black p-4 flex items-start gap-3 opacity-50">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-[9px] font-mono leading-relaxed uppercase">
                      EDITING IS ONLY ALLOWED BEFORE MATCH START. PLAYER STATUS (PLAYING/SUB) IS UPDATED LIVE ONCE ANNOUNCED.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'live' && selectedMatch && (
            <motion.div 
              key="live"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="bg-black text-white p-6 sm:p-10 border-2 border-black flex flex-col items-center gap-6 text-center">
                <div className="flex items-center gap-3">
                  {selectedMatch.status === 'live' ? (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Live_Match_Center</span>
                    </>
                  ) : selectedMatch.status === 'completed' ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Match_Result</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Match_Preview</span>
                    </>
                  )}
                  {selectedMatch.status === 'live' && (
                    <button 
                      onClick={async () => {
                        if (selectedMatch) {
                          const update = await getLiveUpdate(selectedMatch);
                          setSelectedMatch({ ...selectedMatch, ...update });
                        }
                      }}
                      className="ml-2 text-[8px] font-mono underline opacity-50 hover:opacity-100"
                    >
                      REFRESH_SCORE
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-16">
                  <span className="text-4xl sm:text-6xl font-black italic">{selectedMatch.team1}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl sm:text-5xl font-black text-[#F27D26]">{selectedMatch.score || '0/0 (0.0)'}</span>
                    <span className="text-[10px] font-mono opacity-50 mt-2 uppercase tracking-widest">
                      {selectedMatch.status === 'completed' ? selectedMatch.result : (selectedMatch.toss || 'TOSS_PENDING')}
                    </span>
                  </div>
                  <span className="text-4xl sm:text-6xl font-black italic">{selectedMatch.team2}</span>
                </div>
                {selectedMatch.status === 'live' && (
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md border-t border-white/10 pt-6">
                    <div className="text-left">
                      <span className="block text-[8px] font-mono opacity-50 uppercase mb-1">Batting</span>
                      <span className="text-sm font-bold uppercase italic">{selectedMatch.currentBatter || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] font-mono opacity-50 uppercase mb-1">Bowling</span>
                      <span className="text-sm font-bold uppercase italic">{selectedMatch.currentBowler || 'N/A'}</span>
                    </div>
                  </div>
                )}
                {selectedMatch.status === 'completed' && (
                  <div className="w-full max-w-md border-t border-white/10 pt-6">
                    <span className="block text-[10px] font-mono opacity-50 uppercase mb-2 tracking-widest">Final_Result</span>
                    <span className="text-xl font-black italic uppercase text-[#F27D26]">{selectedMatch.result || 'Match Completed'}</span>
                  </div>
                )}
                {selectedMatch.status === 'upcoming' && (
                  <button 
                    onClick={() => setView('team-builder')}
                    className="mt-4 flex items-center gap-2 text-xs font-mono border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition-all"
                  >
                    <Edit3 className="w-4 h-4" /> EDIT_YOUR_SQUAD
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border-2 border-black p-6">
                  <h4 className="font-black italic uppercase text-xl mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Friends_Room
                  </h4>
                  <div className="space-y-4">
                    {contestTeams.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).map((team, idx) => {
                      const isMe = team.userId === user.uid;
                      const participant = contestUsers[team.userId];
                      return (
                        <div key={team.id} className={cn(
                          "flex items-center justify-between p-4 border-2 border-black",
                          isMe ? "bg-[#F27D26]/5" : "bg-white"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 flex items-center justify-center font-black italic",
                              isMe ? "bg-black text-white" : "bg-gray-100 text-black border-2 border-black"
                            )}>
                              {idx + 1}
                            </div>
                            <div>
                              <span className="block font-bold uppercase text-sm">
                                {participant?.displayName || (isMe ? user.displayName : 'Loading...')}
                                {isMe && " (YOU)"}
                              </span>
                              <span className="text-[10px] font-mono opacity-50 uppercase">SQUAD_READY</span>
                            </div>
                          </div>
                          <span className="font-mono font-black text-xl">{team.totalPoints?.toFixed(1) || '0.0'}</span>
                        </div>
                      );
                    })}
                    {contestTeams.length === 0 && (
                      <div className="p-8 text-center font-mono opacity-30 italic uppercase border-2 border-dashed border-black/20">
                        No_Teams_In_Room_Yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border-2 border-black p-6">
                  <h4 className="font-black italic uppercase text-xl mb-6 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5" />
                    Your_XI
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {players.filter(p => myTeam.includes(p.id)).map(p => (
                      <div key={p.id} className="p-3 border border-black/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(p.status))}></div>
                          <span className="text-[9px] font-mono font-bold opacity-50">{p.role}</span>
                          <span className="text-xs font-bold uppercase truncate">{p.name}</span>
                        </div>
                        <div className="flex gap-1">
                          {captainId === p.id && <span className="w-5 h-5 bg-black text-white text-[9px] flex items-center justify-center font-black">C</span>}
                          {viceCaptainId === p.id && <span className="w-5 h-5 border-2 border-black text-[9px] flex items-center justify-center font-black">VC</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'leaderboard' && (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <button onClick={() => setView('matches')} className="text-xs font-mono uppercase opacity-50 hover:opacity-100 mb-2 flex items-center gap-1">
                    ← BACK_TO_FEED
                  </button>
                  <h3 className="text-4xl font-black uppercase italic tracking-tighter">Hall_Of_Fame</h3>
                </div>
              </div>

              <div className="bg-white border-2 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="grid grid-cols-4 p-4 border-b-2 border-black bg-black text-white text-[10px] font-mono uppercase tracking-widest">
                  <div className="col-span-2">Match_Event</div>
                  <div className="text-center">1st_Place</div>
                  <div className="text-center">2nd_Place</div>
                </div>
                {allWinners.length > 0 ? (
                  allWinners.map((match) => (
                    <div key={match.id} className="grid grid-cols-4 p-6 border-b border-black/10 items-center">
                      <div className="col-span-2">
                        <span className="block font-black italic text-lg uppercase">{match.team1} vs {match.team2}</span>
                        <span className="text-[10px] font-mono opacity-50 uppercase">{new Date(match.startTime).toLocaleDateString()}</span>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="w-10 h-10 bg-[#F27D26] text-white flex items-center justify-center font-black italic mb-1">1</div>
                          <span className="text-[10px] font-bold uppercase">{match.winners?.first || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black italic mb-1">2</div>
                          <span className="text-[10px] font-bold uppercase">{match.winners?.second || 'TBD'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center font-mono opacity-30 italic uppercase">No_Completed_Matches_Yet</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 border-t-2 border-black p-8 text-center bg-white">
        <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.3em]">
          CRIC_FREAKS_V2.0 // FIREBASE_REALTIME
        </p>
      </footer>
    </div>
  );
}
