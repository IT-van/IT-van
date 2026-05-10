import { useState, useRef, useEffect } from 'react'
import { parseAdminCommand, executeAdminCommand } from '../../lib/admin'
import useStore from '../../store'

const HELP_TEXT = `Nexus Admin Terminal v1.0
Available commands:
  @admin <you> ban <username>    — Ban user + block device
  @admin <you> unban <username>  — Remove ban
  @admin <you> mute <username>   — Mute user
  @admin <you> unmute <username> — Unmute user
  @admin <you> delete <username> — Delete account
  help                           — Show this message
  clear                          — Clear terminal`

export default function AdminTerminal() {
  const currentUser = useStore((s) => s.currentUser)
  const [history, setHistory] = useState([
    { type: 'system', text: `Nexus Terminal — logged in as ${currentUser?.username}` },
    { type: 'system', text: 'Type "help" for available commands.' },
  ])
  const [input, setInput] = useState('')
  const [cmdHistory, setCmdHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function pushLine(text, type = 'output') {
    setHistory((h) => [...h, { type, text, id: Date.now() + Math.random() }])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cmd = input.trim()
    if (!cmd) return

    pushLine(`$ ${cmd}`, 'input')
    setInput('')
    setCmdHistory((h) => [cmd, ...h.slice(0, 49)])
    setHistIdx(-1)

    if (cmd === 'clear') {
      setHistory([])
      return
    }

    if (cmd === 'help') {
      pushLine(HELP_TEXT, 'system')
      return
    }

    const parsed = parseAdminCommand(cmd)
    if (!parsed) {
      pushLine('⛔ Invalid command. Type "help" for usage.', 'error')
      return
    }

    setLoading(true)
    try {
      const result = await executeAdminCommand(parsed, currentUser)
      pushLine(result.message, result.success ? 'success' : 'error')
    } catch (err) {
      pushLine(`Error: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1)
      setHistIdx(idx)
      setInput(cmdHistory[idx] || '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? '' : cmdHistory[idx] || '')
    }
  }

  return (
    <div className="admin-terminal">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span style={{ background: '#ef4444' }} />
          <span style={{ background: '#f59e0b' }} />
          <span style={{ background: '#22c55e' }} />
        </div>
        <span className="terminal-title">admin@nexus</span>
      </div>

      <div className="terminal-output">
        {history.map((line, i) => (
          <div key={i} className={`t-line t-${line.type}`}>
            {line.text.split('\n').map((l, j) => (
              <div key={j}>{l || '\u00A0'}</div>
            ))}
          </div>
        ))}
        {loading && (
          <div className="t-line t-system">
            <span className="t-cursor">▋</span> executing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="terminal-input-row">
        <span className="t-prompt">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="@admin titanivan2012 ban username"
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
        />
      </form>
    </div>
  )
}
