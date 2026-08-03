import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

function FormatButton({ label, sublabel, color }: { label: string; sublabel: string; color: string }) {
  return (
    <Pressable
      className="flex-1 min-w-[45%] rounded-lg p-4 mb-3"
      style={{ backgroundColor: color }}
    >
      <Text className="text-warm-white font-bold text-base">{label}</Text>
      <Text className="text-warm-white/80 text-xs mt-1">{sublabel}</Text>
    </Pressable>
  );
}

function ActionRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="border-b border-charcoal/10 py-4 flex-row justify-between items-center"
    >
      <Text className="text-charcoal text-base font-medium">{label}</Text>
      <Text className="text-charcoal/40 text-base">{">"}</Text>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-warm-white">
      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-charcoal mb-1">Pickleball App</Text>
        <Text className="text-charcoal/60 mb-6">Get your group organized in a few taps</Text>

        <View className="flex-row flex-wrap justify-between gap-x-3">
          <FormatButton label="Open Play" sublabel="Rotate as games finish" color="#1D5FA8" />
          <FormatButton label="Round Robin" sublabel="Planned schedule" color="#2E7D4F" />
          <FormatButton label="King of the Court" sublabel="Winners move up" color="#1D5FA8" />
          <FormatButton label="Ladder League" sublabel="Multi-session ranking" color="#2E7D4F" />
        </View>

        <View className="mt-6">
          <Text className="text-xs font-bold uppercase text-charcoal/50 mb-1">Quick Actions</Text>
          <ActionRow label="Resume Current Session" />
          <ActionRow label="Create New Session" />
          <ActionRow label="Manage Players" onPress={() => navigation.navigate("PlayerSetup")} />
          <ActionRow label="Court Setup" onPress={() => navigation.navigate("CourtSetup")} />
          <ActionRow label="Create Sign-Up Link" />
          <ActionRow label="Saved Groups" />
          <ActionRow label="Recent Sessions" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
