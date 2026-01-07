import { Image, Pressable } from 'react-native';
import { YStack, Text } from 'tamagui';
import { User } from 'phosphor-react-native';
import { useProfileStore } from '@/src/stores/profileStore';

interface ProfileAvatarProps {
  size?: number;
  onPress?: () => void;
}

export function ProfileAvatar({ size = 40, onPress }: ProfileAvatarProps) {
  const username = useProfileStore((s) => s.username);
  const profilePicturePath = useProfileStore((s) => s.profilePicturePath);
  const getInitials = useProfileStore((s) => s.getInitials);

  const initials = getInitials();

  return (
    <Pressable onPress={onPress} style={{ opacity: 1 }}>
      {({ pressed }) => (
        <YStack
          width={size}
          height={size}
          borderRadius={size / 2}
          backgroundColor="rgba(255,255,255,0.10)"
          borderWidth={1.5}
          borderColor="rgba(255,255,255,0.15)"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
          opacity={pressed ? 0.7 : 1}
        >
          {profilePicturePath ? (
            <Image
              source={{ uri: profilePicturePath }}
              style={{ width: size, height: size }}
              resizeMode="cover"
            />
          ) : initials ? (
            <Text
              fontSize={size * 0.38}
              fontWeight="600"
              color="#FFFFFF"
              letterSpacing={0.5}
            >
              {initials}
            </Text>
          ) : (
            <User size={size * 0.5} color="rgba(255,255,255,0.6)" weight="regular" />
          )}
        </YStack>
      )}
    </Pressable>
  );
}
