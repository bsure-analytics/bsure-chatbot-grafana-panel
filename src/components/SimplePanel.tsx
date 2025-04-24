import React, { useState } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { PanelProps, PanelData } from '@grafana/data';

interface Props extends PanelProps {}

interface PanelNew {
  id?: Number;
  title?: string;
  description?: string;
  type?: string;
}

interface Message {
  content: string;
  role: string;
}


async function ExtractAndEnrichData(dashboardId: String, currentPannelId: Number, data: PanelData){

  const dashboardData = await getBackendSrv().get(`/api/dashboards/uid/${dashboardId}`);
  let result: PanelNew[] = [];
  dashboardData.dashboard.panels.forEach((panel: any) => {
    if(panel){
      if(panel.id !== currentPannelId){
        result.push({
          description: panel.description ?? "",
          title: panel.title ?? "",
          type: panel.type ?? "",
          id: panel.id,
        })
      }
    }
  })

  const enrichedData = data.series.map((panel) => {
    if (!panel.meta || !Array.isArray(panel.fields)) {return null;}
    let metaData = result.find(item => item.id === 1);

    return {
      ...metaData,
      data: panel.fields.map((field) => ({
        name: field.name,
        type: field.type,
        values: field.values
      }))
    };
  }).filter(Boolean);

  return enrichedData;

}




export const SimplePanel: React.FC<Props> = ({ data, options, id }) => {
  console.log(data)
  const [inputValue, setInputValue] = useState(""); 
  const [chat, setChat] = useState<Message[]>([])

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await ExtractAndEnrichData(data.request?.dashboardUID ?? "", id, data);
      console.log(result);
    };
    fetchData();
  }, [data, data.request?.dashboardUID, id]);

  const fetchGroqData = async (messages: Message[]) => {
    const apiKey = options.groqApiKey; 

  
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: options.llmUsed,
            messages: messages
        })
    });

    const data_response = await response.json();
    const messageResponse = data_response.choices[0].message
    setChat(value => {
        const newValue = [...value];
        newValue.push(messageResponse);
        return newValue;
    });    
  };

  async function submitQuestion() {

    if(chat.length === 0){
      const dashboardData = await ExtractAndEnrichData(data.request?.dashboardUID ?? "", id, data);
            
      const initialMessages: Message[] = [
          {
              role: "system",
              content: `${options.initalChatMessage} This is the data on the dashboard: ${JSON.stringify(dashboardData, null, 2)}.`
          },
          {
              role: "user",
              content: inputValue
          }
      ];
      setChat(initialMessages);
      fetchGroqData(initialMessages);
    }else{
      const furtherMessages: Message[] = [
        ...chat,
        {
          role: "user",
          content: inputValue
        }
      ];
      setChat(furtherMessages);
      fetchGroqData(furtherMessages)
    }

    setInputValue(''); // Reset the input field
  }

  // Get the correct data source dynamically
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', borderRadius: '5px' }}>
        {chat.slice(1).map((msg, index) => (
          <div key={index} style={{ marginBottom: '5px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <span style={{ background: msg.role === 'user' ? '#007bff' : '#ccc', color: msg.role === 'user' ? 'white' : 'black', padding: '5px 10px', borderRadius: '10px', display: 'inline-block' }}>
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', padding: '10px', borderTop: '1px solid black' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <button onClick={submitQuestion} style={{ marginLeft: '10px', padding: '8px 15px', borderRadius: '5px', background: '#007bff', color: 'white', border: 'none' }}>
          Send
        </button>
      </div>
    </div>
  );
  
};
