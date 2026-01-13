import { TYPE_META } from "@/themes/colorsByType";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Pressable
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Pokemon {
  name: string;
  image: string;
  imageBack: string;
  artwork: string | null;
  artworkShinny: string | null;
  types: PokemonType[];
}
interface PokemonType {
  type: { name: string; url: string };
}
type PokemonListItem = { name: string; url: string };

export default function Index() {
  const DETAIL_ENDPOINT = "https://pokeapi.co/api/v2/pokemon"; // /{name}
  const LIMIT = 50;

  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const [showShiny, setShowShiny] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    resetAndLoadFirstPage();
  }, []);

  function buildListUrl(pageNumber: number) {
    const offset = (pageNumber - 1) * LIMIT;
    return `https://pokeapi.co/api/v2/pokemon?limit=${LIMIT}&offset=${offset}`;
  }

  function resetAndLoadFirstPage() {
    setPokemons([]);
    setPage(1);
    setHasNextPage(true);
    loadListPage(1, true);
  }

  function getDisplayedArtwork(p: Pokemon) {
    return showShiny ? p.artworkShinny ?? p.artwork : p.artwork;
  }

  async function loadListPage(pageNumber: number, isFirstLoad = false) {
    if (searchQuery.trim()) return;
    if (!hasNextPage && !isFirstLoad) return;

    if (isFirstLoad) setIsLoading(true);
    else setIsLoadingMore(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = buildListUrl(pageNumber);
      const response = await fetch(url, { signal: controller.signal });
      const data: { results: PokemonListItem[]; next: string | null } =
        await response.json();

      setHasNextPage(Boolean(data.next));

      const detailPokemons: Pokemon[] = await Promise.all(
        data.results.map(async (p) => {
          const res = await fetch(p.url, { signal: controller.signal });
          const details = await res.json();

          return {
            name: details.name,
            image: details.sprites.front_default,
            imageBack: details.sprites.back_default,
            types: details.types,
            artwork:
              details.sprites?.other?.["official-artwork"]?.front_default ?? null,
            artworkShinny:
              details.sprites?.other?.["official-artwork"]?.front_shiny ?? null,
          };
        })
      );

      setPokemons((prev) => [...prev, ...detailPokemons]);
      setPage(pageNumber);
    } catch (e: any) {
      if (e?.name !== "AbortError") console.log(e);
    } finally {
      if (isFirstLoad) setIsLoading(false);
      else setIsLoadingMore(false);
    }
  }

  async function loadByName(name: string) {
    setIsLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${DETAIL_ENDPOINT}/${name}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        setPokemons([]);
        return;
      }

      const details = await response.json();

      const pokemon: Pokemon = {
        name: details.name,
        image: details.sprites.front_default,
        imageBack: details.sprites.back_default,
        types: details.types,
        artwork:
          details.sprites?.other?.["official-artwork"]?.front_default ?? null,
        artworkShinny:
          details.sprites?.other?.["official-artwork"]?.front_shiny ?? null,
      };

      setPokemons([pokemon]);
      setHasNextPage(false);
    } catch (e: any) {
      if (e?.name !== "AbortError") console.log(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    const timer = setTimeout(() => {
      if (!q) resetAndLoadFirstPage();
      else loadByName(q);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore) return;
    if (!hasNextPage) return;
    if (searchQuery.trim()) return;

    loadListPage(page + 1);
  };

  return (
    <SafeAreaView style={{ flex: 1, marginHorizontal: 10 }}>
      <TextInput
        style={styles.searchBar}
        clearButtonMode="always"
        autoCapitalize="none"
        autoCorrect={false}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Recherche (ex: pikachu)"
      />

      {/* Switch Shiny */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Shiny</Text>
        <Switch value={showShiny} onValueChange={setShowShiny} />
        <Text style={styles.switchState}>{showShiny ? "ON" : "OFF"}</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size={"large"} color="orange" />
        </View>
      ) : (
        <FlatList
          data={pokemons}
          keyExtractor={(pokemon) => pokemon.name}
          contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size={"small"} color="orange" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              Aucun Pokémon trouvé
            </Text>
          }
          renderItem={({ item: pokemon }) => {
            const displayedArtwork = getDisplayedArtwork(pokemon);

            return (
              <Link
                href={{ pathname: "/details", params: { name: pokemon.name } }}
                style={{
                  // @ts-ignore
                  backgroundColor: TYPE_META[pokemon.types[0].type.name].color + "50",
                  padding: 20,
                  borderRadius: 20,
                }}
                asChild
              >
                <Pressable
                  style={{
                    // @ts-ignore
                    backgroundColor: TYPE_META[pokemon.types[0].type.name].color + "50",
                    padding: 20,
                    borderRadius: 20,
                  }}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.name}>{pokemon.name}</Text>

                    <View style={styles.typeRow}>
                      {pokemon.types.map((t, index) => {
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

                    <View style={styles.artworkWrapper}>
                      {displayedArtwork ? (
                        <Image source={{ uri: displayedArtwork }} style={styles.artworkImage} />
                      ) : (
                        <Text style={{ marginTop: 10, opacity: 0.7 }}>
                          Artwork indisponible
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 28, fontWeight: "bold", textAlign: "center" },

  searchBar: {
    paddingHorizontal: 20,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
  },

  switchRow: {
    marginTop: 10,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  switchLabel: { fontWeight: "700" },
  switchState: { width: 40, textAlign: "left", fontWeight: "700" },

  badgeWrapper: { flexDirection: "row", alignItems: "center" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  badgeText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  separator: { marginHorizontal: 6, fontWeight: "bold" },

  cardContent: { alignItems: "center", gap: 8 },

  typeRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },

  artworkWrapper: {
    marginTop: 8,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  artworkImage: {
    width: 220,
    height: 220,
    resizeMode: "contain",
  },
});
