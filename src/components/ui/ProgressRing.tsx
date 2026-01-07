import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { YStack } from 'tamagui';

/**
 * Progress Ring Component - Premium Monochromatic
 *
 * Elegant circular progress with white/gray styling.
 */

interface ProgressRingProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Content to render inside the ring */
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 4,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Create the circular path
  const createArcPath = (progressValue: number) => {
    const startAngle = -Math.PI / 2; // Start from top
    const endAngle = startAngle + 2 * Math.PI * Math.min(Math.max(progressValue, 0), 1);

    const path = Skia.Path.Make();
    path.addArc(
      {
        x: center - radius,
        y: center - radius,
        width: radius * 2,
        height: radius * 2,
      },
      (startAngle * 180) / Math.PI,
      ((endAngle - startAngle) * 180) / Math.PI
    );

    return path;
  };

  // Background track (full circle)
  const trackPath = Skia.Path.Make();
  trackPath.addCircle(center, center, radius);

  // Progress arc
  const progressPath = createArcPath(progress);

  return (
    <YStack width={size} height={size} alignItems="center" justifyContent="center">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Background track */}
        <Path
          path={trackPath}
          style="stroke"
          strokeWidth={strokeWidth}
          color="rgba(255,255,255,0.10)"
          strokeCap="round"
        />

        {/* Progress arc - white */}
        <Path
          path={progressPath}
          style="stroke"
          strokeWidth={strokeWidth}
          color="#FFFFFF"
          strokeCap="round"
        />
      </Canvas>

      {/* Center content */}
      {children && (
        <YStack position="absolute" alignItems="center" justifyContent="center">
          {children}
        </YStack>
      )}
    </YStack>
  );
}

/**
 * Progress Bar Component - Premium Monochromatic
 */
interface ProgressBarProps {
  progress: number;
  height?: number;
}

export function ProgressBar({
  progress,
  height = 4,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View
      style={{
        height,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clampedProgress * 100}%`,
          height: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
