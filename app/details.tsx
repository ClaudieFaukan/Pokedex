import { TYPE_META } from "@/themes/colorsByType";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface NamedAPIResource {
  name: string;
  url: string;
}

interface PokemonAbility {
  is_hidden: boolean;
  slot: number;
  ability: NamedAPIResource;
}

interface PokemonTypeEntry {
  slot: number;
  type: NamedAPIResource;
}

interface PokemonStatEntry {
  base_stat: number;
  effort: number;
  stat: NamedAPIResource; // hp, attack, etc.
}

interface PokemonSprites {
  front_default: string | null;
  back_default: string | null;
  front_shiny: string | null;
  back_shiny: string | null;
  other?: {
    ["official-artwork"]?: {
      front_default: string | null;
      front_shiny: string | null;
    };
    home?: {
      front_default: string | null;
      front_shiny: string | null;
    };
  };
}

interface Pokemon {
  id: number;
  name: string;
  base_experience: number;
  height: number; // decimeters
  weight: number; // hectograms
  abilities: PokemonAbility[];
  types: PokemonTypeEntry[];
  stats: PokemonStatEntry[];
  sprites: PokemonSprites;
  species: NamedAPIResource;
}

interface PokemonSpecies {
  evolution_chain: { url: string };
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string };
    version: { name: string };
  }>;
  genera: Array<{
    genus: string;
    language: { name: string };
  }>;
}

interface EvolutionChain {
  chain: EvolutionNode;
}

interface EvolutionNode {
  species: { name: string; url: string };
  evolves_to: EvolutionNode[];
}

type EvolutionLine = string[]; // ex: ["bulbasaur", "ivysaur", "venusaur"]

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function kgFromHectograms(weightHg: number) {
  return (weightHg / 10).toFixed(1);
}

function metersFromDecimeters(heightDm: number) {
  return (heightDm / 10).toFixed(1);
}

function statLabel(statName: string) {
  const map: Record<string, string> = {
    hp: "HP",
    attack: "Attaque",
    defense: "Défense",
    "special-attack": "Att. Spé",
    "special-defense": "Def. Spé",
    speed: "Vitesse",
  };
  return map[statName] ?? statName;
}

// Transforme une chaîne d'évolution (tree) en lignes (gère branches)
function buildEvolutionLines(root: EvolutionNode): EvolutionLine[] {
  const lines: EvolutionLine[] = [];

  const dfs = (node: EvolutionNode, path: string[]) => {
    const nextPath = [...path, node.species.name];

    if (!node.evolves_to || node.evolves_to.length === 0) {
      lines.push(nextPath);
      return;
    }

    for (const child of node.evolves_to) {
      dfs(child, nextPath);
    }
  };

  dfs(root, []);
  return lines;
}

export default function Details() {
  const params = useLocalSearchParams<{ name?: string }>();
  const nameParam = (params.name ?? "").toString().trim().toLowerCase();

  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [evolutionLines, setEvolutionLines] = useState<EvolutionLine[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nameParam) return;
    fetchAll(nameParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameParam]);

  async function fetchAll(name: string) {
    setLoading(true);
    setError(null);
    setPokemon(null);
    setSpecies(null);
    setEvolutionLines([]);

    try {
      // 1) Détails Pokemon
      const resPokemon = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`
      );
      if (!resPokemon.ok) throw new Error(`Pokemon HTTP ${resPokemon.status}`);
      const detail: Pokemon = await resPokemon.json();
      setPokemon(detail);

      // 2) Species (description, genus, evolution_chain)
      const resSpecies = await fetch(detail.species.url);
      if (!resSpecies.ok) throw new Error(`Species HTTP ${resSpecies.status}`);
      const speciesData: PokemonSpecies = await resSpecies.json();
      setSpecies(speciesData);

      // 3) Evolution chain
      const resEvo = await fetch(speciesData.evolution_chain.url);
      if (!resEvo.ok) throw new Error(`Evolution HTTP ${resEvo.status}`);
      const evoData: EvolutionChain = await resEvo.json();

      const lines = buildEvolutionLines(evoData.chain);
      setEvolutionLines(lines);
    } catch (e: any) {
      console.log(e);
      setError("Impossible de charger les détails.");
    } finally {
      setLoading(false);
    }
  }

  const title = pokemon ? `${capitalize(pokemon.name)} #${pokemon.id}` : "Détails";

  const types = useMemo(() => {
    if (!pokemon) return [];
    return [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name);
  }, [pokemon]);

  const artwork = pokemon?.sprites?.other?.["official-artwork"]?.front_default
    ?? pokemon?.sprites?.other?.home?.front_default
    ?? pokemon?.sprites?.front_default
    ?? null;

  const spritesGallery = useMemo(() => {
    if (!pokemon) return [];
    const s = pokemon.sprites;
    const officialDefault = pokemon.sprites?.other?.["official-artwork"]?.front_default ?? null;
    const officialShiny = pokemon.sprites?.other?.["official-artwork"]?.front_shiny ?? null;

    const imgs = [
      { label: "Artwork", uri: officialDefault },
      { label: "Front", uri: s.front_default },
      { label: "Back", uri: s.back_default },
      { label: "Shiny", uri: s.front_shiny },
      { label: "Shiny back", uri: s.back_shiny },
      { label: "Artwork shiny", uri: officialShiny },
    ].filter((x) => !!x.uri);

    return imgs as Array<{ label: string; uri: string }>;
  }, [pokemon]);

  const flavorFR = useMemo(() => {
    if (!species) return null;
    const entry =
      species.flavor_text_entries.find((e) => e.language.name === "fr")
      ?? species.flavor_text_entries.find((e) => e.language.name === "en");
    return entry ? entry.flavor_text.replace(/\s+/g, " ").trim() : null;
  }, [species]);

  const genusFR = useMemo(() => {
    if (!species) return null;
    const g =
      species.genera.find((x) => x.language.name === "fr")
      ?? species.genera.find((x) => x.language.name === "en");
    return g?.genus ?? null;
  }, [species]);

  const statsRows = useMemo(() => {
    if (!pokemon) return [];
    return pokemon.stats.map((s) => ({
      key: s.stat.name,
      label: statLabel(s.stat.name),
      value: s.base_stat,
    }));
  }, [pokemon]);

  return (
    <>
      <Stack.Screen options={{ title }} />

      <ScrollView contentContainerStyle={styles.container}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="orange" />
            <Text style={{ marginTop: 8 }}>Chargement…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.center}>
            <Text style={{ color: "crimson", fontWeight: "700" }}>{error}</Text>
          </View>
        )}

        {!loading && !error && pokemon && (
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.name}>{capitalize(pokemon.name)}</Text>
              <Text style={styles.sub}>{genusFR ? genusFR : `#${pokemon.id}`}</Text>

              {artwork && (
                <Image
                  source={{ uri: artwork }}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              )}

              {/* Types */}
              <View style={styles.typeRow}>
                {pokemon.types
                  .slice()
                  .sort((a, b) => a.slot - b.slot)
                  .map((t, index) => {
                    const meta = TYPE_META[t.type.name];

                    return (
                      <View key={t.type.name} style={styles.badgeWrapper}>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: meta?.color ?? "#ccc" },
                          ]}
                        >
                          <Text style={styles.badgeText}>
                            {meta?.emoji ?? "❓"} {t.type.name}
                          </Text>
                        </View>

                        {index < pokemon.types.length - 1 && (
                          <Text style={styles.separator}> / </Text>
                        )}
                      </View>
                    );
                  })}
              </View>


              {flavorFR && <Text style={styles.flavor}>"{flavorFR}"</Text>}
            </View>

            {/* Tableau infos */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Infos</Text>

              <View style={styles.table}>
                <View style={styles.tr}>
                  <Text style={styles.th}>ID</Text>
                  <Text style={styles.td}>#{pokemon.id}</Text>
                </View>
                <View style={styles.tr}>
                  <Text style={styles.th}>Taille</Text>
                  <Text style={styles.td}>{metersFromDecimeters(pokemon.height)} m</Text>
                </View>
                <View style={styles.tr}>
                  <Text style={styles.th}>Poids</Text>
                  <Text style={styles.td}>{kgFromHectograms(pokemon.weight)} kg</Text>
                </View>
                <View style={styles.tr}>
                  <Text style={styles.th}>XP base</Text>
                  <Text style={styles.td}>{pokemon.base_experience}</Text>
                </View>
              </View>
            </View>

            {/* Tableau stats */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Stats</Text>

              <View style={styles.table}>
                {statsRows.map((row) => (
                  <View key={row.key} style={styles.tr}>
                    <Text style={styles.th}>{row.label}</Text>
                    <Text style={styles.td}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Talents */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Talents</Text>

              {pokemon.abilities
                .slice()
                .sort((a, b) => a.slot - b.slot)
                .map((a) => (
                  <Text key={a.ability.name} style={styles.bullet}>
                    • {a.ability.name}
                    {a.is_hidden ? " (caché)" : ""}
                  </Text>
                ))}
            </View>

            {/* Galerie images */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Images</Text>

              <View style={styles.gallery}>
                {spritesGallery.map((img) => (
                  <View key={img.label} style={styles.galleryItem}>
                    <Image source={{ uri: img.uri }} style={styles.galleryImg} />
                    <Text style={styles.galleryLabel}>{img.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Evolutions */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Évolutions</Text>

              {evolutionLines.length === 0 ? (
                <Text style={{ color: "#555" }}>Aucune donnée d’évolution.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {evolutionLines.map((line, idx) => (
                    <View key={`${idx}-${line.join("-")}`} style={styles.evoLine}>
                      {line.map((pokeName, i) => (
                        <View key={pokeName} style={styles.evoNode}>
                          <Link
                            href={{ pathname: "/details", params: { name: pokeName } }}
                            style={styles.evoLink}
                          >
                            <Text style={styles.evoLinkText}>{capitalize(pokeName)}</Text>
                          </Link>

                          {i < line.length - 1 && (
                            <Text style={styles.evoArrow}>→</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    paddingTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  sub: {
    color: "#666",
    fontWeight: "700",
  },
  heroImage: {
    width: 260,
    height: 260,
  },
  typesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eee",
  },
  typePillText: {
    fontWeight: "800",
    color: "#333",
  },
  flavor: {
    marginTop: 6,
    color: "#444",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
  },

  table: {
    gap: 8,
  },
  tr: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  th: {
    fontWeight: "800",
    color: "#333",
  },
  td: {
    fontWeight: "700",
    color: "#444",
  },

  bullet: {
    color: "#333",
    fontWeight: "600",
    lineHeight: 22,
  },

  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  galleryItem: {
    width: 110,
    alignItems: "center",
    gap: 4,
  },
  galleryImg: {
    width: 96,
    height: 96,
  },
  galleryLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "700",
    textAlign: "center",
  },

  evoLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    alignItems: "center",
  },
  evoNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  evoArrow: {
    fontWeight: "900",
    color: "#666",
    marginHorizontal: 4,
  },
  evoLink: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
  },
  evoLinkText: {
    fontWeight: "900",
    color: "#333",
  },
  typeRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 6,
  },

  badgeWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },

  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },

  separator: {
    marginHorizontal: 6,
    fontWeight: "bold",
    color: "#666",
  },

});
