import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router/stack";
import { database, Spike } from "@/db/spike";

export default function SpikeScreen() {
  const [lines, setLines] = useState<string[]>([]);
  const log = (s: string) => setLines((prev) => [...prev, s]);

  useEffect(() => {
    (async () => {
      try {
        const collection = database.get<Spike>("spikes");
        log(`adapter: ${database.adapter.constructor.name}`);

        await database.write(async () => {
          await collection.create((s) => {
            s.label = "Jollof rice";
            s.amountMinor = 20_000_00;
          });
        });
        log("write: ok");

        const all = await collection.query().fetch();
        log(`read: ${all.length} row(s)`);
        for (const row of all) {
          log(`  ${row.label} = ${row.amountMinor} minor units`);
        }

        const sum = all.reduce((a, r) => a + r.amountMinor, 0);
        log(`sum: ${sum} (integer, no float drift)`);
        log("SPIKE PASSED");
      } catch (e) {
        log(`SPIKE FAILED: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "WatermelonDB Spike" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, gap: 8 }}
      >
        {lines.map((l, i) => (
          <View key={i}>
            <Text selectable style={{ fontSize: 15, fontFamily: "Menlo" }}>
              {l}
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
