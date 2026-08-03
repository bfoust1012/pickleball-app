import "./global.css";
import { View, Text } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-blue-600">
        Pickleball App 🏓
      </Text>
      <Text className="text-base text-gray-500 mt-2">
        NativeWind is working!
      </Text>
    </View>
  );
}