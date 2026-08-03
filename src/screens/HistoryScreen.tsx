import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSession } from "../scheduling/sessionService";
import { computeStats } from "../scheduling/shared";
import type { Player, Round } from "../scheduling/types";

const LAST_SESSION_KEY = "pickleball:lastSessionId";

function topEntries(record: Record<string, number>, nameOf: (id: string) => string, count = 3): string {
  const entries = Object.entries(record).sort((a, b) => b[1] - a[1]).slice(0, count);
  if (entries.length === 0) return "-";
  return entries.map(([id, n]) => `${nameOf(id)} (${n})`).join(", ");
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-xs text-charcoal/50">{label}</Text>
      <Text className="text-xs text-charcoal font-medium">{value}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || "?";

  const loadSession = useCallback(async () => {
    const storedId = await AsyncStorage.getItem(LAST_SESSION_KEY);
    if (!storedId) {
      setLoading(false);
      return;
    }
    const existing = await getSession(storedId);
    if (existing) {
      setPlayers(existing.players);
      setRounds(existing.rounds || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white items-center justify-center">
        <ActivityIndicator size="large" color="#1D5FA8" />
        <Text className="text-charcoal/60 mt-3">Loading session...</Text>
      </SafeAreaView>
    );
  }

  if (rounds.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white items-center justify-center px-6">
        <Text className="text-charcoal/60 text-center">
          No history yet - generate a schedule and play a few rounds first.
        </Text>
      </SafeAreaView>
    );
  }

  const stats = computeStats(players, rounds);

  return (
    <SafeAreaView className="flex-1 bg-warm-white">
      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-xl font-bold text-charcoal mb-1">Player History</Text>
        <Text className="text-charcoal/60 mb-4">
          {rounds.length} round{rounds.length === 1 ? "" : "s"} played &middot; {players.length} players
        </Text>

        {players.map((p) => {
          const s = stats[p.id];
          if (!s) return null;
          const record = s.wins + s.losses === 0 ? "-" : `${s.wins}W - ${s.losses}L`;
          const points =
            s.pointsFor + s.pointsAgainst === 0 ? "-" : `${s.pointsFor} - ${s.pointsAgainst}`;
          const diff = s.pointsFor - s.pointsAgainst;
          const diffLabel = s.pointsFor + s.pointsAgainst === 0 ? "-" : (diff > 0 ? `+${diff}` : `${diff}`);

          return (
            <View
              key={p.id}
              className="rounded-lg p-3 mb-3 bg-white border border-charcoal/10"
            >
              <Text className="text-charcoal font-bold text-base mb-1">{p.name}</Text>
              <StatRow label="Games played" value={String(s.played)} />
              <StatRow label="Sit-outs" value={String(s.sat)} />
              <StatRow label="Record" value={record} />
              <StatRow label="Points (for - against)" value={points} />
              <StatRow label="Point differential" value={diffLabel} />
              <StatRow label="Top partners" value={topEntries(s.partners, nameOf)} />
              <StatRow label="Top opponents" value={topEntries(s.opponents, nameOf)} />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
