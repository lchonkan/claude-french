import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useIntl } from "react-intl";
import { apiClient } from "../services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: string;
}

interface CorrectionData {
  original: string;
  corrected: string;
  explanation: string;
}

interface MessageData {
  role: "user" | "assistant";
  content: string;
  corrections: CorrectionData[];
  has_spanish_fallback: boolean;
  timestamp: string;
}

interface StartSessionResponse {
  session_id: string;
  scenario_title: string;
  cefr_level: string;
  greeting: string;
  messages: MessageData[];
}

interface MessageResponse {
  role: "assistant";
  content: string;
  corrections: CorrectionData[];
  has_spanish_fallback: boolean;
}

interface EndSessionResponse {
  session_id: string;
  status: string;
  message_count: number;
  evaluation_pending: boolean;
}

interface EvaluationData {
  session_id: string;
  vocabulary_score: number | null;
  grammar_score: number | null;
  communicative_score: number | null;
  feedback_es: string;
  status: string;
}

type ScreenView = "scenarios" | "chat" | "evaluation";

// ---------------------------------------------------------------------------
// Predefined scenarios (fallback)
// ---------------------------------------------------------------------------

const FALLBACK_SCENARIOS: ConversationScenario[] = [
  {
    id: "cafe",
    title: "Ordering at a Parisian cafe",
    description: "Practica pedir bebidas y comida en un cafe parisino.",
    icon: "coffee",
    difficulty: "A1",
  },
  {
    id: "directions",
    title: "Asking for directions",
    description: "Aprende a preguntar y entender direcciones en la ciudad.",
    icon: "map",
    difficulty: "A1",
  },
  {
    id: "meeting",
    title: "Meeting someone new",
    description: "Presentate y conoce a alguien por primera vez.",
    icon: "users",
    difficulty: "A1",
  },
  {
    id: "shopping",
    title: "Shopping at the market",
    description: "Compra frutas, verduras y productos en el mercado.",
    icon: "shopping-bag",
    difficulty: "A2",
  },
  {
    id: "restaurant",
    title: "At the restaurant",
    description: "Reserva, ordena y paga en un restaurante frances.",
    icon: "utensils",
    difficulty: "A2",
  },
];

// ---------------------------------------------------------------------------
// Chat bubble sub-component
// ---------------------------------------------------------------------------

function ChatBubbleMobile({
  message,
  onCorrectionPress,
}: {
  message: MessageData;
  onCorrectionPress?: (correction: CorrectionData) => void;
}) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text style={[styles.roleLabel, isUser ? styles.roleLabelUser : styles.roleLabelAssistant]}>
          {isUser ? "Tu" : "Tuteur IA"}
        </Text>
        <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAssistant]}>
          {message.content}
        </Text>

        {/* Spanish fallback indicator */}
        {message.has_spanish_fallback && !isUser && (
          <View style={styles.spanishBadge}>
            <Text style={styles.spanishBadgeText}>
              Incluye explicacion en espanol
            </Text>
          </View>
        )}

        {/* Corrections */}
        {!isUser && message.corrections.length > 0 && (
          <View style={styles.correctionsContainer}>
            <Text style={styles.correctionsTitle}>
              {message.corrections.length === 1
                ? "1 correccion:"
                : `${message.corrections.length} correcciones:`}
            </Text>
            {message.corrections.map((c, i) => (
              <Pressable
                key={i}
                style={styles.correctionItem}
                onPress={() => onCorrectionPress?.(c)}
                accessibilityRole="button"
                accessibilityLabel={`Correccion: ${c.original} a ${c.corrected}`}
              >
                <Text style={styles.correctionOriginal}>{c.original}</Text>
                <Text style={styles.correctionArrow}> {">"} </Text>
                <Text style={styles.correctionCorrected}>{c.corrected}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAssistant]}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Score bar sub-component
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  const pct = score != null ? Math.round(score * 100) : 0;
  const barColor =
    score != null && score >= 0.6
      ? "#2563EB"
      : score != null && score >= 0.4
        ? "#F59E0B"
        : "#EF4444";

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={styles.scoreBarValue}>
          {score != null ? `${pct}%` : "N/A"}
        </Text>
      </View>
      <View style={styles.scoreBarBg}>
        <View
          style={[
            styles.scoreBarFill,
            {
              width: `${pct}%`,
              backgroundColor: score != null ? barColor : "#E5E7EB",
            },
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ConversationScreen() {
  const intl = useIntl();

  // View state
  const [view, setView] = useState<ScreenView>("scenarios");

  // Scenario state
  const [scenarios, setScenarios] = useState<ConversationScenario[]>(FALLBACK_SCENARIOS);
  const [loadingScenarios, setLoadingScenarios] = useState(true);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evaluation
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);

  // Correction detail overlay
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionData | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // ---- Load scenarios ----
  useEffect(() => {
    async function load() {
      try {
        const result = await apiClient<{ data: { scenarios: ConversationScenario[] } }>(
          "/conversation/scenarios"
        );
        if (result.data.scenarios.length > 0) {
          setScenarios(result.data.scenarios);
        }
      } catch {
        // Keep fallback scenarios
      } finally {
        setLoadingScenarios(false);
      }
    }
    load();
  }, []);

  // ---- Auto-scroll on new messages ----
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // ---- Start session ----
  const handleStartSession = useCallback(async (scenario: ConversationScenario) => {
    setStarting(true);
    setError(null);

    try {
      const result = await apiClient<{ data: StartSessionResponse }>(
        "/conversation/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            cefr_level: "A1",
            scenario: scenario.title,
          }),
        }
      );

      setSessionId(result.data.session_id);
      setScenarioTitle(result.data.scenario_title);
      setMessages(result.data.messages);
      setView("chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar");
    } finally {
      setStarting(false);
    }
  }, []);

  // ---- Send message ----
  const handleSend = useCallback(async () => {
    if (!sessionId || !inputValue.trim() || sending) return;

    const content = inputValue.trim();
    setInputValue("");
    setSending(true);
    setError(null);

    // Optimistic user message
    const userMsg: MessageData = {
      role: "user",
      content,
      corrections: [],
      has_spanish_fallback: false,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const result = await apiClient<{ data: MessageResponse }>(
        `/conversation/sessions/${sessionId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      );

      const aiMsg: MessageData = {
        role: "assistant",
        content: result.data.content,
        corrections: result.data.corrections,
        has_spanish_fallback: result.data.has_spanish_fallback,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }, [sessionId, inputValue, sending]);

  // ---- End session ----
  const handleEnd = useCallback(async () => {
    if (!sessionId || ending) return;
    setEnding(true);
    setError(null);

    try {
      await apiClient<{ data: EndSessionResponse }>(
        `/conversation/sessions/${sessionId}/end`,
        { method: "POST" }
      );

      try {
        const evalResult = await apiClient<{ data: EvaluationData }>(
          `/conversation/sessions/${sessionId}/evaluation`
        );
        setEvaluation(evalResult.data);
      } catch {
        setEvaluation({
          session_id: sessionId,
          vocabulary_score: null,
          grammar_score: null,
          communicative_score: null,
          feedback_es: "La evaluacion no esta disponible.",
          status: "completed",
        });
      }
      setView("evaluation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al finalizar");
    } finally {
      setEnding(false);
    }
  }, [sessionId, ending]);

  // ---- Reset ----
  const handleNewConversation = useCallback(() => {
    setSessionId(null);
    setScenarioTitle("");
    setMessages([]);
    setInputValue("");
    setEvaluation(null);
    setError(null);
    setSelectedCorrection(null);
    setView("scenarios");
  }, []);

  // ======== Scenarios view ========
  if (view === "scenarios") {
    if (starting) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Iniciando conversacion...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Conversacion</Text>
        <Text style={styles.pageSubtitle}>
          Elige un escenario para practicar frances
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loadingScenarios ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.scenarioList}>
            {scenarios.map((scenario) => (
              <Pressable
                key={scenario.id}
                style={styles.scenarioCard}
                onPress={() => handleStartSession(scenario)}
                accessibilityRole="button"
                accessibilityLabel={scenario.title}
              >
                <View style={styles.scenarioHeader}>
                  <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                  <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>{scenario.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.scenarioDescription}>{scenario.description}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // ======== Evaluation view ========
  if (view === "evaluation" && evaluation) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Conversacion completada</Text>
        <Text style={styles.pageSubtitle}>{scenarioTitle}</Text>

        <View style={styles.evalCard}>
          <Text style={styles.evalCardTitle}>Evaluacion</Text>
          <Text style={styles.evalMessageCount}>
            {messages.length} mensajes intercambiados
          </Text>

          <View style={styles.evalScores}>
            <ScoreBar label="Vocabulario" score={evaluation.vocabulary_score} />
            <ScoreBar label="Gramatica" score={evaluation.grammar_score} />
            <ScoreBar label="Comunicacion" score={evaluation.communicative_score} />
          </View>

          <View style={styles.evalFeedback}>
            <Text style={styles.evalFeedbackTitle}>Retroalimentacion</Text>
            <Text style={styles.evalFeedbackText}>{evaluation.feedback_es}</Text>
          </View>

          <Pressable
            style={styles.newConversationButton}
            onPress={handleNewConversation}
            accessibilityRole="button"
            accessibilityLabel="Nueva conversacion"
          >
            <Text style={styles.newConversationButtonText}>Nueva conversacion</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ======== Chat view ========
  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderText}>
          <Text style={styles.chatHeaderTitle} numberOfLines={1}>
            {scenarioTitle}
          </Text>
          <Text style={styles.chatHeaderSubtitle}>Nivel A1</Text>
        </View>
        <Pressable
          style={[
            styles.endButton,
            (ending || messages.length < 2) && styles.endButtonDisabled,
          ]}
          onPress={handleEnd}
          disabled={ending || messages.length < 2}
          accessibilityRole="button"
          accessibilityLabel="Terminar conversacion"
        >
          {ending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.endButtonText}>Terminar</Text>
          )}
        </Pressable>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <ChatBubbleMobile
            message={item}
            onCorrectionPress={setSelectedCorrection}
          />
        )}
        contentContainerStyle={styles.messagesList}
        ListFooterComponent={
          sending ? (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>Tuteur IA escribe...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Correction detail overlay */}
      {selectedCorrection && (
        <Pressable
          style={styles.correctionOverlay}
          onPress={() => setSelectedCorrection(null)}
        >
          <View style={styles.correctionDetail}>
            <Text style={styles.correctionDetailTitle}>Correccion</Text>
            <View style={styles.correctionDetailRow}>
              <Text style={styles.correctionDetailOriginal}>
                {selectedCorrection.original}
              </Text>
              <Text style={styles.correctionDetailArrow}> {">"} </Text>
              <Text style={styles.correctionDetailCorrected}>
                {selectedCorrection.corrected}
              </Text>
            </View>
            <Text style={styles.correctionDetailExplanation}>
              {selectedCorrection.explanation}
            </Text>
            <Pressable
              style={styles.correctionDetailClose}
              onPress={() => setSelectedCorrection(null)}
            >
              <Text style={styles.correctionDetailCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* Input area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Ecris en francais..."
          placeholderTextColor="#9CA3AF"
          editable={!sending && !ending}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          autoCorrect={false}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!inputValue.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputValue.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Enviar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 24,
  },

  // Page header
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },

  // Scenarios
  scenarioList: {
    gap: 12,
  },
  scenarioCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  scenarioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  scenarioTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  scenarioDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  // Chat container
  chatContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  chatHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  chatHeaderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  endButton: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: "center",
  },
  endButtonDisabled: {
    opacity: 0.5,
  },
  endButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // Messages
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  bubbleRow: {
    marginBottom: 12,
  },
  bubbleRowUser: {
    alignItems: "flex-end",
  },
  bubbleRowAssistant: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  roleLabelUser: {
    color: "#93C5FD",
  },
  roleLabelAssistant: {
    color: "#9CA3AF",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: "#FFFFFF",
  },
  messageTextAssistant: {
    color: "#111827",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  timestampUser: {
    color: "#93C5FD",
  },
  timestampAssistant: {
    color: "#9CA3AF",
  },

  // Spanish fallback badge
  spanishBadge: {
    backgroundColor: "#FFFBEB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  spanishBadgeText: {
    fontSize: 11,
    color: "#92400E",
  },

  // Corrections
  correctionsContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
  },
  correctionsTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#991B1B",
    marginBottom: 4,
  },
  correctionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  correctionOriginal: {
    fontSize: 12,
    color: "#991B1B",
    textDecorationLine: "line-through",
  },
  correctionArrow: {
    fontSize: 12,
    color: "#6B7280",
  },
  correctionCorrected: {
    fontSize: 12,
    fontWeight: "600",
    color: "#166534",
  },

  // Typing indicator
  typingContainer: {
    alignItems: "flex-start",
    marginTop: 4,
  },
  typingBubble: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  // Correction detail overlay
  correctionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  correctionDetail: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  correctionDetailTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  correctionDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  correctionDetailOriginal: {
    fontSize: 16,
    color: "#DC2626",
    textDecorationLine: "line-through",
  },
  correctionDetailArrow: {
    fontSize: 14,
    color: "#6B7280",
    marginHorizontal: 4,
  },
  correctionDetailCorrected: {
    fontSize: 16,
    fontWeight: "600",
    color: "#16A34A",
  },
  correctionDetailExplanation: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 16,
  },
  correctionDetailClose: {
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  correctionDetailCloseText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  // Input area
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  sendButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Error
  errorBanner: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#991B1B",
  },

  // Loading
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },

  // Evaluation
  evalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  evalCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  evalMessageCount: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 20,
  },
  evalScores: {
    gap: 16,
    marginBottom: 20,
  },
  scoreBarContainer: {
    marginBottom: 4,
  },
  scoreBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  scoreBarLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  scoreBarValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  scoreBarBg: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 8,
    borderRadius: 4,
  },
  evalFeedback: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  evalFeedbackTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  evalFeedbackText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },
  newConversationButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  newConversationButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
