import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { auth } from '../lib/auth'
import { cors } from "hono/cors";

const app = new Hono()

app.use(
  "*",
  cors({
    origin: "http://localhost:3000", 
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get('/', (c) => {
  return c.text('Hello Hono!')
})


serve({
  fetch: app.fetch,
  port: 5000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
