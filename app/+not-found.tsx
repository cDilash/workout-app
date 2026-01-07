import { Link, Stack } from 'expo-router';
import { YStack, Text } from 'tamagui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$5"
        backgroundColor="#000000"
      >
        <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
          This screen doesn't exist.
        </Text>

        <Link href="/" asChild>
          <Text
            marginTop="$4"
            paddingVertical="$4"
            fontSize="$3"
            color="#FFFFFF"
          >
            Go to home screen!
          </Text>
        </Link>
      </YStack>
    </>
  );
}
