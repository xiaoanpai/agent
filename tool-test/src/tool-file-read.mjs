import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import fs from "node:fs/promises";
import { z } from "zod";
//**
// 整体流程：
// 1 初始化大模型
// 2 创建工具函数，并绑定到模型
// 3 设定人设以及用户问题
// 4 执行第一轮调用，并放到历史中，拿到tool_calls,存在则代表大模型想要继续执行
// 5 循环tool_calls，依次调用对应的工具，并拿到执行的结果
// 6 将工具执行结果以及工具 id存储到历史会话
// 7 根据历史记录再次调用，并输出最终结果 */

const model = new ChatOpenAI({
  modelName: process.env.MODEL_ENV || "",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, "utf-8");
    console.log(`工具调用 ${filePath} 成功读取：${content.length}字节`);
    return content;
  },
  {
    name: "read_file",
    description:
      "用此工具来读取文件内容，当用户要求读取文件，查看代码，分析文件内容时，调用此工具。输入文件路径（可以是相对或者绝对路径）",
    schema: z.object({
      filePath: z.string().describe("要读取的文件路径"),
    }),
  },
);

const tools = [readFileTool];

const modelWithTools = model.bindTools(tools);

const messages = [
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。
    工作流程：
    1 用户要求读取文件时，立即调用read_file工具
    2 等待工具返回文件内容
    3 基于文件内容进行分析和解释

    可用工具：
     - read_file:读取文件内容（使用此工具来获取文件内容）
    `),
  new HumanMessage("请读取src/tool-file-read.mjs文件内容并解释代码"),
];

let response = await modelWithTools.invoke(messages);
console.log(response);
messages.push(response);

while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`\n 检查到${response.tool_calls.length} 个工具调用`);

  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name); //查找工具
      if (!tool) {
        return `错误：找不到工具 ${toolCall.name}`;
      }
      console.log(
        `执行工具：${toolCall.name}(${JSON.stringify(toolCall.args)})`,
      );

      try {
        const res = await tool.invoke(toolCall.args);
        return res;
      } catch (err) {
        return `错误： ${err.message}`;
      }
    }),
  );

  // 将工具结果添加到消息历史
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      }),
    );
  });
  // 再次调用模型，传入工具结果
  response = await modelWithTools.invoke(messages);
  console.log(messages);
  console.log("/n 最终回复");
  console.log(response.content);
}
