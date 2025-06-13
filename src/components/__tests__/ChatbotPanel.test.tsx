import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatbotPanel } from '../ChatbotPanel';
import { getBackendSrv } from '@grafana/runtime';
import { useTheme2 } from '@grafana/ui';

// Mock Grafana dependencies
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(),
}));

jest.mock('@grafana/ui', () => ({
  useTheme2: jest.fn(),
}));

// Mock RxJS to avoid complex observable handling in tests
jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn((promise) => promise),
}));

const mockGetBackendSrv = getBackendSrv as jest.MockedFunction<typeof getBackendSrv>;
const mockUseTheme2 = useTheme2 as jest.MockedFunction<typeof useTheme2>;

const mockTheme = {
  colors: {
    primary: {
      main: '#1f77b4',
      contrastText: '#ffffff',
      shade: '#1a5490',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f7f8fa',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
      disabled: '#999999',
    },
    border: {
      weak: '#e7e7e7',
      medium: '#cccccc',
    },
    error: {
      main: '#d73027',
    },
  },
  typography: {
    fontFamily: 'Inter, Arial, sans-serif',
  },
  spacing: { gridSize: 8 },
  shape: { borderRadius: 4 },
  breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 } },
  zIndex: { modal: 1300 },
  transitions: { duration: { short: 150 } },
  isDark: false,
  isLight: true,
  name: 'light',
  visualization: { getColorByName: jest.fn() },
  shadows: ['none'],
  components: {},
};

const defaultProps = {
  id: 1,
  data: {
    series: [],
    request: { dashboardUID: 'test-dashboard-uid' },
    timeRange: { from: '2023-01-01', to: '2023-01-02' },
  } as any,
  timeRange: { from: '2023-01-01', to: '2023-01-02' } as any,
  timeZone: 'browser',
  options: {
    initialChatMessage: 'You are a helpful assistant.',
    llmUsed: 'llama-3.3-70b-versatile',
  },
  onOptionsChange: jest.fn(),
  onFieldConfigChange: jest.fn(),
  onChangeTimeRange: jest.fn(),
  width: 400,
  height: 300,
  fieldConfig: { defaults: {}, overrides: [] } as any,
  transparent: false,
  replaceVariables: jest.fn((str: string) => str),
  eventBus: { subscribe: jest.fn(), publish: jest.fn() } as any,
  renderCounter: 1,
  title: 'Test Chatbot Panel',
};

describe('ChatbotPanel Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme2.mockReturnValue(mockTheme as any);
  });

  describe('Component Rendering', () => {
    it('should render chat interface correctly', () => {
      render(<ChatbotPanel {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Ask me about the dashboard data...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
      expect(screen.getByRole('log', { name: /chat conversation/i })).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      expect(input).toHaveAttribute('aria-label', 'Type your message');
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
      expect(sendButton).toHaveAttribute('id', 'send-button');
      expect(input).toHaveAttribute('aria-describedby', 'send-button');
    });

    it('should apply theme styles', () => {
      render(<ChatbotPanel {...defaultProps} />);
      
      const chatContainer = screen.getByRole('log');
      expect(chatContainer.className).toMatch(/^css-/);
    });
  });

  describe('User Interactions', () => {
    it('should enable send button when user types text', () => {
      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      expect(sendButton).toBeDisabled();
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      expect(sendButton).toBeEnabled();
      
      fireEvent.change(input, { target: { value: '   ' } });
      expect(sendButton).toBeDisabled();
    });

    it('should handle Enter key to send message', async () => {
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
        fetch: jest.fn().mockResolvedValue({
          data: {
            choices: [{ message: { role: 'assistant', content: 'Test response' } }],
          },
        }),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockBackendSrv.fetch).toHaveBeenCalled();
      });
    });

    it('should clear input after sending message', async () => {
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
        fetch: jest.fn().mockResolvedValue({
          data: {
            choices: [{ message: { role: 'assistant', content: 'Test response' } }],
          },
        }),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Chat Functionality', () => {
    it('should display user messages in chat', async () => {
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
        fetch: jest.fn().mockResolvedValue({
          data: {
            choices: [{ message: { role: 'assistant', content: 'AI response' } }],
          },
        }),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Hello chatbot' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hello chatbot')).toBeInTheDocument();
      });
    });

    it('should call dashboard API to enrich data', async () => {
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ 
          dashboard: { 
            panels: [
              { id: 2, title: 'Other Panel', type: 'graph' }
            ] 
          } 
        }),
        fetch: jest.fn().mockResolvedValue({
          data: {
            choices: [{ message: { role: 'assistant', content: 'AI response' } }],
          },
        }),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Analyze the data' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockBackendSrv.get).toHaveBeenCalledWith('/api/dashboards/uid/test-dashboard-uid');
      });
    });

    it('should send correct API payload to backend', async () => {
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
        fetch: jest.fn().mockResolvedValue({
          data: {
            choices: [{ message: { role: 'assistant', content: 'AI response' } }],
          },
        }),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Test question' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockBackendSrv.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/api/plugins/bsure-chatbot-panel/resources/groq-chat',
            method: 'POST',
            data: expect.objectContaining({
              model: 'llama-3.3-70b-versatile',
              messages: expect.arrayContaining([
                expect.objectContaining({
                  role: 'user',
                  content: 'Test question',
                }),
              ]),
            }),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
        fetch: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
      });
    });

    it('should validate message length', async () => {
      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      const longMessage = 'a'.repeat(10001); // Exceeds limit
      fireEvent.change(input, { target: { value: longMessage } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Your message is too long/)).toBeInTheDocument();
      });
    });

    it('should handle invalid dashboard UID', async () => {
      const propsWithInvalidUID = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          request: { dashboardUID: 'invalid@uid!' },
        },
      };

      render(<ChatbotPanel {...propsWithInvalidUID} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to process your question. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during API call', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
        fetch: jest.fn().mockReturnValue(pendingPromise),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Thinking...')).toBeInTheDocument();
        expect(screen.getByLabelText('Loading response')).toBeInTheDocument();
      });
      
      // Resolve to clean up
      resolvePromise!({
        data: {
          choices: [{ message: { role: 'assistant', content: 'Response' } }],
        },
      });
    });

    it('should disable input during loading', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
        fetch: jest.fn().mockReturnValue(pendingPromise),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      render(<ChatbotPanel {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(input).toBeDisabled();
        expect(sendButton).toBeDisabled();
      });
      
      // Resolve to clean up
      resolvePromise!({
        data: {
          choices: [{ message: { role: 'assistant', content: 'Response' } }],
        },
      });
    });
  });

  describe('Configuration Options', () => {
    it('should use custom LLM model from options', async () => {
      const mockBackendSrv = {
        get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
        fetch: jest.fn().mockResolvedValue({
          data: {
            choices: [{ message: { role: 'assistant', content: 'Response' } }],
          },
        }),
      };
      mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

      const customProps = {
        ...defaultProps,
        options: {
          initialChatMessage: 'You are a helpful assistant.',
          llmUsed: 'custom-model',
        },
      };

      render(<ChatbotPanel {...customProps} />);
      
      const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockBackendSrv.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              model: 'custom-model',
            }),
          })
        );
      });
    });
  });

  describe('Security Tests', () => {
    describe('XSS Protection', () => {
      it('should sanitize malicious script tags in message content', async () => {
        const mockBackendSrv = {
          get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
          fetch: jest.fn().mockResolvedValue({
            data: {
              choices: [{
                message: {
                  role: 'assistant',
                  content: '<script>alert("xss")</script>Hello <b>world</b>!'
                }
              }],
            },
          }),
        };
        mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

        render(<ChatbotPanel {...defaultProps} />);
        
        const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
        const sendButton = screen.getByRole('button', { name: /send message/i });
        
        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
          // Should display sanitized content without script tags but keep safe HTML
          expect(screen.getByText(/Hello/)).toBeInTheDocument();
          expect(screen.queryByText(/script/)).not.toBeInTheDocument();
          // Should preserve safe formatting like <b> tags
          const boldElement = screen.getByText('world');
          expect(boldElement.tagName.toLowerCase()).toBe('b');
        });
      });

      it('should remove dangerous attributes from HTML content', async () => {
        const mockBackendSrv = {
          get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
          fetch: jest.fn().mockResolvedValue({
            data: {
              choices: [{
                message: {
                  role: 'assistant',
                  content: '<p onclick="alert(\'xss\')" onload="alert(\'xss\')" style="color:red">Safe text</p>'
                }
              }],
            },
          }),
        };
        mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

        render(<ChatbotPanel {...defaultProps} />);
        
        const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
        const sendButton = screen.getByRole('button', { name: /send message/i });
        
        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
          const textElement = screen.getByText('Safe text');
          expect(textElement).toBeInTheDocument();
          // Should not have dangerous attributes
          expect(textElement).not.toHaveAttribute('onclick');
          expect(textElement).not.toHaveAttribute('onload');
          expect(textElement).not.toHaveAttribute('style');
        });
      });

      it('should prevent iframe and object injections', async () => {
        const mockBackendSrv = {
          get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
          fetch: jest.fn().mockResolvedValue({
            data: {
              choices: [{
                message: {
                  role: 'assistant',
                  content: '<iframe src="javascript:alert(\'xss\')"></iframe><object data="malicious.swf"></object>Clean text'
                }
              }],
            },
          }),
        };
        mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

        render(<ChatbotPanel {...defaultProps} />);
        
        const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
        const sendButton = screen.getByRole('button', { name: /send message/i });
        
        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
          expect(screen.getByText('Clean text')).toBeInTheDocument();
          expect(screen.queryByText(/iframe/)).not.toBeInTheDocument();
          expect(screen.queryByText(/object/)).not.toBeInTheDocument();
        });
      });

      it('should truncate extremely long message content', async () => {
        const longMaliciousContent = '<script>alert("xss")</script>' + 'A'.repeat(15000);
        const mockBackendSrv = {
          get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
          fetch: jest.fn().mockResolvedValue({
            data: {
              choices: [{
                message: {
                  role: 'assistant',
                  content: longMaliciousContent
                }
              }],
            },
          }),
        };
        mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

        render(<ChatbotPanel {...defaultProps} />);
        
        const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
        const sendButton = screen.getByRole('button', { name: /send message/i });
        
        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
          // Should be truncated to 10000 characters max
          const messageElements = screen.getAllByRole('article');
          const assistantMessage = messageElements.find(el => 
            el.getAttribute('aria-label') === 'assistant message'
          );
          expect(assistantMessage?.textContent?.length).toBeLessThanOrEqual(10000);
          // Should not contain script tags
          expect(assistantMessage?.textContent).not.toMatch(/script/);
        });
      });

      it('should sanitize user input when displaying in chat', async () => {
        const mockBackendSrv = {
          get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
          fetch: jest.fn().mockResolvedValue({
            data: {
              choices: [{
                message: {
                  role: 'assistant',
                  content: 'Response to malicious input'
                }
              }],
            },
          }),
        };
        mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

        render(<ChatbotPanel {...defaultProps} />);
        
        const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
        const sendButton = screen.getByRole('button', { name: /send message/i });
        
        const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="alert(\'xss\')">';
        fireEvent.change(input, { target: { value: maliciousInput } });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
          // User message should be displayed but sanitized
          const messageElements = screen.getAllByRole('article');
          const userMessage = messageElements.find(el => 
            el.getAttribute('aria-label') === 'user message'
          );
          expect(userMessage).toBeInTheDocument();
          // Should not contain script tags or dangerous attributes
          expect(userMessage?.textContent).not.toMatch(/script/);
          expect(userMessage?.textContent).not.toMatch(/onerror/);
        });
      });
    });

    describe('Input Validation', () => {
      it('should validate dashboard UID format', async () => {
        const testCases = [
          { uid: '', shouldFail: true },
          { uid: 'valid-uid-123', shouldFail: false },
          { uid: 'invalid@uid!', shouldFail: true },
          { uid: 'valid_uid-123', shouldFail: false },
          { uid: 'uid with spaces', shouldFail: true },
          { uid: 'uid<script>', shouldFail: true },
        ];

        for (const testCase of testCases) {
          const mockBackendSrv = {
            get: jest.fn().mockResolvedValue({ dashboard: { panels: [] } }),
            fetch: jest.fn().mockResolvedValue({
              data: {
                choices: [{ message: { role: 'assistant', content: 'Response' } }],
              },
            }),
          };
          mockGetBackendSrv.mockReturnValue(mockBackendSrv as any);

          const testProps = {
            ...defaultProps,
            data: {
              ...defaultProps.data,
              request: { dashboardUID: testCase.uid },
            },
          };

          const { unmount } = render(<ChatbotPanel {...testProps} />);
          
          const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
          const sendButton = screen.getByRole('button', { name: /send message/i });
          
          fireEvent.change(input, { target: { value: 'Test message' } });
          fireEvent.click(sendButton);
          
          if (testCase.shouldFail) {
            await waitFor(() => {
              expect(screen.getByText('Failed to process your question. Please try again.')).toBeInTheDocument();
            });
            expect(mockBackendSrv.get).not.toHaveBeenCalled();
          } else {
            await waitFor(() => {
              expect(mockBackendSrv.get).toHaveBeenCalledWith(`/api/dashboards/uid/${testCase.uid}`);
            });
          }
          
          unmount();
          jest.clearAllMocks();
        }
      });

      it('should enforce message length limits consistently', async () => {
        render(<ChatbotPanel {...defaultProps} />);
        
        const input = screen.getByPlaceholderText('Ask me about the dashboard data...');
        const sendButton = screen.getByRole('button', { name: /send message/i });
        
        // Test exactly at the limit
        const exactLimitMessage = 'a'.repeat(10000);
        fireEvent.change(input, { target: { value: exactLimitMessage } });
        fireEvent.click(sendButton);
        
        // Should not show length error for exactly 10000 characters
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(screen.queryByText(/Your message is too long/)).not.toBeInTheDocument();
        
        // Test one over the limit
        const overLimitMessage = 'a'.repeat(10001);
        fireEvent.change(input, { target: { value: overLimitMessage } });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
          expect(screen.getByText(/Your message is too long/)).toBeInTheDocument();
        });
      });
    });
  });
});
