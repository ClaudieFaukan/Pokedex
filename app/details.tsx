import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text } from "react-native";

interface PokemonAbility {
  is_hidden: boolean;
  slot: number;
  ability: {
    name: string;
    url: string;
  };
}

// Le vrai JSON de PokeAPI renvoie `sprites` directement (pas `images: { sprites: ... }`)
interface PokemonSprites {
  back_default: string | null;
  back_female: string | null;
  back_shiny: string | null;
  back_shiny_female: string | null;
  front_default: string | null;
  front_female: string | null;
  front_shiny: string | null;
  front_shiny_female: string | null;
  other?: {
    dream_world?: {
      front_default: string | null;
      front_female: string | null;
    };
    home?: {
      front_default: string | null;
      front_female: string | null;
      front_shiny: string | null;
      front_shiny_female: string | null;
    };
    // dans l'API c'est "official-artwork"
    "official-artwork"?: {
      front_default: string | null;
      front_shiny: string | null;
    };
    showdown?: {
      back_default: string | null;
      back_female: string | null;
      back_shiny: string | null; // tu avais `back_shin`
      back_shiny_female: string | null;
      front_default: string | null;
      front_female: string | null;
      front_shiny: string | null;
      front_shiny_female: string | null;
    };
  };
}

interface Pokemon {
  id: number;
  name: string;
  base_experience: number;
  height: number;
  weight: number;
  is_default: boolean;
  order: number;
  abilities: PokemonAbility[];
  sprites: PokemonSprites;
}

export default function Details() {
  const params = useLocalSearchParams<{ name?: string }>();
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.name) return;
    fetchDetail(params.name);
  }, [params.name]);

  async function fetchDetail(name: string) {
    try {
      setLoading(true);

      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const detail: Pokemon = await response.json();
      setPokemon(detail);
    } catch (e) {
      console.log(e);
      setPokemon(null);
    } finally {
      setLoading(false);
    }
  }

  return (
  <ScrollView contentContainerStyle={{ gap: 16, padding: 16 }}>
    {!pokemon && <Text>Chargement…</Text>}

    {pokemon && (
      <>
      <Stack.Screen options={{ title: pokemon.name +'#' + pokemon.id}} />
        {/* Nom */}
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>
          {pokemon.name}
        </Text>

        {/* Image principale */}
        {pokemon.sprites.front_default && (
          <Image
            source={{ uri: pokemon.sprites.front_default }}
            style={{ width: 200, height: 200, alignSelf: "center" }}
            resizeMode="contain"
          />
        )}

        {/* Infos */}
        <Text>Expérience de base : {pokemon.base_experience}</Text>
        <Text>Taille : {pokemon.height}</Text>
        <Text>Poids : {pokemon.weight}</Text>

        {/* Capacités */}
        <Text style={{ marginTop: 12, fontWeight: "bold" }}>
          Capacités
        </Text>

        {pokemon.abilities.map((item, index) => (
          <Text key={index}>
            • {item.ability.name}
            {item.is_hidden ? " (cachée)" : ""}
          </Text>
        ))}
      </>
    )}
  </ScrollView>
  );
}

const styles = StyleSheet.create({});
