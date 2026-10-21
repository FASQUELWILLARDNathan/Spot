
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middlewares/requireAuth.js'
import { getPreviousPerformance } from './performances.service.js'

export const performancesRouter = Router()

performancesRouter.use(requireAuth)

performancesRouter.get(
  '/previous/:workoutId/:exerciseId',
  async (req, res, next) => {
    try {
      const params = z.object({
        workoutId: z.uuid(),
        exerciseId: z.uuid(),
      }).safeParse(req.params)

      if (!params.success) {
        res.status(400).json({
          error: 'Identifiants invalides',
        })
        return
      }

      const userId = res.locals.user.id as string

      const result = await getPreviousPerformance(
        userId,
        params.data.exerciseId,
        params.data.workoutId,
      )

      if (!result) {
        res.status(404).json({
          error: 'Séance introuvable',
        })
        return
      }

      res.json(result)
    } catch (error) {
      next(error)
    }
  },
)
