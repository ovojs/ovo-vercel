import prisma from "../lib/prisma"
import { VercelRequest, VercelResponse } from "@vercel/node"
import { Reply } from ".prisma/client"
import marked from "marked"
import sanitize from "sanitize-html"


export default async function (req: VercelRequest, res: VercelResponse) {
  switch (req.method) {
    case "POST": {
      let reply = req.body as Reply

      reply.content = sanitize(marked(reply.content))

      try {
        reply = await prisma.reply.create({
          data: reply
        })
      } catch (e) {
        console.log(e)
        res.status(500).send(e)
      }

      res.json(reply)
    }; break
    // for CORS
    case "OPTIONS": {
      res.status(200).end()
    }; break
  }
}