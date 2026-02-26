import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { useIntl } from "react-intl";
import { View, Text, StyleSheet } from "react-native";
import { TabNavigator } from "./TabNavigator";
import PlacementTestScreen from "../screens/PlacementTest";
import ExitExamScreen from "../screens/ExitExam";

// ---------------------------------------------------------------------------
// Modal / stack screen placeholders
// ---------------------------------------------------------------------------

function PronunciationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pronunciacion</Text>
      <Text style={styles.subtitle}>
        Practica la pronunciacion francesa con analisis de audio.
      </Text>
    </View>
  );
}

function WritingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escritura</Text>
      <Text style={styles.subtitle}>
        Mejora tu escritura en frances con retroalimentacion.
      </Text>
    </View>
  );
}

function ListeningScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comprension auditiva</Text>
      <Text style={styles.subtitle}>
        Ejercicios de escucha y comprension.
      </Text>
    </View>
  );
}

function CulturalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cultura</Text>
      <Text style={styles.subtitle}>
        Explora la cultura francesa y su contexto.
      </Text>
    </View>
  );
}

// PlacementScreen and ExamScreen are now imported from screens/

// ---------------------------------------------------------------------------
// Root stack param list
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Main: undefined;
  Pronunciation: undefined;
  Writing: undefined;
  Listening: undefined;
  Cultural: undefined;
  Placement: undefined;
  Exam: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ---------------------------------------------------------------------------
// Root navigator
// ---------------------------------------------------------------------------

export function RootNavigator() {
  const intl = useIntl();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontWeight: "600" },
          headerBackTitle: intl.formatMessage({ id: "common.back" }),
        }}
      >
        {/* Main tab navigator */}
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />

        {/* Modal screens */}
        <Stack.Group screenOptions={{ presentation: "modal" }}>
          <Stack.Screen
            name="Pronunciation"
            component={PronunciationScreen}
            options={{
              title: intl.formatMessage({ id: "nav.pronunciation" }),
            }}
          />
          <Stack.Screen
            name="Writing"
            component={WritingScreen}
            options={{
              title: intl.formatMessage({ id: "nav.writing" }),
            }}
          />
          <Stack.Screen
            name="Listening"
            component={ListeningScreen}
            options={{
              title: intl.formatMessage({ id: "nav.listening" }),
            }}
          />
          <Stack.Screen
            name="Cultural"
            component={CulturalScreen}
            options={{
              title: intl.formatMessage({ id: "nav.cultural" }),
            }}
          />
        </Stack.Group>

        {/* Full-screen stack screens */}
        <Stack.Group screenOptions={{ presentation: "card" }}>
          <Stack.Screen
            name="Placement"
            component={PlacementTestScreen}
            options={{
              title: intl.formatMessage({ id: "nav.placementTest" }),
              headerBackVisible: false,
            }}
          />
          <Stack.Screen
            name="Exam"
            component={ExitExamScreen}
            options={{
              title: intl.formatMessage({ id: "nav.exitExam" }),
              headerBackVisible: false,
            }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
