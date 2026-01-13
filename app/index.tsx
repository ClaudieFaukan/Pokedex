import { TYPE_META } from "@/themes/colorsByType";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Pokemon {
  name: string;
  image: string;
  imageBack: string;
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

  const [isLoading, setIsLoading] = useState(false);       // loader initial
  const [isLoadingMore, setIsLoadingMore] = useState(false); // loader pagination

  const [page, setPage] = useState(1); // page "logique"
  const [hasNextPage, setHasNextPage] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // charge la première page
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

  async function loadListPage(pageNumber: number, isFirstLoad = false) {
    // Si on est en recherche, on ne paginate pas
    if (searchQuery.trim()) return;

    if (!hasNextPage && !isFirstLoad) return;

    // loaders séparés (initial vs pagination)
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

      // si next est null -> plus de page
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
          };
        })
      );

      // append (concat) au lieu de remplacer
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
      };

      setPokemons([pokemon]);

      // en mode recherche: pas de next page
      setHasNextPage(false);
    } catch (e: any) {
      if (e?.name !== "AbortError") console.log(e);
    } finally {
      setIsLoading(false);
    }
  }

  // Debounce recherche (400ms)
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    const timer = setTimeout(() => {
      if (!q) {
        // retour liste + pagination
        resetAndLoadFirstPage();
      } else {
        // recherche exacte
        loadByName(q);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleLoadMore = () => {
    // éviter multi-calls
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
        onChangeText={handleSearch}
        placeholder="Recherche (ex: pikachu)"
      />

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
          renderItem={({ item: pokemon }) => (
            <Link
              href={{ pathname: "/details", params: { name: pokemon.name } }}
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

                <View style={styles.imageRow}>
                  {!!pokemon.image && (
                    <Image source={{ uri: pokemon.image }} style={styles.image} />
                  )}
                  {!!pokemon.imageBack && (
                    <Image source={{ uri: pokemon.imageBack }} style={styles.image} />
                  )}
                </View>
              </View>
            </Link>
          )}
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
  imageRow: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  image: { width: 150, height: 150 },
});
