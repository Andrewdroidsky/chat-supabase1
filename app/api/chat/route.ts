import "server-only"
import { StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { Database } from "@/lib/db_types"
import { auth } from "@/auth"
import { nanoid } from "@/lib/utils"
import { revalidatePath } from "next/cache"

export const runtime = "edge"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })
  const { messages, previewToken, id } = await req.json()
  const userId = (await auth({ cookieStore }))?.user.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const openaiClient = previewToken ? new OpenAI({ apiKey: previewToken }) : client

  const stream = await openaiClient.responses.stream({
    model: "gpt-5-nano",
    input: messages,
  })

  let fullResponse = ''
  const encoder = new TextEncoder()
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // Handle different event types from responses.stream
          if (chunk.type === 'response.content_part.done') {
            const content = chunk.part && 'text' in chunk.part ? chunk.part.text : ''
            if (content) {
              fullResponse = content
              // Send as plain text for useChat
              controller.enqueue(encoder.encode(content))
            }
          }
        }
        
        // Save to database when streaming is complete
        console.log('Saving to database...')
        console.log('userId:', userId)
        console.log('fullResponse:', fullResponse.substring(0, 100))
        
        const title = messages[0].content.substring(0, 100)
        const chatId = id ?? nanoid()
        const createdAt = Date.now()
        const path = `/chat/${chatId}`
        const payload = {
          id: chatId,
          title,
          userId,
          createdAt,
          path,
          messages: [...messages, { role: "assistant", content: fullResponse }],
        }
        
        console.log('Payload:', JSON.stringify(payload, null, 2))
        
        try {
          const result = await supabase.from("chats").upsert({ 
            id: chatId, 
            user_id: userId, 
            payload 
          })
          console.log('Database result:', result)
          if (result.error) {
            console.error('Database error:', result.error)
          } else {
            // Revalidate the homepage to update sidebar
            revalidatePath('/')
          }
        } catch (error) {
          console.error('Save error:', error)
        }
        
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })

  return new StreamingTextResponse(readableStream)
}