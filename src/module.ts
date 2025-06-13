import { PanelPlugin } from '@grafana/data';
import { ChatbotPanel } from './components/ChatbotPanel';

export const plugin = new PanelPlugin(ChatbotPanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'initialChatMessage',
      name: 'Initial chat message',
      description:
        'Enter the initial text for the groq API (optional). At the end of the command the dashboard data will be inserted.',
      defaultValue: '',
    })
    .addTextInput({
      path: 'llmUsed',
      name: 'LLM model name',
      description: 'Define the LLM model that should be used when making the API call to groq.',
      defaultValue: 'llama-3.3-70b-versatile',
    });
});
