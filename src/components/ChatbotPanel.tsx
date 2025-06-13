import React, { useState, useEffect, useRef } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { PanelData, PanelProps } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { firstValueFrom } from 'rxjs';
import { css } from '@emotion/css';
import DOMPurify from 'dompurify';

// Constants for validation limits
const VALIDATION_LIMITS = {
  MESSAGE_LENGTH: 10000,
  STRING_LENGTH: 1000,
  DESCRIPTION_LENGTH: 500,
  TITLE_LENGTH: 100,
  TYPE_LENGTH: 50,
  ARRAY_SIZE: 100,
  SERIES_LIMIT: 10,
  FIELDS_LIMIT: 20,
  VALUES_LIMIT: 100,
} as const;

// Proper TypeScript interfaces
interface ChatbotPanelProps extends PanelProps {
  options: {
    initialChatMessage?: string;
    llmUsed?: string;
  };
}

interface PanelMetadata {
  id: number;
  title: string;
  description: string;
  type: string;
}

interface Message {
  content: string;
  role: 'user' | 'assistant' | 'system';
  id?: string;
  timestamp?: number;
}

interface GroqApiResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

interface EnrichedPanelData {
  id: number;
  title: string;
  description: string;
  type: string;
  data: Array<{
    name: string;
    type: string;
    values: unknown[];
  }>;
}

interface DashboardData {
  dashboard?: {
    panels?: Array<{
      id: number;
      title?: string;
      description?: string;
      type?: string;
    }>;
  };
}

// Error boundary component with theme support
const ErrorBoundaryContent: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const theme = useTheme2();
  const styles = getStyles(theme);

  return (
    <div className={styles.errorContainer}>
      <h3>Something went wrong with the chatbot</h3>
      <p>Please refresh the panel or check the browser console for details.</p>
      <button className={styles.retryButton} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
};

class ChatbotErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chatbot panel error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryContent onRetry={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}

// Theme-aware CSS styles function
const getStyles = (theme: any) => ({
  container: css`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: ${theme.typography.fontFamily};
    background-color: ${theme.colors.background.primary};
  `,
  chatContainer: css`
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    border-radius: 5px;
    background-color: ${theme.colors.background.primary};
  `,
  messageContainer: css`
    margin-bottom: 10px;
    display: flex;
  `,
  userMessage: css`
    justify-content: flex-end;
  `,
  assistantMessage: css`
    justify-content: flex-start;
  `,
  messageBubble: css`
    max-width: 80%;
    padding: 8px 12px;
    border-radius: 12px;
    word-wrap: break-word;
    white-space: pre-wrap;
  `,
  userBubble: css`
    background-color: ${theme.colors.primary.main};
    color: ${theme.colors.primary.contrastText};
  `,
  assistantBubble: css`
    background-color: ${theme.colors.background.secondary};
    color: ${theme.colors.text.primary};
    border: 1px solid ${theme.colors.border.weak};
  `,
  inputContainer: css`
    display: flex;
    padding: 10px;
    border-top: 1px solid ${theme.colors.border.medium};
    background-color: ${theme.colors.background.primary};
    gap: 10px;
  `,
  input: css`
    flex: 1;
    padding: 8px 12px;
    border: 1px solid ${theme.colors.border.medium};
    border-radius: 20px;
    outline: none;
    font-size: 14px;
    background-color: ${theme.colors.background.primary};
    color: ${theme.colors.text.primary};

    &:focus {
      border-color: ${theme.colors.primary.main};
      box-shadow: 0 0 0 2px ${theme.colors.primary.main}25;
    }

    &:disabled {
      background-color: ${theme.colors.background.secondary};
      cursor: not-allowed;
    }

    &::placeholder {
      color: ${theme.colors.text.secondary};
    }
  `,
  sendButton: css`
    padding: 8px 16px;
    background-color: ${theme.colors.primary.main || theme.colors.blue?.main || '#007bff'};
    color: ${theme.colors.primary.contrastText || theme.colors.blue?.contrastText || 'white'};
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.primary.shade || theme.colors.blue?.shade || '#0056b3'};
    }

    &:disabled {
      background-color: ${theme.colors.text.disabled || '#6c757d'};
      cursor: not-allowed;
    }
  `,
  loadingSpinner: css`
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid ${theme.colors.border.weak};
    border-top: 2px solid ${theme.colors.primary.main};
    border-radius: 50%;
    animation: spin 1s linear infinite;

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `,
  errorContainer: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
    text-align: center;
    color: ${theme.colors.error.main};
  `,
  retryButton: css`
    margin-top: 10px;
    padding: 8px 16px;
    background-color: ${theme.colors.primary.main};
    color: ${theme.colors.primary.contrastText};
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `,
});

// Data sanitization function
function sanitizeDashboardData(data: unknown): unknown {
  if (typeof data === 'string') {
    // More comprehensive HTML/script sanitization
    return data
      .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags with any content
      .replace(/<[^>]*script[^>]*>/gi, '') // Remove malformed script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, etc.)
      .replace(/<\s*\/?[^>]*>/g, '') // Remove all HTML tags
      .slice(0, VALIDATION_LIMITS.STRING_LENGTH);
  }

  if (Array.isArray(data)) {
    return data.slice(0, VALIDATION_LIMITS.ARRAY_SIZE).map((item) => sanitizeDashboardData(item));
  }

  if (data && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    const safeProps = ['title', 'description', 'type', 'id', 'name', 'values'] as const;

    for (const key of safeProps) {
      if (key in data) {
        sanitized[key] = sanitizeDashboardData((data as Record<string, unknown>)[key]);
      }
    }
    return sanitized;
  }

  return data;
}

// Extract panel metadata from dashboard
function extractPanelMetadata(dashboardData: DashboardData, currentPanelId: number): PanelMetadata[] {
  if (!dashboardData?.dashboard?.panels) {
    return [];
  }

  return dashboardData.dashboard.panels
    .filter((panel) => panel && panel.id !== currentPanelId)
    .map((panel) => ({
      id: panel.id,
      description: (panel.description ?? '').slice(0, VALIDATION_LIMITS.DESCRIPTION_LENGTH),
      title: (panel.title ?? '').slice(0, VALIDATION_LIMITS.TITLE_LENGTH),
      type: (panel.type ?? '').slice(0, VALIDATION_LIMITS.TYPE_LENGTH),
    }));
}

// Enrich panel data with metadata
function enrichPanelData(panelData: PanelData, panelMetadata: PanelMetadata[]): EnrichedPanelData[] {
  return panelData.series
    .slice(0, VALIDATION_LIMITS.SERIES_LIMIT)
    .map((panel) => {
      if (!panel.meta || !Array.isArray(panel.fields)) {
        return null;
      }

      const metadata = panelMetadata.find((item) => item.id === panel.meta?.custom?.panelId) ||
        panelMetadata[0] || { id: 0, title: 'Unknown', description: '', type: 'unknown' };

      return {
        ...metadata,
        data: panel.fields.slice(0, VALIDATION_LIMITS.FIELDS_LIMIT).map((field) => ({
          name: (field.name ?? '').slice(0, VALIDATION_LIMITS.TITLE_LENGTH),
          type: (field.type ?? '').slice(0, VALIDATION_LIMITS.TYPE_LENGTH),
          values: Array.isArray(field.values) ? field.values.slice(0, VALIDATION_LIMITS.VALUES_LIMIT) : [],
        })),
      };
    })
    .filter((item): item is EnrichedPanelData => item !== null);
}

// Main data extraction function
async function extractAndEnrichData(
  dashboardId: string,
  currentPanelId: number,
  data: PanelData
): Promise<EnrichedPanelData[]> {
  try {
    const dashboardData = (await getBackendSrv().get(`/api/dashboards/uid/${dashboardId}`)) as DashboardData;
    const sanitizedDashboard = sanitizeDashboardData(dashboardData) as DashboardData;

    const panelMetadata = extractPanelMetadata(sanitizedDashboard, currentPanelId);
    return enrichPanelData(data, panelMetadata);
  } catch (error) {
    console.error('Failed to extract dashboard data:', error);
    throw new Error('Failed to extract dashboard data');
  }
}

// Sanitize message content to prevent XSS attacks
function sanitizeMessageContent(content: string): string {
  // Configure DOMPurify to only allow safe HTML elements and attributes
  const cleanContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'option'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style'],
  });
  
  return cleanContent.slice(0, VALIDATION_LIMITS.MESSAGE_LENGTH);
}

// Validate and sanitize messages
function validateMessages(messages: Message[]): Message[] {
  return messages.map((msg) => ({
    role: ['user', 'system', 'assistant'].includes(msg.role) ? (msg.role as Message['role']) : 'user',
    content: sanitizeMessageContent(msg.content),
  }));
}

// Main ChatbotPanel component
const ChatbotPanelInner: React.FC<ChatbotPanelProps> = ({ data, options, id }) => {
  const theme = useTheme2();
  const styles = getStyles(theme);
  const [inputValue, setInputValue] = useState('');
  const [chat, setChat] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to show the beginning of new messages
  useEffect(() => {
    if (lastMessageRef.current && chatContainerRef.current) {
      // Scroll to the top of the last message to show its beginning
      const containerRect = chatContainerRef.current.getBoundingClientRect();
      const messageRect = lastMessageRef.current.getBoundingClientRect();
      const scrollOffset = messageRect.top - containerRect.top + chatContainerRef.current.scrollTop;
      
      chatContainerRef.current.scrollTop = scrollOffset;
    }
  }, [chat, isLoading]);

  // Cleanup function for useEffect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchGroqData = async (messages: Message[]): Promise<void> => {
    const sanitizedMessages = validateMessages(messages);

    try {
      setIsLoading(true);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await firstValueFrom(
        getBackendSrv().fetch<GroqApiResponse>({
          url: `/api/plugins/bsure-chatbot-panel/resources/groq-chat`,
          method: 'POST',
          data: {
            model: options.llmUsed || 'llama-3.3-70b-versatile',
            messages: sanitizedMessages,
          },
        })
      );

      if (!response?.data?.choices?.[0]?.message) {
        throw new Error('Invalid API response format');
      }

      const messageResponse = response.data.choices[0].message;
      setChat((prevChat) => [...prevChat, messageResponse as Message]);
    } catch (error) {
      console.error('Groq API Error:', error);

      const errorMessage =
        error instanceof Error && error.name === 'AbortError'
          ? 'Request was cancelled'
          : 'Sorry, I encountered an error processing your request. Please ensure GROQ_API_KEY environment variable is set on the Grafana server.';

      setChat((prevChat) => [
        ...prevChat,
        {
          role: 'assistant' as const,
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const submitQuestion = async (): Promise<void> => {
    const trimmedInput = inputValue.trim();

    if (!trimmedInput) {
      return;
    }

    if (trimmedInput.length > VALIDATION_LIMITS.MESSAGE_LENGTH) {
      setChat((prevChat) => [
        ...prevChat,
        {
          role: 'assistant' as const,
          content: `Your message is too long. Please keep it under ${VALIDATION_LIMITS.MESSAGE_LENGTH} characters.`,
        },
      ]);
      return;
    }

    try {
      const userMessage: Message = {
        role: 'user' as const,
        content: trimmedInput,
      };

      if (chat.length === 0) {
        const dashboardUID = data.request?.dashboardUID ?? '';

        // Validate dashboard UID format (basic alphanumeric check)
        if (!dashboardUID || !/^[a-zA-Z0-9_-]+$/.test(dashboardUID)) {
          throw new Error('Invalid dashboard identifier');
        }

        const dashboardData = await extractAndEnrichData(dashboardUID, id, data);

        const initialMessages: Message[] = [
          {
            role: 'system' as const,
            content: `${options.initialChatMessage || ''} This is the data on the dashboard: ${JSON.stringify(
              dashboardData,
              null,
              2
            )}.`,
          },
          userMessage,
        ];

        setChat(initialMessages);
        await fetchGroqData(initialMessages);
      } else {
        const newMessages = [...chat, userMessage];
        setChat(newMessages);
        await fetchGroqData(newMessages);
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      setChat((prevChat) => [
        ...prevChat,
        {
          role: 'assistant' as const,
          content: 'Failed to process your question. Please try again.',
        },
      ]);
    }

    setInputValue('');
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isLoading) {
      void submitQuestion();
    }
  };

  // Filter out system messages for display
  const displayMessages = chat.filter((msg) => msg.role !== 'system');

  return (
    <div className={styles.container}>
      <div ref={chatContainerRef} className={styles.chatContainer} role="log" aria-label="Chat conversation">
        {displayMessages.map((msg, index) => (
          <div
            key={msg.id || `msg-${msg.timestamp || Date.now()}-${index}`}
            ref={index === displayMessages.length - 1 ? lastMessageRef : null}
            className={`${styles.messageContainer} ${
              msg.role === 'user' ? styles.userMessage : styles.assistantMessage
            }`}
          >
            <div
              className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.assistantBubble}`}
              role="article"
              aria-label={`${msg.role} message`}
              dangerouslySetInnerHTML={{ __html: sanitizeMessageContent(msg.content) }}
            />
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.messageContainer} ${styles.assistantMessage}`}>
            <div className={`${styles.messageBubble} ${styles.assistantBubble}`}>
              <span className={styles.loadingSpinner} aria-label="Loading response"></span>
              <span style={{ marginLeft: '8px' }}>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.inputContainer}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          placeholder="Ask me about the dashboard data..."
          className={styles.input}
          aria-label="Type your message"
          aria-describedby="send-button"
        />
        <button
          onClick={() => void submitQuestion()}
          disabled={isLoading || !inputValue.trim()}
          className={styles.sendButton}
          id="send-button"
          aria-label="Send message"
        >
          {isLoading ? <span className={styles.loadingSpinner}></span> : 'Send'}
        </button>
      </div>
    </div>
  );
};

// Export with error boundary
export const ChatbotPanel: React.FC<ChatbotPanelProps> = (props) => (
  <ChatbotErrorBoundary>
    <ChatbotPanelInner {...props} />
  </ChatbotErrorBoundary>
);
