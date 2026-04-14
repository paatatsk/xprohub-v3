import { useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { Button } from '../../components/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Slide data ───────────────────────────────────────────────
const SLIDES = [
  {
    id: '1',
    headline: 'REAL WORK.',
    subtitle: 'Find skilled help in minutes',
    icon: 'diamond',
  },
  {
    id: '2',
    headline: 'FAIR PAY.',
    subtitle: 'No middlemen. No hidden fees.\nFull transparency.',
    icon: 'circles',
  },
  {
    id: '3',
    headline: 'FOR EVERYONE.',
    subtitle: 'Whatever your skill —\nthere\'s work waiting for you.',
    icon: 'arrow',
  },
];

// ─── Slide icons (pure View geometry, no image files) ─────────
function DiamondIcon() {
  return (
    <View style={iconStyles.container}>
      <View style={iconStyles.diamondOuter}>
        <View style={iconStyles.diamondInner} />
      </View>
    </View>
  );
}

function CirclesIcon() {
  return (
    <View style={iconStyles.container}>
      <View style={iconStyles.circlesRow}>
        <View style={[iconStyles.circle, iconStyles.circleLeft]} />
        <View style={[iconStyles.circle, iconStyles.circleRight]} />
      </View>
      <View style={iconStyles.circleOverlap} />
    </View>
  );
}

function ArrowIcon() {
  return (
    <View style={iconStyles.container}>
      <View style={iconStyles.arrowRing}>
        <View style={iconStyles.arrowShaft} />
        <View style={iconStyles.arrowHeadLeft} />
        <View style={iconStyles.arrowHeadRight} />
      </View>
    </View>
  );
}

function SlideIcon({ type }: { type: string }) {
  if (type === 'diamond') return <DiamondIcon />;
  if (type === 'circles') return <CirclesIcon />;
  return <ArrowIcon />;
}

// ─── Individual slide ──────────────────────────────────────────
function Slide({ headline, subtitle, icon }: (typeof SLIDES)[0]) {
  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.iconArea}>
        <SlideIcon type={icon} />
      </View>
      <View style={styles.textArea}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // Fade the CTA in only on the last slide
  const ctaOpacity = scrollX.interpolate({
    inputRange: [SCREEN_WIDTH * 1.5, SCREEN_WIDTH * 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const ctaPointerEvents = scrollX.interpolate({
    inputRange: [SCREEN_WIDTH * 1.5, SCREEN_WIDTH * 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Slide {...item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        style={styles.flatList}
      />

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const dotWidth = scrollX.interpolate({
            inputRange: [
              SCREEN_WIDTH * (i - 1),
              SCREEN_WIDTH * i,
              SCREEN_WIDTH * (i + 1),
            ],
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          });
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              SCREEN_WIDTH * (i - 1),
              SCREEN_WIDTH * i,
              SCREEN_WIDTH * (i + 1),
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
            />
          );
        })}
      </View>

      {/* CTA — fades in on slide 3 */}
      <Animated.View
        style={[styles.ctaArea, { opacity: ctaOpacity }]}
        pointerEvents="box-none"
      >
        <Button
          label="GET STARTED"
          onPress={() => router.replace('/(auth)/signup')}
        />
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.7}
          style={styles.signInLink}
        >
          <Text style={styles.signInText}>Already have an account? SIGN IN</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  iconArea: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xl,
  },
  textArea: {
    flex: 0.55,
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  headline: {
    color: Colors.gold,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: Spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.gold,
  },
  ctaArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  signInText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

// ─── Icon styles ───────────────────────────────────────────────
const iconStyles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Slide 1 — Diamond (rotated square)
  diamondOuter: {
    width: 80,
    height: 80,
    borderWidth: 3,
    borderColor: Colors.gold,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondInner: {
    width: 32,
    height: 32,
    backgroundColor: Colors.gold,
    opacity: 0.25,
  },

  // Slide 2 — Two overlapping circles
  circlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: Colors.gold,
    position: 'absolute',
  },
  circleLeft: {
    left: -18,
  },
  circleRight: {
    right: -18,
  },
  circleOverlap: {
    width: 20,
    height: 40,
    backgroundColor: Colors.gold,
    opacity: 0.18,
  },

  // Slide 3 — Arrow in a ring
  arrowRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowShaft: {
    width: 3,
    height: 30,
    backgroundColor: Colors.gold,
    position: 'absolute',
    bottom: 18,
  },
  arrowHeadLeft: {
    width: 3,
    height: 16,
    backgroundColor: Colors.gold,
    position: 'absolute',
    top: 16,
    left: 28,
    transform: [{ rotate: '-45deg' }],
  },
  arrowHeadRight: {
    width: 3,
    height: 16,
    backgroundColor: Colors.gold,
    position: 'absolute',
    top: 16,
    right: 28,
    transform: [{ rotate: '45deg' }],
  },
});
