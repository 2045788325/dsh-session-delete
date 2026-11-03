window.__ModuleLoader__.load({
  id: '@local/dsh-session-delete',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace this half owns. */
    const NS = 'sessionDelete'

    /** The Host route that performs the deletion (see index.js). */
    const DELETE_ROUTE = '/plugin/session-delete/delete'

    /**
     * Visible copy. The Node half never renders text; this half owns it.
     */
    const en = {
      'item.delete': 'Delete session',
      'dialog.title': 'Delete this session?',
      'dialog.body': '“{title}” and its whole history will be permanently deleted. This cannot be undone.',
      'dialog.bodyEmptyTitle': 'This untitled session',
      'dialog.cancel': 'Cancel',
      'dialog.confirm': 'Delete',
      'dialog.pending': 'Removing this session and its saved history…',
      'dialog.working': 'Deleting…',
      'dialog.doneTitle': 'Session deleted',
      'dialog.done': '“{title}” and its saved history were deleted.',
      'dialog.doneLive':
        '“{title}” was deleted, but this run still holds it because its turn is running. Stop it, then delete again.',
      'dialog.emptyTitle': 'Deleted',
      'dialog.running': 'This session is running. Stop it first, then delete it.',
      'dialog.failed': 'Delete failed: {message}',
      'dialog.partial':
        'The session was removed from the list, but its saved history is still on disk: {message}',
    }
    const zh = {
      'item.delete': '删除会话',
      'dialog.title': '删除该会话？',
      'dialog.body': '「{title}」及其全部历史记录将被永久删除，此操作无法撤销。',
      'dialog.bodyEmptyTitle': '该未命名会话',
      'dialog.cancel': '取消',
      'dialog.confirm': '删除',
      'dialog.pending': '正在移除该会话及其已保存的历史记录…',
      'dialog.working': '删除中…',
      'dialog.doneTitle': '已删除',
      'dialog.done': '「{title}」及其已保存的历史记录已删除。',
      'dialog.doneLive':
        '「{title}」已删除，但它的回合正在运行，本次运行仍会保留它。请先停止再删一次。',
      'dialog.emptyTitle': '已删除',
      'dialog.running': '该会话正在运行，请先停止后再删除。',
      'dialog.failed': '删除失败：{message}',
      'dialog.partial': '会话已从列表移除，但磁盘上的历史记录仍在：{message}',
    }

    /**
     * Styles for both entries. Only theme tokens are referenced, so light and
     * dark themes and future token renames degrade appearance, never behavior.
     */
    const CSS = `
.sd-item{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:6px 10px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:18px;text-align:left;cursor:default}
.sd-item:hover{background:var(--dsw-alias-bg-layer-2)}
.sd-item:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.sd-item-glyph{flex:0 0 auto;color:var(--dsw-alias-state-error-primary);display:inline-flex}
.sd-item-danger{color:var(--dsw-alias-state-error-primary)}
.sd-backdrop{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.35)}
.sd-card{width:min(420px,100%);box-sizing:border-box;padding:20px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 16px 48px rgba(0,0,0,.28)}
.sd-title{margin:0 0 8px;font-size:15px;font-weight:600;line-height:22px}
.sd-body{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);word-break:break-word}
.sd-error{margin:10px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)}
.sd-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
.sd-button{appearance:none;font:inherit;font-size:13px;line-height:18px;padding:6px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}
.sd-button:hover{background:var(--dsw-alias-bg-layer-2)}
.sd-button:disabled{opacity:.55;cursor:default}
.sd-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.sd-button-danger{border-color:transparent;background:var(--dsw-alias-state-error-primary);color:#fff}
.sd-button-danger:hover:not(:disabled){background:var(--dsw-alias-state-error-primary);filter:brightness(1.08)}
`

    /**
     * A style element rendered inside a mounted entry: applying the sheet keeps
     * the host's cascade rules unchanged, and unmounting removes it.
     * @returns the style element.
     */
    function StyleTags() {
      return h('style', { 'data-session-delete': '' }, CSS)
    }

    /**
     * Trash glyph drawn for this plugin (no Harness icon package is imported).
     * @param props - size in pixels.
     * @returns the svg element.
     */
    function TrashGlyph({ size }) {
      const s = size ?? 14
      return h(
        'svg',
        {
          width: s,
          height: s,
          viewBox: '0 0 16 16',
          fill: 'none',
          'aria-hidden': true,
          focusable: false,
        },
        h('path', {
          d: 'M3 4.5h10M6 4.5V3.2A1.2 1.2 0 0 1 7.2 2h1.6A1.2 1.2 0 0 1 10 3.2v1.3',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M4.4 4.5l.6 8.1A1.4 1.4 0 0 0 6.4 14h3.2a1.4 1.4 0 0 0 1.4-1.4l.6-8.1',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M6.8 7v4M9.2 7v4',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
        }),
      )
    }

    /**
     * One pending confirmation. The menu row opens it and the frame-wide
     * overlay entry renders it, so both entries read one small store.
     * @returns the store handle.
     */
    function createRequestStore() {
      let current = null
      const listeners = new Set()
      const publish = () => {
        for (const listener of [...listeners]) listener()
      }
      return {
        get: () => current,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        open(request) {
          current = request
          publish()
        },
        close() {
          current = null
          publish()
        },
      }
    }

    /**
     * Subscribe a component to a store without a rendering framework dependency.
     * @param subscribe - the store's subscribe function.
     * @returns a counter that changes on every publication.
     */
    function useStoreVersion(subscribe) {
      const [version, setVersion] = React.useState(0)
      React.useEffect(() => subscribe(() => setVersion((value) => value + 1)), [subscribe])
      return version
    }

    /**
     * Sidebar menu row: the only entry point of this plugin.
     * @param props - the row identity, the menu open state, and this half's copy.
     * @returns the menu row.
     */
    function SessionDeleteMenuItem({ sessionId, displayTitle, useMenuOpenState, requestDelete, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      return h(
        React.Fragment,
        null,
        h(StyleTags),
        h(
          'button',
          {
            type: 'button',
            role: 'menuitem',
            className: 'sd-item sd-item-danger',
            onClick: () => {
              setMenuOpen(false)
              requestDelete(sessionId, displayTitle ?? '')
            },
          },
          h('span', { className: 'sd-item-glyph' }, h(TrashGlyph, { size: 14 })),
          h('span', null, t('item.delete')),
        ),
      )
    }

    /**
     * Frame-wide confirmation dialog.
     * @param props - the request store and this half's copy.
     * @returns the dialog, or null while nothing is pending.
     */
    function SessionDeleteConfirmDialog({ requests, deleteSession, t }) {
      useStoreVersion(requests.subscribe)
      const request = requests.get()
      // idle → busy → done | error. `done` stays visible briefly so the user
      // sees the operation finish instead of watching the row vanish.
      const [phase, setPhase] = React.useState('idle')
      const [outcome, setOutcome] = React.useState({ live: false })
      const [error, setError] = React.useState(null)
      const cancelRef = React.useRef(null)
      const closeTimer = React.useRef(null)

      const open = request !== null
      const sessionId = open ? request.sessionId : null
      const settled = phase === 'busy'

      React.useEffect(() => {
        setPhase('idle')
        setError(null)
        if (closeTimer.current !== null) {
          clearTimeout(closeTimer.current)
          closeTimer.current = null
        }
      }, [sessionId])

      React.useEffect(
        () => () => {
          if (closeTimer.current !== null) clearTimeout(closeTimer.current)
        },
        [],
      )

      React.useEffect(() => {
        if (!open) return undefined
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          if (!settled) requests.close()
        }
        window.addEventListener('keydown', onKeyDown, true)
        cancelRef.current?.focus?.()
        return () => window.removeEventListener('keydown', onKeyDown, true)
      }, [open, settled, requests])

      if (!open) return null

      const title = request.displayTitle === '' ? t('dialog.bodyEmptyTitle') : request.displayTitle

      const confirm = async () => {
        setPhase('busy')
        setError(null)
        const result = await deleteSession(sessionId)
        if (result.ok) {
          setOutcome({ live: result.live === true })
          setPhase('done')
          // A Session that is no longer live is gone from the Host's list, so
          // rebuild the sidebar instead of trusting cached summaries. A live one
          // would come straight back, so leave the page alone in that case.
          if (result.live !== true) {
            closeTimer.current = setTimeout(() => {
              closeTimer.current = null
              requests.close()
              window.location.reload()
            }, 1600)
          }
          return
        }
        setPhase('error')
        setError(result.message)
      }

      /** Heading for the settled state. */
      const doneHeadingKey = () => (outcome.live ? 'dialog.doneTitle' : 'dialog.emptyTitle')

      /** Body for the settled state: a deletion, or the one case that stays live. */
      const doneBodyKey = () => (outcome.live ? 'dialog.doneLive' : 'dialog.done')

      return h(
        React.Fragment,
        null,
        h(StyleTags),
        h(
          'div',
          {
            className: 'sd-backdrop',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget && !settled) requests.close()
            },
          },
          h(
            'div',
            {
              className: 'sd-card',
              role: 'dialog',
              'aria-modal': true,
              'aria-label': t('dialog.title'),
            },
            h(
              'h2',
              { className: 'sd-title' },
              phase === 'done' ? t(doneHeadingKey()) : t('dialog.title'),
            ),
            h(
              'p',
              { className: 'sd-body', role: 'status' },
              phase === 'done'
                ? t(doneBodyKey(), { title })
                : phase === 'busy'
                  ? t('dialog.pending')
                  : t('dialog.body', { title }),
            ),
            error !== null ? h('p', { className: 'sd-error', role: 'alert' }, error) : null,
            phase === 'done'
              ? null
              : h(
                  'div',
                  { className: 'sd-actions' },
                  h(
                    'button',
                    {
                      type: 'button',
                      ref: cancelRef,
                      className: 'sd-button',
                      disabled: settled,
                      onClick: () => requests.close(),
                    },
                    t('dialog.cancel'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'sd-button sd-button-danger',
                      disabled: settled,
                      onClick: () => {
                        void confirm()
                      },
                    },
                    settled ? t('dialog.working') : t('dialog.confirm'),
                  ),
                ),
          ),
        ),
      )
    }

    return {
      name: 'session-delete',
      inject: ['slots', 'locale'],

      apply(ctx) {
        const requests = createRequestStore()

        /**
         * The one deletion path.
         *
         * The Host removes the Session's durable state (stored log directory and
         * projection-cache entry) and then detaches the Agent, so the Session
         * leaves the Harness's in-memory session store as well. With both gone,
         * `sessionController.list()` stops returning it and the row disappears —
         * a real deletion, not an archive.
         *
         * The one case the Host refuses to detach is a Session whose turn is
         * running; that is reported instead of cutting the turn short.
         * @param sessionId - the Session to delete.
         * @returns the outcome the dialog reports.
         */
        const deleteSession = async (sessionId) => {
          let payload = null
          try {
            const response = await fetch(DELETE_ROUTE, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            })
            payload = await response.json().catch(() => null)
            if (!response.ok || payload?.ok !== true) {
              return {
                ok: false,
                message: ctxLocale('dialog.failed', {
                  message: payload?.message ?? `${response.status} ${response.statusText}`,
                }),
              }
            }
          } catch (error) {
            return {
              ok: false,
              message: ctxLocale('dialog.failed', {
                message: error instanceof Error ? error.message : String(error),
              }),
            }
          }

          if (payload.live === true) return { ok: true, live: true }
          return { ok: true, live: false }
        }

        /**
         * Localize one message outside a component render.
         * @param key - dictionary key.
         * @param values - interpolation values.
         * @returns the localized text.
         */
        function ctxLocale(key, values) {
          const translate = ctx.get('locale')?.bind?.(NS)
          if (typeof translate === 'function') {
            const text = translate(key, values)
            if (typeof text === 'string' && text !== '') return text
          }
          const fallback = en[key] ?? key
          return values === undefined
            ? fallback
            : fallback.replace(/\{(\w+)\}/g, (_match, name) => String(values[name] ?? ''))
        }

        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'session-delete: dictionaries')

        ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
          ctx.slots.register(
            {
              name: 'sidebar.workspaces.session.menu.item',
              id: 'session-delete.delete',
              order: 500,
              locale: NS,
              inject: () => ({
                requestDelete: (sessionId, displayTitle) => requests.open({ sessionId, displayTitle }),
              }),
            },
            SessionDeleteMenuItem,
          ),
        )

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'session-delete.confirm',
              locale: NS,
              inject: () => ({ requests, deleteSession }),
            },
            SessionDeleteConfirmDialog,
          ),
        )
      },
    }
  },
})
