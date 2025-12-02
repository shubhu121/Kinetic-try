import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

export interface LiveSessionCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onError: (error: Error) => void;
  onExpansionUpdate: (value: number) => void;
}

const setExpansionTool: FunctionDeclaration = {
  name: 'setExpansion',
  parameters: {
    type: Type.OBJECT,
    description: 'Sets the expansion level of the 3D particle system based on hand gestures.',
    properties: {
      level: {
        type: Type.NUMBER,
        description: 'The expansion level from 0.0 (closed/contracted) to 1.0 (open/expanded).',
      },
    },
    required: ['level'],
  },
};

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private currentSession: any = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(callbacks: LiveSessionCallbacks) {
    try {
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            callbacks.onOpen();
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls (The primary control mechanism)
            if (message.toolCall) {
              const responses = [];
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'setExpansion' && typeof fc.args.level === 'number') {
                  callbacks.onExpansionUpdate(fc.args.level);
                  
                  responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: "ok" }
                  });
                }
              }

              // Acknowledge the tool calls
              if (this.currentSession && responses.length > 0) {
                 // The API expects an array of function responses if there were multiple calls, 
                 // or a single structure. The safest for the SDK is often passing the structure 
                 // that matches the toolCall structure.
                 // Based on rules, we send one by one or batched.
                 // Let's send them.
                 for (const response of responses) {
                    this.currentSession.sendToolResponse({
                        functionResponses: [response]
                    });
                 }
              }
            }
          },
          onclose: () => {
            console.log('Gemini Live Session Closed');
            callbacks.onClose();
            this.currentSession = null;
          },
          onerror: (e) => {
            console.error('Gemini Live Error', e);
            callbacks.onError(new Error("Session error"));
            this.currentSession = null;
          },
        },
        config: {
          responseModalities: [Modality.AUDIO], // Required by API
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [setExpansionTool] }],
        },
      });

      this.currentSession = await this.sessionPromise;
      return this.currentSession;
    } catch (error) {
      console.error("Failed to connect to Gemini Live:", error);
      callbacks.onError(error as Error);
      throw error;
    }
  }

  async sendFrame(base64Data: string) {
    if (!this.currentSession) return;
    try {
      await this.currentSession.sendRealtimeInput({
        media: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    } catch (e) {
      console.error("Error sending frame:", e);
    }
  }

  async sendAudio(base64PcmData: string) {
    if (!this.currentSession) return;
    try {
      await this.currentSession.sendRealtimeInput({
        media: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64PcmData
        }
      });
    } catch (e) {
      console.error("Error sending audio:", e);
    }
  }

  disconnect() {
    if(this.currentSession) {
       // Close handled by letting the object gc or if there was a close method
    }
    this.currentSession = null;
    this.sessionPromise = null;
  }
}

export const geminiLiveService = new GeminiLiveService();