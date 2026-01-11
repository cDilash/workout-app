import { YStack, Text } from 'tamagui';
import { Crown } from 'phosphor-react-native';

import { EmptyState } from '@/src/components/ui';

/**
 * Pricing Screen - Coming Soon
 *
 * Placeholder for future premium/subscription features.
 */
export default function PricingScreen() {
  return (
    <YStack flex={1} backgroundColor="#000000">
      <EmptyState
        icon={<Crown size={48} color="rgba(255,255,255,0.3)" weight="duotone" />}
        title="Premium Coming Soon"
        description="Unlock advanced features and support development."
      />
    </YStack>
  );
}
