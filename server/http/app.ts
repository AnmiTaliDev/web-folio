import { ApiError, errorResponse } from '../shared/errors.ts'
import { assertSameOrigin, withSecurityHeaders } from './security.ts'
import { deleteSessionRoute, getAccount, postTerms, getMe, getSessions, postLogin, postLogout, postLogoutAll, postPassword, postRecoveryCode, postRecover, postRegister, postUsername } from './auth-routes.ts'
import { getExport } from './export-routes.ts'
import { deleteChatHistory, getChatHistory, postChat } from './chat-routes.ts'
import type { AppDeps, RouteContext } from './context.ts'
import { getBook, getBrowse, getExplanation, getPopular, getSearch, getSimilar } from './book-routes.ts'
import {
  deleteRating,
  deleteShelf,
  deleteWishlist,
  getProfile,
  getRatedBooks,
  getShelf,
  getRatings,
  getTaste,
  getWishlist,
  patchProfile,
  putProfile,
  putRating,
  putShelf,
  putWishlist,
} from './library-routes.ts'
import { getDayBook, getRecommendations } from './recommendation-routes.ts'
import { deleteMe } from './session-routes.ts'
import { getCapabilities } from './system-routes.ts'
import { serveStatic } from './static-files.ts'

type Route = { method: string; pattern: RegExp; handler: (ctx: RouteContext) => Promise<Response> }

const routes: Route[] = [
  { method: 'DELETE', pattern: /^\/api\/me$/, handler: deleteMe },
  { method: 'GET', pattern: /^\/api\/capabilities$/, handler: getCapabilities },
  { method: 'GET', pattern: /^\/api\/me\/export$/, handler: getExport },
  { method: 'GET', pattern: /^\/api\/auth\/me$/, handler: getMe },
  { method: 'POST', pattern: /^\/api\/auth\/logout-all$/, handler: postLogoutAll },
  { method: 'POST', pattern: /^\/api\/auth\/recovery-code$/, handler: postRecoveryCode },
  { method: 'POST', pattern: /^\/api\/auth\/register$/, handler: postRegister },
  { method: 'POST', pattern: /^\/api\/auth\/login$/, handler: postLogin },
  { method: 'POST', pattern: /^\/api\/auth\/logout$/, handler: postLogout },
  { method: 'POST', pattern: /^\/api\/auth\/password$/, handler: postPassword },
  { method: 'POST', pattern: /^\/api\/auth\/username$/, handler: postUsername },
  { method: 'GET', pattern: /^\/api\/auth\/account$/, handler: getAccount },
  { method: 'POST', pattern: /^\/api\/auth\/terms$/, handler: postTerms },
  { method: 'GET', pattern: /^\/api\/auth\/sessions$/, handler: getSessions },
  { method: 'DELETE', pattern: /^\/api\/auth\/sessions\/([^/]+)$/, handler: deleteSessionRoute },
  { method: 'POST', pattern: /^\/api\/auth\/recover$/, handler: postRecover },
  { method: 'GET', pattern: /^\/api\/books\/search$/, handler: getSearch },
  { method: 'GET', pattern: /^\/api\/books\/popular$/, handler: getPopular },
  { method: 'GET', pattern: /^\/api\/books\/browse$/, handler: getBrowse },
  { method: 'GET', pattern: /^\/api\/books\/([^/]+)\/explain$/, handler: getExplanation },
  { method: 'GET', pattern: /^\/api\/books\/([^/]+)\/similar$/, handler: getSimilar },
  { method: 'GET', pattern: /^\/api\/books\/([^/]+)$/, handler: getBook },
  { method: 'GET', pattern: /^\/api\/recommendations$/, handler: getRecommendations },
  { method: 'GET', pattern: /^\/api\/book-of-day$/, handler: getDayBook },
  { method: 'POST', pattern: /^\/api\/chat$/, handler: postChat },
  { method: 'GET', pattern: /^\/api\/chat\/history$/, handler: getChatHistory },
  { method: 'DELETE', pattern: /^\/api\/chat\/history$/, handler: deleteChatHistory },
  { method: 'GET', pattern: /^\/api\/ratings$/, handler: getRatings },
  { method: 'PUT', pattern: /^\/api\/ratings\/([^/]+)$/, handler: putRating },
  { method: 'DELETE', pattern: /^\/api\/ratings\/([^/]+)$/, handler: deleteRating },
  { method: 'GET', pattern: /^\/api\/ratings\/books$/, handler: getRatedBooks },
  { method: 'GET', pattern: /^\/api\/shelf$/, handler: getShelf },
  { method: 'PUT', pattern: /^\/api\/shelf\/([^/]+)$/, handler: putShelf },
  { method: 'DELETE', pattern: /^\/api\/shelf\/([^/]+)$/, handler: deleteShelf },
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
    const isApi = url.pathname.startsWith('/api/')
    try {
      return withSecurityHeaders(request, await dispatch(request, url, isApi, deps, webRoot), isApi)
    } catch (error) {
      return withSecurityHeaders(request, errorResponse(error), isApi)
    }
  }
}

async function dispatch(request: Request, url: URL, isApi: boolean, deps: AppDeps, webRoot: string): Promise<Response> {
  if (!isApi) {
    if (request.method !== 'GET') {
      throw new ApiError(405, 'method_not_allowed', 'Method not allowed')
    }
    return await serveStatic(webRoot, url.pathname)
  }
  assertSameOrigin(request)
  for (const route of routes) {
    const match = route.pattern.exec(url.pathname)
    if (match && route.method === request.method) {
      return await route.handler({ request, url, params: match.slice(1), deps })
    }
  }
  throw new ApiError(404, 'not_found', 'Unknown endpoint')
}
