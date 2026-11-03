/**
 * Host half of the Session Delete bundle.
 *
 * The Harness ships no Session deletion: `SessionPersistence` has no delete
 * entry point, and `WorkspaceRegistry` only archives Sessions. This Host half
 * owns the one implementation of the missing operation — removing a Session's
 * durable state from the harness home — and exposes it to the browser half
 * through a narrow same-origin HTTP route, because a bundle's Client module
 * has no package-private RPC channel to its own Host half.
 *
 * The route is data-minimal and locked down:
 * - POST only, `application/json` only, and the request `Origin` must equal the
 *   serving `Host`, so a cross-site page cannot reach it (no CORS headers are
 *   ever written, and a JSON body forces a preflight it would fail).
 * - the Session id must match a strict pattern before it is used as a path
 *   component, so the route can never touch anything outside a stored Session.
 *
 * Deleting a Session's durable state means removing its stored log directory
 * and its projection-cache file. Workspace ordering entries are left alone on
 * purpose: the Client half archives the Session first, and a member without a
 * stored Session contributes no row, so a stale id stays inert.
 */

import { readdir, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'session-delete'

/** The Web route the Client half posts one deletion to. */
export const DELETE_ROUTE = '/plugin/session-delete/delete'


/** A stored Session id: one safe path component, never a traversal. */
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

/** Upper bound for the JSON request body. */
const MAX_BODY_BYTES = 4096

/**
 * Resolve the harness home the same way the rest of the Harness does:
 * `$DSH_HOME` wins, otherwise `~/.dsh`.
 * @returns the absolute harness home directory.
 */
function dshHome() {
  const fromEnvironment = process.env.DSH_HOME
  if (typeof fromEnvironment === 'string' && fromEnvironment.trim() !== '') return fromEnvironment.trim()
  return join(homedir(), '.dsh')
}

/**
 * Report whether a path exists at all.
 * @param target - absolute path to test.
 * @returns true when the path is present.
 */
async function exists(target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

/**
 * Remove every durable artifact of one Session.
 *
 * A Session's log lives under `<home>/sessions/<cwd-encoded>/<sessionId>/`; the
 * encoded working-directory directory is discovered by listing instead of
 * re-deriving its encoding, so the deletion keeps working if that encoding
 * changes. The projection cache lives under `<home>/storages/`.
 * @param sessionId - validated Session id.
 * @returns the absolute paths actually removed.
 */
async function removeSessionState(sessionId) {
  const home = dshHome()
  const sessionsRoot = join(home, 'sessions')
  const removed = []

  let groups = []
  try {
    groups = await readdir(sessionsRoot, { withFileTypes: true })
  } catch {
    groups = []
  }

  for (const group of groups) {
    if (!group.isDirectory()) continue
    const sessionDirectory = join(sessionsRoot, group.name, sessionId)
    if (!(await exists(sessionDirectory))) continue
    await rm(sessionDirectory, { recursive: true, force: true })
    removed.push(sessionDirectory)
  }

  const projectionCache = join(home, 'storages', 'session_projcache', 'sessions', `${sessionId}.json`)
  if (await exists(projectionCache)) {
    await rm(projectionCache, { force: true })
    removed.push(projectionCache)
  }

  return removed
}

/**
 * Write one JSON response.
 * @param res - the carrier response.
 * @param status - HTTP status code.
 * @param body - JSON-serializable payload.
 */
function respond(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/**
 * Read a bounded request body.
 * @param req - the carrier request.
 * @returns the body text, or undefined when it exceeded the limit.
 */
async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) return undefined
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Reject a request that a Web page from another site could have made.
 *
 * The real gate against a hostile page is the JSON content type below: a
 * cross-site `fetch` with `application/json` is preflighted, and this route
 * never answers a preflight with CORS headers, while a cross-site form post
 * cannot send that content type at all. This check is defense in depth, so it
 * only refuses the one shape that is both common and unambiguous: a plain
 * `http(s)` page on a different authority.
 *
 * The Desktop shell loads the GUI from its own `dsh-app://` scheme and fetches
 * this route on the loopback carrier, so its `Origin` can never equal the
 * serving host; any non-`http(s)` origin, a missing `Origin`, and the opaque
 * `null` origin are therefore accepted.
 * @param req - the carrier request.
 * @returns false only for a cross-site `http(s)` caller.
 */
function isSameOrigin(req) {
  const origin = req.headers.origin
  const host = req.headers.host
  if (typeof origin !== 'string' || origin === '' || origin === 'null') return true
  let parsed
  try {
    parsed = new URL(origin)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true
  if (typeof host !== 'string') return false
  return parsed.host === host
}


/**
 * Drop a Session from this process, using the Harness's own removal path.
 *
 * Two things keep a deleted Session in `sessionController.list()`: the Session
 * store entry (`ctx.sessions`) and the Agent that owns it. Both have shipped
 * teardown primitives, which this uses instead of inventing a parallel path:
 *
 * - the Agent is cancelled and its scope disposed, exactly as the Agent loop
 *   does for its own agents;
 * - the store entry is detached through `detachEntered(liveEntryFor(session))`,
 *   the same call the store makes when an owning fiber unloads. It removes the
 *   entry and emits `session/disposed`, so subscribers (including the Web UI)
 *   learn the Session is gone.
 *
 * A running Session is not torn down: that would cut a turn the user is
 * watching, so it is reported back instead.
 * @param ctx - the plugin context.
 * @param sessionId - the Session to detach.
 * @returns whether the Session is still live, and why.
 */
async function detachLiveSession(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  const session = sessions?.get(sessionId)
  if (session === undefined) return { live: false, reason: 'not-live' }

  const agent = ctx.get('agents')?.get(sessionId)
  if (agent !== undefined && agent.status === 'running') return { live: true, reason: 'running' }

  try {
    agent?.cancel?.({ kind: 'disposed' }, { keepInbox: true })
    if (agent !== undefined && agent.scope !== undefined && typeof agent.scope.dispose === 'function') {
      await agent.scope.dispose()
    }
  } catch {
    // The store detach below still removes the row; a half-disposed Agent is
    // no worse than the live Session it belongs to.
  }

  try {
    if (typeof sessions.detachEntered === 'function' && typeof sessions.liveEntryFor === 'function') {
      const entry = sessions.liveEntryFor(session)
      if (entry !== undefined) sessions.detachEntered(entry)
    }
  } catch {
    // Fall through to the live check below, which reports the truth.
  }

  const stillLive = sessions.get(sessionId) !== undefined
  return { live: stillLive, reason: stillLive ? 'still-live' : 'detached' }
}

/**
 * Handle one deletion request.
 * @param req - the carrier request.
 * @param res - the carrier response.
 */
async function handleDelete(req, res, ctx) {
  if (req.method !== 'POST') {
    res.writeHead(405, { allow: 'POST' })
    res.end()
    return
  }
  if (!isSameOrigin(req)) {
    respond(res, 403, { ok: false, code: 'forbidden', message: 'Cross-origin requests are not accepted.' })
    return
  }
  const contentType = req.headers['content-type'] ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    respond(res, 415, { ok: false, code: 'unsupported-media-type', message: 'Expected application/json.' })
    return
  }

  const text = await readBody(req)
  if (text === undefined) {
    respond(res, 413, { ok: false, code: 'body-too-large', message: 'Request body is too large.' })
    return
  }

  let request
  try {
    request = JSON.parse(text)
  } catch {
    respond(res, 400, { ok: false, code: 'bad-json', message: 'Request body is not valid JSON.' })
    return
  }

  const sessionId = request?.sessionId
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
    respond(res, 400, { ok: false, code: 'bad-session-id', message: 'A valid sessionId is required.' })
    return
  }

  const runningBefore = ctx.get('agents')?.get(sessionId)?.status === 'running'
  // Detach FIRST, for two reasons: the store entry is what makes
  // `sessionController.list()` (and therefore the sidebar row) keep the Session,
  // and on Windows a directory whose files are still open cannot be removed —
  // the live Session holds `session.lock`, so tearing it down first is what
  // releases the handle. A running Session is left alone (see below).
  const detached = runningBefore
    ? { live: true, detached: false, reason: 'running' }
    : await detachLiveSession(ctx, sessionId)
  const errors = []
  let removed = []
  try {
    removed = await removeSessionState(sessionId)
  } catch (error) {
    // Windows can still refuse a delete while another handle lingers; report it
    // instead of pretending the Session is gone.
    errors.push(error instanceof Error ? error.message : String(error))
  }
  // A Session this process still holds live keeps its summary in
  // `sessionController.list()` after its files are gone, so the row survives
  // until the process ends; a Session that never stored anything (no prompt
  // was ever sent) has nothing to remove at all. Both facts go back to the
  // Client so it can say exactly what happened instead of claiming success.
  respond(res, 200, {
    ok: true,
    sessionId,
    removed,
    removedCount: removed.length,
    // `live` false means the Session is gone from this process as well, which
    // is what makes the row disappear without a restart.
    live: detached.live,
    running: detached.reason === 'running',
    detachReason: detached.reason,
    errors,
  })
}





/**
 * Mount the deletion route.
 *
 * `webServer` is reached through `ctx.inject` rather than a module-level
 * `inject` export: the route is this bundle's only Host dependency, and this
 * form keeps the plugin inert in a composition that serves no Web carrier
 * instead of failing to activate.
 * @param ctx - the plugin context.
 */
export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () =>
        webCtx.webServer.register({
          kind: 'exact',
          path: DELETE_ROUTE,
          handler: (req, res) => {
            handleDelete(req, res, webCtx).catch((error) => {
              webCtx.logger?.warn?.(error)
              if (res.headersSent) {
                res.end()
                return
              }
              respond(res, 500, {
                ok: false,
                code: 'internal',
                message: error instanceof Error ? error.message : String(error),
              })
            })
          },
        }),
      'session-delete: delete route',
    )
  })
}
