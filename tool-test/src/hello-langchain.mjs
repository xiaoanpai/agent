import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();
const model = new ChatOpenAI({
  modelName: process.env.MODEL_ENV || "qwen3.8-27b",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const res = await model.invoke("介绍一下自己");
console.log(res.content);
