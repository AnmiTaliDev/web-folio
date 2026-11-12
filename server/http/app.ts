import { ApiError, errorResponse } from '../shared/errors.ts'
import { getMe, postLogin, postLogout, postPassword, postRecover, postRegister } from './auth-routes.ts'
import { postChat } from './chat-routes.ts'
import type { AppDeps, RouteContext } from './context.ts'
import { getBook, getExplanation, getPopular, getSearch } from './book-routes.ts'
import {
  deleteRating,
  deleteWishlist,
  getProfile,
  getRatings,
  getTaste,
  getWishlist,
  patchProfile,
  putProfile,
  putRating,
  putWishlist,
} from './library-routes.ts'
import { getDayBook, getRecommendations } from './recommendation-routes.ts'
import { deleteMe, postSession } from './session-routes.ts'
import { serveStatic } from './static-files.ts'

type Route = { method: string; pattern: RegExp; handler: (ctx: RouteContext) => Promise<Response> }

const routes: Route[] = [
  { method: 'POST', pattern: /^\/api\/session$/, handler: postSession },
  { method: 'DELETE', pattern: /^\/api\/me$/, handler: deleteMe },
  { method: 'GET', pattern: /^\/api\/auth\/me$/, handler: getMe },
  { method: 'POST', pattern: /^\/api\/auth\/register$/, handler: postRegister },
  { method: 'POST', pattern: /^\/api\/auth\/login$/, handler: postLogin },
  { method: 'POST', pattern: /^\/api\/auth\/logout$/, handler: postLogout },
  { method: 'POST', pattern: /^\/api\/auth\/password$/, handler: postPassword },
  { method: 'POST', pattern: /^\/api\/auth\/recover$/, handler: postRecover },
  { method: 'GET', pattern: /^\/api\/books\/search$/, handler: getSearch },
  { method: 'GET', pattern: /^\/api\/books\/popular$/, handler: getPopular },
  { method: 'GET', pattern: /^\/api\/books\/([^/]+)\/explain$/, handler: getExplanation },
  { method: 'GET', pattern: /^\/api\/books\/([^/]+)$/, handler: getBook },
  { method: 'GET', pattern: /^\/api\/recommendations$/, handler: getRecommendations },
  { method: 'GET', pattern: /^\/api\/book-of-day$/, handler: getDayBook },
  { method: 'POST', pattern: /^\/api\/chat$/, handler: postChat },
  { method: 'GET', pattern: /^\/api\/ratings$/, handler: getRatings },
  { method: 'PUT', pattern: /^\/api\/ratings\/([^/]+)$/, handler: putRating },
  { method: 'DELETE', pattern: /^\/api\/ratings\/([^/]+)$/, handler: deleteRating },
  { method: 'GET', pattern: /^\/api\/wishlist$/, handler: getWishlist },
  { method: 'PUT', pattern: /^\/api\/wishlist\/([^/]+)$/, handler: putWishlist },
  { method: 'DELETE', pattern: /^\/api\/wishlist\/([^/]+)$/, handler: deleteWishlist },
  { method: 'GET', pattern: /^\/api\/profile$/, handler: getProfile },
  { method: 'PUT', pattern: /^\/api\/profile$/, handler: putProfile },
  { method: 'PATCH', pattern: /^\/api\/profile$/, handler: patchProfile },
  { method: 'GET', pattern: /^\/api\/taste$/, handler: getTaste },
]

export function createApp(deps: AppDeps, webRoot: string): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url)
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (request.method !== 'GET') {
          throw new ApiError(405, 'method_not_allowed', 'Method not allowed')
        }
        return await serveStatic(webRoot, url.pathname)
      }
      for (const route of routes) {
        const match = route.pattern.exec(url.pathname)
        if (match && route.method === request.method) {
          return await route.handler({ request, url, params: match.slice(1), deps })
        }
      }
      throw new ApiError(404, 'not_found', 'Unknown endpoint')
    } catch (error) {
      return errorResponse(error)
    }
  }
}
