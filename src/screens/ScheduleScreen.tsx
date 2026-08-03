import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSession, updateSession } from "../scheduling/sessionService";
import { generateKingRound } from "../scheduling/kingOfCourt";
import { generateRotatingPartnersSchedule } from "../scheduling/rotatingPartners";
import type { Player, Court, Round, SessionFormat } from "../scheduling/types";

const LAST_SESSION_KEY = "pickleball:lastSessionId";
const COURT_COLORS = ["#1D5FA8", "#2E7D4F", "#1D5FA8", "#2E7D4F", "#1D5FA8", "#2E7D4F"];

function ModeButton({
  label,
  sublabel,
  active,
  onPress,
}: {
  label: string;
  sublabel: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-lg p-3 border"
      style={{
        backgroundColor: active ? "#1D5FA822" : "white",
        borderColor: active ? "#1D5FA8" : "#1C1E2226",
      }}
    >
      <Text className="font-bold text-charcoal">{label}</Text>
      <Text className="text-xs text-charcoal/60 mt-1">{sublabel}</Text>
    </Pressable>
  );
}

function ScoreInput({
  value,
  onChangeValue,
}: {
  value: number | null;
  onChangeValue: (v: number | null) => void;
}) {
  return (
    <TextInput
      value={value == null ? "" : String(value)}
      onChangeText={(t) => onChangeValue(t === "" ? null : parseInt(t, 10) || 0)}
      keyboardType="number-pad"
      placeholder="-"
      className="w-12 text-center bg-white border border-charcoal/15 rounded px-1 py-1 text-charcoal font-bold"
    />
  );
}

export default function ScheduleScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [format, setFormat] = useState<SessionFormat>("king_of_court");
  const [totalRounds, setTotalRounds] = useState(9);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const availableCourts = courts.filter((c) => c.available);
  const numCourts = availableCourts.length;

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || "?";
  const courtNameFor = (courtNum: number) =>
    availableCourts[courtNum - 1]?.name || `Court ${courtNum}`;

  const loadSession = useCallback(async () => {
    const storedId = await AsyncStorage.getItem(LAST_SESSION_KEY);
    if (!storedId) {
      setLoading(false);
      return;
    }
    const existing = await getSession(storedId);
    if (existing) {
      setSessionId(existing.id);
      setPlayers(existing.players);
      setCourts(existing.settings?.courts || []);
      setFormat(existing.settings?.format || "king_of_court");
      setTotalRounds(existing.settings?.totalRounds || 9);
      setRounds(existing.rounds || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const persistRounds = async (nextRounds: Round[], idOverride?: string) => {
    const id = idOverride || sessionId;
    if (!id) return;
    setSaving(true);
    try {
      await updateSession(id, { rounds: nextRounds });
    } finally {
      setSaving(false);
    }
  };

  const persistFormat = async (nextFormat: SessionFormat) => {
    if (!sessionId) return;
    const current = await getSession(sessionId);
    if (!current) return;
    await updateSession(sessionId, {
      settings: { ...current.settings, format: nextFormat },
    });
  };

  const handleSelectFormat = (f: SessionFormat) => {
    setFormat(f);
    persistFormat(f);
  };

  const handleGenerate = async () => {
    if (players.length < 4) {
      Alert.alert("Not enough players", "Add at least 4 players before generating a schedule.");
      return;
    }
    if (numCourts < 1) {
      Alert.alert("No available courts", "Mark at least one court as available first.");
      return;
    }
    setGenerating(true);
    try {
      if (format === "king_of_court") {
        const round1 = generateKingRound(1, players, [], numCourts);
        setRounds([round1]);
        await persistRounds([round1]);
      } else {
        const schedule = generateRotatingPartnersSchedule(
          players,
          numCourts,
          totalRounds,
          Date.now()
        );
        setRounds(schedule);
        await persistRounds(schedule);
      }
    } finally {
      setGenerating(false);
    }
  };

  const lastRoundFullyScored =
    rounds.length > 0 &&
    rounds[rounds.length - 1].games.every(
      (g) => g.score.team1 != null && g.score.team2 != null
    );

  const handleGenerateNextRound = async () => {
    if (!lastRoundFullyScored) return;
    setGenerating(true);
    try {
      const next = generateKingRound(rounds.length + 1, players, rounds, numCourts);
      const nextRounds = [...rounds, next];
      setRounds(nextRounds);
      await persistRounds(nextRounds);
    } finally {
      setGenerating(false);
    }
  };

  // Debounced auto-save: update local state immediately for a snappy UI, but
  // wait 600ms of no further typing before writing to Firestore, so rapid
  // score entry doesn't fire a network write on every keystroke.
  const updateScore = (
    roundIdx: number,
    gameIdx: number,
    team: "team1" | "team2",
    value: number | null
  ) => {
    const next = rounds.map((r, ri) => {
      if (ri !== roundIdx) return r;
      return {
        ...r,
        games: r.games.map((g, gi) =>
          gi === gameIdx ? { ...g, score: { ...g.score, [team]: value } } : g
        ),
      };
    });
    setRounds(next);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      persistRounds(next);
    }, 600);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white items-center justify-center">
        <ActivityIndicator size="large" color="#1D5FA8" />
        <Text className="text-charcoal/60 mt-3">Loading session...</Text>
      </SafeAreaView>
    );
  }

  if (!sessionId) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white items-center justify-center px-6">
        <Text className="text-charcoal/60 text-center">
          No active session found. Visit Manage Players first to create one.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-warm-white">
      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-xl font-bold text-charcoal">Schedule</Text>
          {saving ? (
            <View className="flex-row items-center gap-1.5">
              <ActivityIndicator size="small" color="#1D5FA8" />
              <Text className="text-xs text-charcoal/50">Saving...</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-charcoal/60 mb-4">
          {players.length} players &middot; {numCourts} available court{numCourts === 1 ? "" : "s"}
        </Text>

        <View className="flex-row gap-2 mb-4">
          <ModeButton
            label="King of the Court"
            sublabel="Winners move up"
            active={format === "king_of_court"}
            onPress={() => handleSelectFormat("king_of_court")}
          />
          <ModeButton
            label="Rotating Partners"
            sublabel="Avoid repeat pairs"
            active={format === "round_robin_rotating"}
            onPress={() => handleSelectFormat("round_robin_rotating")}
          />
        </View>

        <Pressable
          onPress={handleGenerate}
          disabled={generating}
          className="bg-court-blue rounded-lg py-3 items-center mb-2"
        >
          <Text className="text-warm-white font-bold">
            {generating
              ? "Generating..."
              : format === "king_of_court"
              ? rounds.length > 0
                ? "Restart Ladder (Round 1)"
                : "Generate Round 1"
              : "Generate Full Schedule"}
          </Text>
        </Pressable>

        {format === "king_of_court" && rounds.length > 0 ? (
          <Pressable
            onPress={handleGenerateNextRound}
            disabled={!lastRoundFullyScored || generating}
            className="rounded-lg py-3 items-center mb-4"
            style={{ backgroundColor: lastRoundFullyScored ? "#2E7D4F" : "#1C1E221A" }}
          >
            <Text
              className="font-bold"
              style={{ color: lastRoundFullyScored ? "#FAFAF8" : "#1C1E2266" }}
            >
              {lastRoundFullyScored
                ? "Generate Next Round"
                : "Enter all scores to advance"}
            </Text>
          </Pressable>
        ) : null}

        {rounds.map((round, ri) => (
          <View key={ri} className="mb-5">
            <Text className="text-xs font-bold uppercase text-charcoal/50 mb-2">
              Round {ri + 1}
            </Text>
            {round.games.map((g, gi) => {
              const color = COURT_COLORS[(g.court - 1) % COURT_COLORS.length];
              return (
                <View
                  key={gi}
                  className="flex-row items-center justify-between py-2 border-b border-charcoal/10"
                >
                  <View className="flex-1">
                    <Text className="text-xs font-bold mb-0.5" style={{ color }}>
                      {courtNameFor(g.court)}
                    </Text>
                    <Text className="text-charcoal text-sm">
                      {nameOf(g.team1[0])} & {nameOf(g.team1[1])}
                    </Text>
                    <Text className="text-charcoal/40 text-xs">vs</Text>
                    <Text className="text-charcoal text-sm">
                      {nameOf(g.team2[0])} & {nameOf(g.team2[1])}
                    </Text>
                  </View>
                  <View className="items-center gap-1">
                    <ScoreInput
                      value={g.score.team1}
                      onChangeValue={(v) => updateScore(ri, gi, "team1", v)}
                    />
                    <ScoreInput
                      value={g.score.team2}
                      onChangeValue={(v) => updateScore(ri, gi, "team2", v)}
                    />
                  </View>
                </View>
              );
            })}
            {round.sitOuts.length > 0 ? (
              <Text className="text-xs text-charcoal/50 mt-1">
                Sitting out: {round.sitOuts.map(nameOf).join(", ")}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
