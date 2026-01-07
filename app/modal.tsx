import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { YStack, XStack, Text, Separator } from 'tamagui';

export default function ModalScreen() {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background"
    >
      <Text fontSize="$6" fontWeight="bold" color="$color">
        Modal
      </Text>
      <Separator
        marginVertical="$6"
        width="80%"
        backgroundColor="$borderColor"
      />
      <Text color="$colorMuted" textAlign="center" paddingHorizontal="$4">
        This is a modal screen. You can customize it or remove it.
      </Text>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </YStack>
  );
}
