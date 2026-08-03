import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSession, updateSession } from "../scheduling/sessionService";
import type { Court } from "../scheduling/types";

const LAST_SESSION_KEY = "pickleball:lastSessionId";
const COURT_COLORS = ["#1D5FA8", "#2E7D4F", "#1D5FA8", "#2E7D4F", "#1D5FA8", "#2E7D4F"];

const FALLBACK_COURTS: Court[] = [
  { number: 1, name: "Court 1", available: true },
  { number: 2, name: "Court 2", available: true },
];

function CourtRow({
  court,
  onNameChange,
  onToggleAvailable,
}: {
  court: Court;
  onNameChange: (name: string) => void;
  onToggleAvailable: () => void;
}) {
  const color = COURT_COLORS[(court.number - 1) % COURT_COLORS.length];
  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-charcoal/10">
      <View className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <TextInput
        value={court.name}
        onChangeText={onNameChange}
        className="flex-1 text-charcoal text-base font-medium border-b border-transparent"
      />
      <Pressable
        onPress={onToggleAvailable}
        className="px-3 py-1.5 rounded-full"
        style={{ backgroundColor: court.available ? "#2E7D4F22" : "#EF444422" }}
      >
        <Text
          className="text-xs font-bold"
          style={{ color: court.available ? "#2E7D4F" : "#EF4444" }}
        >
          {court.available ? "Available" : "Unavailable"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function CourtSetupScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const storedId = await AsyncStorage.getItem(LAST_SESSION_KEY);
      if (!storedId) {
        setLoading(false);
        return;
      }
      const existing = await getSession(storedId);
      if (existing) {
        setSessionId(existing.id);
        // Older sessions created before the Court type existed won't have
        // a courts array yet - fall back to a sane default rather than crash.
        const existingCourts = existing.settings?.courts;
        const safeCourts =
          Array.isArray(existingCourts) && existingCourts.length > 0
            ? existingCourts
            : FALLBACK_COURTS;
        setCourts(safeCourts);
      }
      setLoading(false);
    })();
  }, []);

  const persistCourts = useCallback(
    async (nextCourts: Court[]) => {
      if (!sessionId) return;
      setSaving(true);
      try {
        const current = await getSession(sessionId);
        if (!current) return;
        await updateSession(sessionId, {
          settings: {
            ...current.settings,
            numCourts: nextCourts.length,
            courts: nextCourts,
          },
        });
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  const updateCourtName = (number: number, name: string) => {
    const next = courts.map((c) => (c.number === number ? { ...c, name } : c));
    setCourts(next);
    persistCourts(next);
  };

  const toggleAvailable = (number: number) => {
    const next = courts.map((c) =>
      c.number === number ? { ...c, available: !c.available } : c
    );
    setCourts(next);
    persistCourts(next);
  };

  const addCourt = () => {
    const nextNumber = courts.length + 1;
    const next = [
      ...courts,
      { number: nextNumber, name: `Court ${nextNumber}`, available: true },
    ];
    setCourts(next);
    persistCourts(next);
  };

  const removeLastCourt = () => {
    if (courts.length <= 1) return;
    const next = courts.slice(0, -1);
    setCourts(next);
    persistCourts(next);
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
          <Text className="text-xl font-bold text-charcoal">
            Courts ({courts.length})
          </Text>
          {saving ? <ActivityIndicator size="small" color="#1D5FA8" /> : null}
        </View>
        <Text className="text-charcoal/60 mb-4">
          Tap a name to edit it. Tap the badge to mark a court unavailable.
        </Text>

        {courts.map((court) => (
          <CourtRow
            key={court.number}
            court={court}
            onNameChange={(name) => updateCourtName(court.number, name)}
            onToggleAvailable={() => toggleAvailable(court.number)}
          />
        ))}

        <View className="flex-row gap-3 mt-5">
          <Pressable
            onPress={addCourt}
            className="flex-1 bg-court-blue rounded-lg py-3 items-center"
          >
            <Text className="text-warm-white font-bold">Add Court</Text>
          </Pressable>
          <Pressable
            onPress={removeLastCourt}
            disabled={courts.length <= 1}
            className="flex-1 bg-charcoal/10 rounded-lg py-3 items-center"
          >
            <Text className="text-charcoal font-bold">Remove Last</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
