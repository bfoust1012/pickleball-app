import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Player = {
  id: string;
  name: string;
  status: "active" | "resting" | "absent" | "injured";
  arrivalRound: number;
};

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
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");

  const addPlayer = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers((prev) => [
      ...prev,
      { id: uid(), name: trimmed, status: "active", arrivalRound: 1 },
    ]);
    setName("");
  };

  const removePlayer = (id: string) => {
    Alert.alert("Remove player?", "This will remove them from the current roster.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setPlayers((prev) => prev.filter((p) => p.id !== id)),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white">
      <View className="px-4 pt-4 flex-1">
        <Text className="text-xl font-bold text-charcoal mb-1">
          Players ({players.length})
        </Text>
        <Text className="text-charcoal/60 mb-4">
          Add at least 4 players to generate a schedule.
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
