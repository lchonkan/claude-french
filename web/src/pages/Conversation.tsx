import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useIntl } from "react-intl";
import { Button, LoadingState } from "@/components/common";
import { ChatBubble, ScenarioSelector, EvaluationSummary } from "@/components/conversation";
import {
  getScenarios,
  startSession,
  sendMessage,
  endSession,
  getEvaluation,
  type ConversationScenario,
  type ConversationMessageData,
  type EvaluationData,
} from "@/services/conversation";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Page states
// ---------------------------------------------------------------------------

type PageView = "scenarios" | "chat" | "evaluation";

// ---------------------------------------------------------------------------
// Default CEFR level (in a real app, from user profile)
// ---------------------------------------------------------------------------

const DEFAULT_CEFR_LEVEL: CEFRLevel = "A1";

// ---------------------------------------------------------------------------
// Conversation page
// ---------------------------------------------------------------------------

export default function Conversation() {
  const intl = useIntl();

  // Page state
  const [view, setView] = useState<PageView>("scenarios");

  // Scenario selection
  const [scenarios, setScenarios] = useState<ConversationScenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);

  // Active session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionScenario, setSessionScenario] = useState<string>("");
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  // Evaluation
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- Auto-scroll to latest message ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Focus input after AI responds ----
  useEffect(() => {
    if (!sending && view === "chat") {
      inputRef.current?.focus();
    }
  }, [sending, view]);

  // ---- Load scenarios on mount ----
  useEffect(() => {
    async function loadScenarios() {
      try {
        const result = await getScenarios();
        setScenarios(result.scenarios);
      } catch {
        // Use built-in scenarios as fallback
        setScenarios([
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
        ]);
      } finally {
        setScenariosLoading(false);
      }
    }
    loadScenarios();
  }, []);

  // ---- Start a new conversation session ----
  const handleSelectScenario = useCallback(
    async (scenario: ConversationScenario) => {
      setStarting(true);
      setError(null);

      try {
        const result = await startSession(DEFAULT_CEFR_LEVEL, scenario.title);
        setSessionId(result.session_id);
        setSessionScenario(result.scenario_title);
        setMessages(result.messages);
        setView("chat");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al iniciar la conversacion."
        );
      } finally {
        setStarting(false);
      }
    },
    []
  );

  // ---- Send a message ----
  const handleSendMessage = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!sessionId || !inputValue.trim() || sending) return;

      const userContent = inputValue.trim();
      setInputValue("");
      setSending(true);
      setError(null);

      // Optimistically add user message
      const userMsg: ConversationMessageData = {
        role: "user",
        content: userContent,
        corrections: [],
        has_spanish_fallback: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const response = await sendMessage(sessionId, userContent);

        // Add AI response
        const aiMsg: ConversationMessageData = {
          role: "assistant",
          content: response.content,
          corrections: response.corrections,
          has_spanish_fallback: response.has_spanish_fallback,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al enviar el mensaje."
        );
      } finally {
        setSending(false);
      }
    },
    [sessionId, inputValue, sending]
  );

  // ---- End conversation ----
  const handleEndConversation = useCallback(async () => {
    if (!sessionId || ending) return;

    setEnding(true);
    setError(null);

    try {
      await endSession(sessionId);

      // Fetch evaluation
      try {
        const evalResult = await getEvaluation(sessionId);
        setEvaluation(evalResult);
      } catch {
        setEvaluation({
          session_id: sessionId,
          vocabulary_score: null,
          grammar_score: null,
          communicative_score: null,
          feedback_es:
            "La evaluacion no esta disponible en este momento.",
          status: "completed",
        });
      }

      setView("evaluation");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al finalizar la conversacion."
      );
    } finally {
      setEnding(false);
    }
  }, [sessionId, ending]);

  // ---- Start new conversation (reset) ----
  const handleNewConversation = useCallback(() => {
    setSessionId(null);
    setSessionScenario("");
    setMessages([]);
    setInputValue("");
    setEvaluation(null);
    setError(null);
    setView("scenarios");
  }, []);

  // ---- Render: Scenario selection ----
  if (view === "scenarios") {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: "conversation.title" })}
          </h1>
          <p className="mt-2 text-gray-500">
            Elige un escenario para practicar conversacion en frances con tu tutor IA.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {starting ? (
          <LoadingState
            message="Iniciando conversacion..."
            estimatedDuration="unos segundos"
          />
        ) : (
          <ScenarioSelector
            scenarios={scenarios}
            onSelect={handleSelectScenario}
            loading={scenariosLoading}
          />
        )}
      </div>
    );
  }

  // ---- Render: Evaluation ----
  if (view === "evaluation" && evaluation) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Conversacion completada
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {sessionScenario}
          </p>
        </div>

        <EvaluationSummary
          vocabularyScore={evaluation.vocabulary_score}
          grammarScore={evaluation.grammar_score}
          communicativeScore={evaluation.communicative_score}
          feedbackEs={evaluation.feedback_es}
          messageCount={messages.length}
          onNewConversation={handleNewConversation}
        />
      </div>
    );
  }

  // ---- Render: Active chat ----
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {sessionScenario}
          </h1>
          <p className="text-xs text-gray-500">
            Nivel {DEFAULT_CEFR_LEVEL} -- Escribe en frances
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={handleEndConversation}
          loading={ending}
          disabled={ending || messages.length < 2}
        >
          Terminar conversacion
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <ChatBubble
              key={index}
              role={msg.role}
              content={msg.content}
              corrections={msg.corrections}
              hasSpanishFallback={msg.has_spanish_fallback}
              timestamp={msg.timestamp}
            />
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Tuteur IA</span>
                </div>
                <div className="mt-1 flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 pt-4">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ecris en francais..."
            disabled={sending || ending}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            aria-label="Escribe tu mensaje en frances"
            autoComplete="off"
          />
          <Button
            variant="primary"
            type="submit"
            disabled={!inputValue.trim() || sending || ending}
            loading={sending}
            icon={
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            }
          >
            Enviar
          </Button>
        </form>

        {/* Helper hints */}
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
          <span>Tip: Escribe en espanol si necesitas ayuda</span>
          <span>|</span>
          <span>
            {messages.filter((m) => m.role === "user").length} mensajes enviados
          </span>
        </div>
      </div>
    </div>
  );
}
