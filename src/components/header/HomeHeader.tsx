import { XStack } from 'tamagui';
import { Gear, Ruler } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { ProfileAvatar } from './ProfileAvatar';

interface HomeHeaderProps {
  onProfilePress: () => void;
  onSettingsPress: () => void;
  onMeasurementsPress: () => void;
}

function IconButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <XStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="rgba(255,255,255,0.08)"
          alignItems="center"
          justifyContent="center"
          opacity={pressed ? 0.7 : 1}
        >
          {children}
        </XStack>
      )}
    </Pressable>
  );
}

export function HomeHeader({
  onProfilePress,
  onSettingsPress,
  onMeasurementsPress,
}: HomeHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#000000' }}>
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        justifyContent="space-between"
        alignItems="center"
        backgroundColor="#000000"
      >
        {/* Left: Profile Avatar */}
        <ProfileAvatar onPress={onProfilePress} size={40} />

        {/* Right: Action Icons */}
        <XStack gap="$3">
          <IconButton onPress={onMeasurementsPress}>
            <Ruler size={22} color="#FFFFFF" weight="regular" />
          </IconButton>
          <IconButton onPress={onSettingsPress}>
            <Gear size={22} color="#FFFFFF" weight="regular" />
          </IconButton>
        </XStack>
      </XStack>
    </SafeAreaView>
  );
}
