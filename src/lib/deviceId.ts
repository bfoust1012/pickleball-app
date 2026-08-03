import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "pickleball:deviceId";

/**
 * Returns a stable, anonymous UUID for this device, generating and
 * persisting one on first launch. This is the app's entire notion of
 * "identity" in v1 - there are no accounts, no login, no passwords.
 * See Section 5 of PROJECT_INSTRUCTIONS.md.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const fresh = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  return fresh;
}
