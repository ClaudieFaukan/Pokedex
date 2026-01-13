import { colorsByType } from "@/themes/colorsByType";
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
  type: {
    name: string;
    url: string;
  };
}

type PokemonListItem = { name: string; url: string };

export default function Index() {
  const LIST_ENDPOINT = "https://pokeapi.co/api/v2/pokemon?limit=50";
  const DETAIL_ENDPOINT = "https://pokeapi.co/api/v2/pokemon"; // /{name}

  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Pour annuler les fetchs quand on retape vite
  const abortRef = useRef<AbortController | null>(null);

  // Charge la liste au démarrage
  useEffect(() => {
    loadList();
  }, []);

  async function loadList() {
    setIsLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(LIST_ENDPOINT, { signal: controller.signal });
      const data: { results: PokemonListItem[] } = await response.json();

      const detailPokemons: Pokemon[] = await Promise.all(
        data.results.map(async (p) => {
          const res = await fetch(p.url, { signal: controller.signal });
          const details = await res.json();

          return {
            name: p.name,
            image: details.sprites.front_default,
            imageBack: details.sprites.back_default,
            types: details.types,
          };
        })
      );

      setPokemons(detailPokemons);
    } catch (e: any) {
      if (e?.name !== "AbortError") console.log(e);
    } finally {
      setIsLoading(false);
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
        // 404 = pas trouvé → liste vide
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
    } catch (e: any) {
      if (e?.name !== "AbortError") console.log(e);
    } finally {
      setIsLoading(false);
    }
  }


  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    const timer = setTimeout(() => {
      if (!q) {
        loadList(); // retour liste
      } else {
        loadByName(q); // recherche endpoint
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
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
        placeholder="Recherce (ex: pikachu)"
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
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              Aucun Pokémon trouvé
            </Text>
          }
          renderItem={({ item: pokemon }) => (
            <Link key={pokemon.name}
              href={{ pathname: '/details', params: { name: pokemon.name } }}
              style={{
                // @ts-ignore
                backgroundColor: colorsByType[pokemon.types[0].type.name] + 50,
                padding: 20,
                borderRadius: 20
              }}
            >
              <Text style={styles.name}>{pokemon.name}</Text>
              <Text style={styles.type}>{pokemon.types?.[0]?.type?.name}</Text>

              <View style={{ flexDirection: "row", justifyContent: "center" }}>
                {!!pokemon.image && (
                  <Image
                    source={{ uri: pokemon.image }}
                    style={{ width: 150, height: 150 }}
                  />
                )}
                {!!pokemon.imageBack && (
                  <Image
                    source={{ uri: pokemon.imageBack }}
                    style={{ width: 150, height: 150 }}
                  />
                )}
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
  type: { fontSize: 20, fontWeight: "bold", color: "gray", textAlign: "center" },
  searchBar: {
    paddingHorizontal: 20,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
  },
});
