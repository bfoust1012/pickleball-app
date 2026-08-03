import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSession, getSession, updateSession } from "../scheduling/sessionService";
import type { Player } from "../scheduling/types";

const LAST_SESSION_KEY = "pickleball:lastSessionId";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function PlayerRow({ player, onRemove }: { player: Player; onRemove: () => void }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-charcoal/10">
      <Text className="text-charcoal text-base font-medium">{player.name}</Text>
      <Pressable onPress={onRemove} hitSlop={10}>
        <Text className="text-red-500 font-bold text-sm">Remove</Text>
      </Pressable>
    </View>
  );
}

export default function PlayerSetupScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const storedId = await AsyncStorage.getItem(LAST_SESSION_KEY);
      if (storedId) {
        const existing = await getSession(storedId);
        if (existing) {
          setSessionId(existing.id);
          setPlayers(existing.players);
          setLoading(false);
          return;
        }
      }
      const created = await createSession("My Session");
      await AsyncStorage.setItem(LAST_SESSION_KEY, created.id);
      setSessionId(created.id);
      setPlayers(created.players);
      setLoading(false);
    })();
  }, []);

  const persistPlayers = useCallback(
    async (nextPlayers: Player[]) => {
      if (!sessionId) return;
      setSaving(true);
      try {
        await updateSession(sessionId, { players: nextPlayers });
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  const addPlayer = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [
      ...players,
      { id: uid(), name: trimmed, status: "active" as const, arrivalRound: 1 },
    ];
    setPlayers(next);
    setName("");
    persistPlayers(next);
  };

  const removePlayer = (id: string) => {
    Alert.alert("Remove player?", "This will remove them from the current roster.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const next = players.filter((p) => p.id !== id);
          setPlayers(next);
          persistPlayers(next);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white items-center justify-center">
        <ActivityIndicator size="large" color="#1D5FA8" />
        <Text className="text-charcoal/60 mt-3">Loading session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-warm-white">
      <View className="px-4 pt-4 flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-xl font-bold text-charcoal">
            Players ({players.length})
          </Text>
          {saving ? <ActivityIndicator size="small" color="#1D5FA8" /> : null}
        </View>
        <Text className="text-charcoal/60 mb-4">
          Add at least 4 players to generate a schedule. Saved automatically.
        </Text>

        <View className="flex-row gap-2 mb-4">
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={addPlayer}
            placeholder="Player name"
            placeholderTextColor="#1C1E2266"
            returnKeyType="done"
            className="flex-1 bg-white border border-charcoal/15 rounded-lg px-4 py-3 text-charcoal text-base"
          />
          <Pressable
            onPress={addPlayer}
            className="bg-court-blue rounded-lg px-5 items-center justify-center"
          >
            <Text className="text-warm-white font-bold text-base">Add</Text>
          </Pressable>
        </View>

        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PlayerRow player={item} onRemove={() => removePlayer(item.id)} />
          )}
          ListEmptyComponent={
            <Text className="text-charcoal/40 text-center mt-8">
              No players yet. Add your first player above.
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}
