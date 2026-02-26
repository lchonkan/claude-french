import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useIntl } from "react-intl";
import { View, Text, StyleSheet } from "react-native";

// ---------------------------------------------------------------------------
// Placeholder screens (to be replaced with real implementations)
// ---------------------------------------------------------------------------

function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel principal</Text>
      <Text style={styles.subtitle}>
        Bienvenido a tu panel de aprendizaje de frances.
      </Text>
    </View>
  );
}

function VocabularyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vocabulario</Text>
      <Text style={styles.subtitle}>
        Explora y repasa tu vocabulario en frances.
      </Text>
    </View>
  );
}

function GrammarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gramatica</Text>
      <Text style={styles.subtitle}>
        Lecciones y ejercicios de gramatica francesa.
      </Text>
    </View>
  );
}

function ConversationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversacion</Text>
      <Text style={styles.subtitle}>
        Practica conversacion en frances con IA.
      </Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>
        Gestiona tu perfil y configuracion.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tab navigator param list
// ---------------------------------------------------------------------------

export type TabParamList = {
  Dashboard: undefined;
  Vocabulary: undefined;
  Grammar: undefined;
  Conversation: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// ---------------------------------------------------------------------------
// Tab navigator component
// ---------------------------------------------------------------------------

export function TabNavigator() {
  const intl = useIntl();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: "600" },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarStyle: {
          borderTopColor: "#E5E7EB",
          paddingBottom: 4,
          height: 56,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: intl.formatMessage({ id: "nav.dashboard" }),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Vocabulary"
        component={VocabularyScreen}
        options={{
          title: intl.formatMessage({ id: "nav.vocabulary" }),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="book" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Grammar"
        component={GrammarScreen}
        options={{
          title: intl.formatMessage({ id: "nav.grammar" }),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="doc" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{
          title: intl.formatMessage({ id: "nav.conversation" }),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="chat" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: intl.formatMessage({ id: "nav.profile" }),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Simple text-based tab icon (replace with actual icon library)
// ---------------------------------------------------------------------------

const ICON_LABELS: Record<string, string> = {
  home: "\u2302",
  book: "\u{1F4D6}",
  doc: "\u{1F4DD}",
  chat: "\u{1F4AC}",
  user: "\u{1F464}",
};

function TabIcon({
  name,
  color,
  size,
}: {
  name: string;
  color: string;
  size: number;
}) {
  return (
    <Text style={{ fontSize: size - 4, color }} accessibilityElementsHidden>
      {ICON_LABELS[name] ?? "?"}
    </Text>
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
