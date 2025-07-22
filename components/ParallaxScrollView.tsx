import type { PropsWithChildren, ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage?: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
}: Props) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>{children}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    padding: 32,
    gap: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
});
