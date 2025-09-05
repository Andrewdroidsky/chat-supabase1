// app/api/chat/route.ts
import 'server-only'
import { StreamingTextResponse } from 'ai'
import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/db_types'

export const runtime = 'nodejs' // ← ВАЖНО: чтобы cookies работали стабильно

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: Request) {
  // Supabase с прокидыванием cookies для текущей сессии
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })

  // Текущий пользователь
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = user.id

  // Тело запроса
  const { messages, previewToken, id } = await req.json()

  const openai = previewToken ? new OpenAI({ apiKey: previewToken }) : client

  // System prompt
  const systemPrompt = {
    role: 'system',
    content: `Ты AI Ментор — мудрый советчик и коуч по развитию карьеры, личности и бизнеса.
- Дай практичные, структурированные ответы на русском.
- Используй списки, примеры, пошаговые планы.
- Завершай ответ 1–2 вопросами для размышления.`,
  }

  const messagesWithSystem = [systemPrompt, ...messages]

  // Стримим ответ от модели
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messagesWithSystem,
    stream: true,
  })

  let fullResponse = ''
  const encoder = new TextEncoder()

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const piece = chunk.choices[0]?.delta?.content
          if (piece) {
            fullResponse += piece
            controller.enqueue(encoder.encode(piece))
          }
        }

        // --- Сохранение в БД (две записи в messages) ---
        const conversationId =
          id && /^[0-9a-fA-F-]{36}$/.test(id) ? id : crypto.randomUUID()

        const userText = messages[messages.length - 1]?.content ?? ''

        const rows = [
          {
            id: crypto.randomUUID(),
            user_id: userId,
            conversation_id: conversationId,
            role: 'user' as const,
            content: userText,
          },
          {
            id: crypto.randomUUID(),
            user_id: userId,
            conversation_id: conversationId,
            role: 'assistant' as const,
            content: fullResponse,
          },
        ]

        const { error: insertErr } = await supabase.from('messages').insert(rows)
        if (insertErr) {
          console.error('Insert messages error:', insertErr)
        }

        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })

  return new StreamingTextResponse(readableStream)
}