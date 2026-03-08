import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { ChartIcon } from '../Icons';
import { StockQuote } from '../../types';

interface StocksCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function parseStocks(text: string): StockQuote[] {
  const quotes: StockQuote[] = [];
  // Match lines like: AAPL $189.30 1.2% or AAPL $189.30 Change: 1.23%
  const lines = text.split('\n').filter(l => /\$[\d.]+/.test(l));
  for (const line of lines.slice(0, 6)) {
    const sym   = line.match(/\b([A-Z]{1,5})\b/)?.[1];
    const price = line.match(/\$([\d.]+)/)?.[1];
    const chg   = line.match(/([-+]?[\d.]+)%/)?.[1];
    if (sym && price) {
      quotes.push({
        symbol: sym,
        price: `$${price}`,
        change: chg ? `${parseFloat(chg) >= 0 ? '+' : ''}${parseFloat(chg).toFixed(2)}%` : undefined,
        isUp: chg ? parseFloat(chg) >= 0 : undefined,
      });
    }
  }
  return quotes;
}

export function StocksCard({ content, metadata }: StocksCardProps) {
  const translateY = useSharedValue(200);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value    = withTiming(1, { duration: 300 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const stocks = parseStocks(content);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <ChartIcon size={20} />
        <Text style={styles.title}>Stocks</Text>
        <Text style={styles.time}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>

      {stocks.length > 0 ? (
        <ScrollView scrollEnabled={false}>
          {stocks.map((s, i) => (
            <View key={i} style={[styles.row, i < stocks.length - 1 && styles.rowBorder]}>
              <View style={styles.symbolBlock}>
                <Text style={styles.symbol}>{s.symbol}</Text>
              </View>
              <Text style={styles.price}>{s.price}</Text>
              {s.change && (
                <View style={[styles.changeBadge, s.isUp ? styles.changeUp : styles.changeDown]}>
                  <Text style={[styles.changeText, s.isUp ? styles.changeTextUp : styles.changeTextDown]}>
                    {s.isUp ? '▲' : '▼'} {s.change}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.content} numberOfLines={4}>{content}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.2)',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  time: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  symbolBlock: {
    width: 60,
  },
  symbol: {
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
    color: Colors.text,
  },
  price: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  changeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  changeUp:   { backgroundColor: 'rgba(61,214,140,0.15)' },
  changeDown: { backgroundColor: 'rgba(240,94,135,0.15)' },
  changeText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 12,
  },
  changeTextUp:   { color: Colors.success },
  changeTextDown: { color: Colors.pink },
  content: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
