import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack>
    <Stack.Screen name="index" options={{ title: 'Home' }}></Stack.Screen>
    <Stack.Screen name="details" options={{
      title: 'Details',
      headerBackButtonDisplayMode: "minimal",
      presentation: "formSheet",
      sheetAllowedDetents: [0.3, 0.7, 1]
    }}></Stack.Screen>
  </Stack>;
}
