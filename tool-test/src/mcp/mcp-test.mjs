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
        "/Users/wangdapai/Desktop/code/learn/module/tool-test/src/mcp/my-mcp-server.mjs",
      ],
    },
    "amap-maps-streamableHTTP": {
      url: "https://mcp.amap.com/mcp?key=" + process.env.AMAP_MAPS_API_KEY,
    },
    "file-system": {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        ...(process.env.ALLOWED_PATHS.split(",") || ""),
      ],
    },
    "chrome-devtools": {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest"],
    },
  },
});

const tools = await mcpClients.getTools();

const modelWithTools = model.bindTools(tools);

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(resourceContent),
    new SystemMessage(
      "写文件前请先调用 list_allowed_directories 查看允许写入的目录，然后在允许的目录下创建文件",
    ),
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

        // 确保content属于字符串类型
        let contentStr;
        if (typeof toolResult === "string") {
          contentStr = toolResult;
        } else if (toolResult?.text) {
          // 如果返回对象有text字段，优先使用
          contentStr = toolResult.text;
        }
        messages.push(
          new ToolMessage({
            content: contentStr,
            tool_call_id: toolCal.id,
          }),
        );
        // 解决高德 api频繁调用报错问题
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
await runAgentWithTools(
  "南京南站附近的酒店，以及去的路线,最近的三个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片",
);
// await runAgentWithTools(
//   "南京南站附近的酒店，以及去的路线,路线规划生成文档保存到/Users/wangdapai/Desktop的一个 md文件",
// );
// await runAgentWithTools("南京南站附近的酒店，以及去的路线");
// await runAgentWithTools("查一下用户001的信息");
await mcpClients.close();
