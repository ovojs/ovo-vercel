import prisma from '../lib/prisma'
import { Comment, Reply } from '.prisma/client'
import { VercelRequest, VercelResponse } from '@vercel/node'
import marked from "marked"
import sanitize from 'sanitize-html'


interface CommentReplies extends Comment { replies?: Reply[] }

export default async function (req: VercelRequest, res: VercelResponse) {
  switch (req.method) {
    case "GET": {
      const { domain, path, page } = req.query

      if (!page || !domain || !path) {
        res.status(400).end()
        return
      }

      const take = 10
      const skip = +page * take

      let comments: CommentReplies[]
      let replies: Reply[]

      try {
        comments = await prisma.comment.findMany({
          where: {
            domain: domain as string,
            path: path as string
          },
          orderBy: { id: "desc" },
          skip, take
        })
      } catch (e) {
        res.status(500).send(e)
      }

      const cids = comments.map(v => v.id)

      try {
        replies = await prisma.reply.findMany({
          where: {
            cid: {
              in: cids
            }
          },
          orderBy: {id: "desc"}
        })
      } catch (e) {
        res.status(500).send(e)
      }

      const maps = new Map<Number, Reply[]>()
      replies.forEach(v => {
        if (!maps.has(v.cid)) maps.set(v.cid, [])
        maps.get(v.cid).push(v)
      })

      comments.forEach(v => v.replies = maps.get(v.id))

      res.json({
        comments,
        done: comments.length < take
      })

    }; break

    case "POST": {
      let comment = req.body as Comment

      comment.content = sanitize(marked(comment.content))

      try {
        comment = await prisma.comment.create({
          data: comment
        })
      } catch (e) {
        res.status(500).send(e)
      }

      res.json(comment)
    }; break
  }
};