import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import PlayerSetupScreen from "../screens/PlayerSetupScreen";
import CourtSetupScreen from "../screens/CourtSetupScreen";
import ScheduleScreen from "../screens/ScheduleScreen";
import HistoryScreen from "../screens/HistoryScreen";

export type RootStackParamList = {
  Home: undefined;
  PlayerSetup: undefined;
  CourtSetup: undefined;
  Schedule: undefined;
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#1C1E22" },
          headerTintColor: "#FAFAF8",
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Pickleball App" }} />
        <Stack.Screen name="PlayerSetup" component={PlayerSetupScreen} options={{ title: "Players" }} />
        <Stack.Screen name="CourtSetup" component={CourtSetupScreen} options={{ title: "Courts" }} />
        <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ title: "Schedule" }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: "History" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
