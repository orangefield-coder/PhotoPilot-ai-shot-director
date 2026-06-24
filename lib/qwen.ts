import OpenAI from 'openai'

export const qwenClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

export const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen3-vl-72b'
