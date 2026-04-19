import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { GoldenDollar } from '../../components/GoldenDollar';
import { supabase } from '../../lib/supabase';

interface Category {
  id: number;
  name: string;
  price_min: number;
  price_max: number;
  difficulty_range: string;
  sort_order: number;
  icon_slug: string;
  tier: number;
  requires_background_check: boolean;
}

function iconForSlug(slug: string): string {
  const map: Record<string, string> = {
    'home-cleaning':      '🧹',
    'errands-delivery':   '📦',
    'pet-care':           '🐾',
    'child-care':         '👶',
    'elder-care':         '🧓',
    'moving-labor':       '🚚',
    'tutoring':           '📚',
    'coaching':           '🏆',
    'personal-asst':      '🗂️',
    'vehicle-care':       '🚗',
    'handyman':           '🔨',
    'gardening':          '🌿',
    'trash-recycling':    '♻️',
    'events':             '🎉',
    'electrical':         '⚡',
    'plumbing':           '🔧',
    'painting':           '🎨',
    'carpentry':          '🪚',
    'it-tech':            '💻',
    'hvac':               '❄️',
  };
  return map[slug] ?? '▪';
}

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('task_categories')
      .select('id, name, price_min, price_max, difficulty_range, sort_order, icon_slug, tier, requires_background_check')
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          setCategories(data ?? []);
        }
        setLoading(false);
      });
  }, []);

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <GoldenDollar size={64} />
      <Text style={styles.title}>XPROHUB</Text>
      <Text style={styles.tagline}>Real Work. Fair Pay. For Everyone.</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/(tabs)/market')}>
          <Text style={styles.btnText}>HELP WANTED</Text>
          <Text style={styles.btnSub}>Post a job</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnWorker]} onPress={() => router.push('/(tabs)/market')}>
          <Text style={styles.btnText}>START EARNING</Text>
          <Text style={styles.btnSub}>Browse jobs</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionLabel}>BROWSE CATEGORIES</Text>
    </View>
  ), [router]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return <Text style={styles.loadingText}>Loading categories...</Text>;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    return null;
  }, [loading, error]);

  const renderItem = useCallback(({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/market?category_id=${item.id}`)}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{iconForSlug(item.icon_slug)}</Text>
        <View style={item.tier === 2 ? styles.tierBadgePro : styles.tierBadgeEveryday}>
          <Text style={item.tier === 2 ? styles.tierTextPro : styles.tierTextEveryday}>
            {item.tier === 2 ? 'PRO' : 'EVERYDAY'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardName}>{item.name.toUpperCase()}</Text>
      <Text style={styles.cardPrice}>${item.price_min}–${item.price_max}</Text>
      <Text style={styles.cardDifficulty}>{item.difficulty_range}</Text>
    </TouchableOpacity>
  ), [router]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />
      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  list:           { flex: 1 },
  listContent:    { paddingBottom: 80, paddingHorizontal: 6 },
  header:         { alignItems: 'center', paddingTop: 24, paddingBottom: 16, gap: 12, paddingHorizontal: 6 },
  title:          { color: Colors.gold, fontSize: 32, fontWeight: 'bold', letterSpacing: 4 },
  tagline:        { color: Colors.textSecondary, fontSize: 13 },
  actions:        { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  btn:            { flex: 1, backgroundColor: Colors.gold, borderRadius: 12, padding: 20, alignItems: 'center' },
  btnWorker:      { backgroundColor: Colors.green },
  btnText:        { color: Colors.background, fontWeight: '800', fontSize: 13 },
  btnSub:         { color: Colors.background, fontSize: 11, marginTop: 4, opacity: 0.7 },
  sectionLabel:   { color: Colors.textSecondary, fontSize: 11, letterSpacing: 2, marginTop: 16, alignSelf: 'flex-start' },
  card:                { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, margin: 6 },
  cardTop:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardIcon:            { fontSize: 32 },
  tierBadgeEveryday:   { backgroundColor: Colors.gold, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, justifyContent: 'center' },
  tierTextEveryday:    { color: Colors.background, fontSize: 9, fontWeight: '800' },
  tierBadgePro:        { borderWidth: 1, borderColor: Colors.gold, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, justifyContent: 'center' },
  tierTextPro:         { color: Colors.gold, fontSize: 9, fontWeight: '800' },
  cardName:            { color: Colors.textPrimary, fontWeight: 'bold', fontSize: 14, marginBottom: 6 },
  cardPrice:           { color: Colors.gold, fontSize: 12, marginBottom: 4 },
  cardDifficulty:      { color: Colors.textSecondary, fontSize: 11 },
  loadingText:    { color: Colors.gold, fontSize: 14, textAlign: 'center', marginTop: 32 },
  errorText:      { color: Colors.red, fontSize: 13, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
  signOut:        { position: 'absolute', bottom: 32, alignSelf: 'center' },
  signOutText:    { color: Colors.gold, fontSize: 13, opacity: 0.6 },
});
