// 调用 mcp
import "dotenv/config";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import chalk from "chalk";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_ENV || "qwen3.8-27b",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const mcpClients = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: [
        "/Users/wangdapai/Desktop/code/learn/module/tool-test/src/my-mcp-server.mjs",
      ],
    },
  },
});

const tools = await mcpClients.getTools();

const modelWithTools = model.bindTools(tools);

async function runAgentWithTools(query, maxIterations = 30) {
  console.log("2");
  const messages = [
    new SystemMessage(resourceContent),
    new HumanMessage(query),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgBlueBright("等待 AI思考" + resourceContent));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n AI最终回复:\n${response.content}\n`);
      return response.content;
    }

    console.log(
      `检查到${response.tool_calls}个工具调用，工具有${response.tool_calls.map((t) => t.name).join(", ")}`,
    );
    // 执行工具调用
    for (const toolCal of response.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCal.name);
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCal.args);
        messages.push(
          new ToolMessage({
            content: toolResult,
            tool_call_id: toolCal.id,
          }),
        );
      }
    }
  }
  return messages[messages.length - 1].content;
}

const res = await mcpClients.listResources();
console.log(res);
let resourceContent = "";
for (const [serverName, resources] of Object.entries(res)) {
  console.log(chalk.bgBlueBright("等待 AI思考" + 111111));
  for (const resource of resources) {
    const content = await mcpClients.readResource(serverName, resource.uri);
    console.log(content);
    resourceContent += content[0].text;
  }
}
await runAgentWithTools("MCP server 的使用指南是什么");
// await runAgentWithTools("查一下用户001的信息");
await mcpClients.close();
