import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { AIChatMessage } from 'langchain/schema';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { DynamicTool } from 'langchain/tools';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';

@Injectable()
export class AppService {
  async generateChatReply() {
    const activityTextParser = StructuredOutputParser.fromNamesAndDescriptions({
      name: "name of user's activity",
      duration: "time duration in seconds of user's activity",
    });
    const activityFormatInstructions =
      activityTextParser.getFormatInstructions();
    const activityPrompt = new PromptTemplate({
      template:
        "Structure the output based on user's input.\n{format_instructions}\n{instruction}",
      inputVariables: ['instruction'],
      partialVariables: { format_instructions: activityFormatInstructions },
    });
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0,
    });
    const activityTool = new DynamicTool({
      name: 'Create activity tool',
      description: 'Uses user input to create activity JSON object',
      func: async (text: string) => {
        const input = await activityPrompt.format({
          instruction: text,
        });
        return input;
      },
    });
    const tools = [activityTool];
    const executor = await initializeAgentExecutorWithOptions(tools, model, {
      agentType: 'chat-conversational-react-description',
      verbose: true,
    });
    const chatHistory = [
      new AIChatMessage(
        'Hi there! I am your productivity assistant, how can I help you today?',
      ),
    ];
    const memory = new BufferMemory({
      chatHistory: new ChatMessageHistory(chatHistory),
      memoryKey: 'chat_history',
      returnMessages: true,
    });
    // executor.memory = memory;
    const res = await executor.call({
      input: 'Create an activity named Reading that lasts for 10 minutes',
    });
    console.log({ res });
    return res;
  }
  catch(error) {
    console.log({ error });
  }
}
