import { useState, useCallback, useRef, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'labels' | 'inbox' | 'visualize'
type LabelMode = 'single' | 'batch'

interface Label {
  id: string
  name: string
  color: string
  textColor: string
  count: number
  children?: Label[]
  expanded?: boolean
}

interface Email {
  id: string
  from: string
  subject: string
  preview: string
  labelId?: string
  date: string
  unread: boolean
}

// ─── Gmail Color Palette (exact Gmail label color picker values) ──────────────

const GMAIL_COLORS = [
  // Row 1 — reds → oranges → yellows (11)
  { name: 'Tomato',    bg: '#C0392B', text: '#fff' },
  { name: 'Flamingo',  bg: '#E06666', text: '#fff' },
  { name: 'Burgundy',  bg: '#660000', text: '#fff' },
  { name: 'Pink',      bg: '#FFC0CB', text: '#000' },
  { name: 'Tangerine', bg: '#FF5B33', text: '#fff' },
  { name: 'Mango',     bg: '#FFB347', text: '#000' },
  { name: 'Salmon',    bg: '#FFAD99', text: '#000' },
  { name: 'Peach',     bg: '#FFD9C2', text: '#000' },
  { name: 'Sand',      bg: '#C4A882', text: '#fff' },
  { name: 'Banana',    bg: '#F9E44A', text: '#000' },
  { name: 'Cream',     bg: '#FDFAC2', text: '#000' },
  // Row 2 — greens → teals → blues → purples (11)
  { name: 'Sage',      bg: '#3DAE2B', text: '#fff' },
  { name: 'Fern',      bg: '#6DC06F', text: '#fff' },
  { name: 'Mint',      bg: '#9AD5B9', text: '#000' },
  { name: 'Seafoam',   bg: '#BBE3D5', text: '#000' },
  { name: 'Mist',      bg: '#D2EDE7', text: '#000' },
  { name: 'Basil',     bg: '#1A7270', text: '#fff' },
  { name: 'Blueberry', bg: '#1A6ECC', text: '#fff' },
  { name: 'Peacock',   bg: '#4DA5E8', text: '#fff' },
  { name: 'Sky',       bg: '#A8D4F5', text: '#000' },
  { name: 'Navy',      bg: '#182E65', text: '#fff' },
  { name: 'Grape',     bg: '#5B3086', text: '#fff' },
  // Row 3 — purples → neutrals (6)
  { name: 'Lavender',  bg: '#8B63C0', text: '#fff' },
  { name: 'Wisteria',  bg: '#C8A8DC', text: '#000' },
  { name: 'Petal',     bg: '#F0B8CC', text: '#000' },
  { name: 'Graphite',  bg: '#3A3A3A', text: '#fff' },
  { name: 'Slate',     bg: '#66808E', text: '#fff' },
  { name: 'Silver',    bg: '#CBCBCB', text: '#000' },
]

// ─── Seed Data ───────────────────────────────────────────────────────────────

const INITIAL_LABELS: Label[] = [
  {
    id: 'work', name: 'Work', color: '#1A6ECC', textColor: '#fff', count: 42, expanded: true,
    children: [
      { id: 'invoices',  name: 'Invoices',  color: '#F9E44A', textColor: '#000', count: 8  },
      { id: 'contracts', name: 'Contracts', color: '#8B63C0', textColor: '#fff', count: 14 },
      { id: 'meetings',  name: 'Meetings',  color: '#3A3A3A', textColor: '#fff', count: 6  },
    ],
  },
  {
    id: 'personal', name: 'Personal', color: '#E06666', textColor: '#fff', count: 17, expanded: true,
    children: [
      { id: 'family',  name: 'Family',  color: '#FFD9C2', textColor: '#000', count: 9  },
      { id: 'friends', name: 'Friends', color: '#8B63C0', textColor: '#fff', count: 22 },
    ],
  },
  {
    id: 'travel', name: 'Travel', color: '#FFB347', textColor: '#000', count: 5, expanded: true,
    children: [
      { id: 'bookings',    name: 'Bookings',    color: '#1A6ECC', textColor: '#fff', count: 3 },
      { id: 'itineraries', name: 'Itineraries', color: '#1A7270', textColor: '#fff', count: 2 },
    ],
  },
  {
    id: 'finance', name: 'Finance', color: '#3DAE2B', textColor: '#fff', count: 31, expanded: true,
    children: [
      { id: 'bank',  name: 'Bank',  color: '#182E65', textColor: '#fff', count: 11 },
      { id: 'taxes', name: 'Taxes', color: '#F9E44A', textColor: '#000', count: 7  },
    ],
  },
  { id: 'newsletters', name: 'Newsletters', color: '#5B3086', textColor: '#fff', count: 58 },
  { id: 'receipts',    name: 'Receipts',    color: '#FF5B33', textColor: '#fff', count: 19 },
]

const ALL_EMAILS: Email[] = [
  { id: 'e1',  from: 'Lena Fischer',  subject: 'Q3 budget review attached',         preview: 'Hi, please find the Q3 budget review attached. Let me know if you have any questions.',       labelId: 'work',        date: '2:41 PM',   unread: true  },
  { id: 'e2',  from: 'Shopify',       subject: 'Your invoice #4821 is ready',        preview: 'Your invoice for $149.00 is ready to view. Log in to your account to download it.',          labelId: 'invoices',    date: '1:15 PM',   unread: false },
  { id: 'e3',  from: 'Mom',           subject: 'Thanksgiving plans?',                preview: 'Hey honey, are you coming home for Thanksgiving this year? Dad and I are planning the menu.',  labelId: 'family',      date: '11:02 AM',  unread: false },
  { id: 'e4',  from: 'Marco Rossi',   subject: 'Re: Friday dinner',                  preview: 'Sounds great! I can make it to Nobu at 8. Should I bring anyone?',                            labelId: 'friends',     date: '10:30 AM',  unread: false },
  { id: 'e5',  from: 'Delta Airlines',subject: 'Your flight DL1042 is confirmed',    preview: 'Your booking is confirmed. Flight departs JFK at 07:15 on Nov 14.',                           labelId: 'bookings',    date: 'Nov 8',     unread: false },
  { id: 'e6',  from: 'Chase Bank',    subject: 'Transaction alert: $2,400.00',        preview: 'A charge of $2,400.00 was made to your account ending in 4821 on Nov 8.',                     labelId: 'bank',        date: 'Nov 8',     unread: true  },
  { id: 'e7',  from: 'Substack',      subject: 'Your weekly digest is here',          preview: 'This week: AI breakthroughs, the housing market, and a personal essay on solitude.',         labelId: 'newsletters', date: 'Nov 7',     unread: false },
  { id: 'e8',  from: 'IRS',           subject: 'Important: Tax transcript available', preview: 'Your 2023 tax return transcript is now available for download at irs.gov.',                   labelId: 'taxes',       date: 'Nov 7',     unread: true  },
  { id: 'e9',  from: 'Amazon',        subject: 'Your order has shipped',              preview: 'Your order #114-9823712 has shipped and is expected to arrive by Friday.',                    labelId: 'receipts',    date: 'Nov 6',     unread: false },
  { id: 'e10', from: 'Sarah Kim',     subject: 'Contract revision — please review',   preview: "Hi, I've updated clause 4.2 per your feedback. Could you take another look?",               labelId: 'contracts',   date: 'Nov 6',     unread: true  },
  { id: 'e11', from: 'LinkedIn',      subject: '12 new jobs match your profile',      preview: 'Senior Product Designer at Stripe, Staff Engineer at Airbnb, and 10 more matches.',         labelId: undefined,     date: 'Nov 5',     unread: false },
  { id: 'e12', from: 'Dr. Patel',     subject: 'Appointment reminder — Nov 12',       preview: 'This is a reminder for your appointment on November 12 at 10:00 AM.',                        labelId: undefined,     date: 'Nov 5',     unread: false },
  { id: 'e13', from: 'Airbnb',        subject: 'Your trip to Lisbon is confirmed',    preview: "You're going to Lisbon! Check-in is Dec 2 at 3 PM. Your host Ana is excited to meet you.",  labelId: 'itineraries', date: 'Nov 4',     unread: true  },
  { id: 'e14', from: 'Tom Bradley',   subject: 'Standup notes from today',            preview: 'Quick recap: we decided to push the release to next sprint. Blockers logged in Jira.',       labelId: 'meetings',    date: 'Nov 4',     unread: false },
  { id: 'e15', from: 'Netflix',       subject: 'New on Netflix this week',            preview: "Don't miss the new season of The Crown, plus 8 new films added this week.",                 labelId: undefined,     date: 'Nov 3',     unread: false },
  { id: 'e16', from: 'GitHub',        subject: '[repo] Pull request #42 merged',      preview: 'Pull request #42 "feat: add dark mode support" was merged into main by @jdoe.',             labelId: undefined,     date: 'Nov 3',     unread: false },
  { id: 'e17', from: 'Figma',         subject: 'Emma left a comment on your file',    preview: 'Emma commented: "Love the new navigation — can we try a slightly darker shade here?"',      labelId: 'work',        date: 'Nov 2',     unread: true  },
  { id: 'e18', from: 'Notion',        subject: 'Your workspace is getting full',      preview: "You've used 80% of your free plan storage. Upgrade to continue without interruptions.",      labelId: undefined,     date: 'Nov 1',     unread: false },
  { id: 'e19', from: 'Duolingo',      subject: "You're on a 30-day streak! 🔥",       preview: "Incredible! You've practiced 30 days in a row. Keep it up to hit the monthly badge.",      labelId: 'newsletters', date: 'Oct 29',    unread: false },
  { id: 'e20', from: 'Slack',         subject: 'Missed messages while you were away', preview: 'You have 7 unread messages in #design and 3 in #general since your last visit.',            labelId: undefined,     date: 'Oct 29',    unread: true  },
  { id: 'e21', from: 'Dropbox',       subject: 'Luis shared a folder with you',       preview: 'Luis Garcia shared "Q4 Campaign Assets" with you. Click to view and collaborate.',          labelId: undefined,     date: 'Oct 27',    unread: true  },
  { id: 'e22', from: 'OpenTable',     subject: 'Reservation confirmed: Carbone',      preview: 'Your reservation for 2 at Carbone on Nov 15 at 7:30 PM is confirmed. Enjoy!',              labelId: 'receipts',    date: 'Oct 27',    unread: false },
  { id: 'e23', from: 'Venmo',         subject: 'Chris paid you $45.00',               preview: 'Chris sent you $45.00 for "dinner last Tuesday". Tap to view or cash out.',                 labelId: undefined,     date: 'Oct 25',    unread: false },
  { id: 'e24', from: 'Spotify',       subject: 'Your Wrapped is almost ready',        preview: 'Your 2024 Spotify Wrapped will be revealed soon. Get ready to relive your year in music.',  labelId: 'newsletters', date: 'Oct 23',    unread: false },
  { id: 'e25', from: 'Ben Carter',    subject: 'Lunch tomorrow?',                     preview: 'Hey — free for lunch around the office tomorrow? Thinking tacos or that ramen place.',      labelId: undefined,     date: 'Oct 22',    unread: false },
  { id: 'e26', from: 'Lena Fischer',  subject: 'Re: Q4 planning kickoff',             preview: "Happy to join — I'll send a calendar invite once we confirm the venue.",                   labelId: 'meetings',    date: 'Oct 20',    unread: false },
  { id: 'e27', from: 'Chase Bank',    subject: 'Your statement is ready',             preview: 'Your November statement is now available. Log in to view your transactions.',               labelId: 'bank',        date: 'Oct 18',    unread: false },
  { id: 'e28', from: 'Substack',      subject: 'This week: The future of AI agents',  preview: 'Five essays worth reading, a podcast on agent frameworks, and a tool you should know.',    labelId: 'newsletters', date: 'Oct 14',    unread: false },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flattenLabels(labels: Label[]): Label[] {
  return labels.flatMap(l => [l, ...(l.children ? flattenLabels(l.children) : [])])
}

function getLabelById(labels: Label[], id: string): Label | undefined {
  return flattenLabels(labels).find(l => l.id === id)
}

function isDescendant(labels: Label[], ancestorId: string, childId: string): boolean {
  const anc = flattenLabels(labels).find(l => l.id === ancestorId)
  if (!anc?.children) return false
  return flattenLabels(anc.children).some(l => l.id === childId)
}

function removeFromTree(items: Label[], id: string): [Label[], Label | null] {
  let removed: Label | null = null
  function inner(list: Label[]): Label[] {
    const result: Label[] = []
    for (const item of list) {
      if (item.id === id) { removed = item; continue }
      result.push({ ...item, children: item.children ? inner(item.children) : undefined })
    }
    return result
  }
  return [inner(items), removed]
}

function insertInTree(items: Label[], targetId: string, item: Label, pos: 'before' | 'after' | 'inside'): Label[] {
  const result: Label[] = []
  for (const cur of items) {
    if (cur.id === targetId) {
      if (pos === 'before')  { result.push(item, cur) }
      else if (pos === 'after')  { result.push(cur, item) }
      else { result.push({ ...cur, expanded: true, children: [...(cur.children ?? []), item] }) }
    } else {
      result.push({ ...cur, children: cur.children ? insertInTree(cur.children, targetId, item, pos) : undefined })
    }
  }
  return result
}

// ─── SVG Sunburst ────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle - Math.PI / 2), y: cy + r * Math.sin(angle - Math.PI / 2) }
}

function arcPath(cx: number, cy: number, r1: number, r2: number, a1: number, a2: number) {
  const large = a2 - a1 > Math.PI ? 1 : 0
  const s1 = polarToXY(cx, cy, r1, a1)
  const s2 = polarToXY(cx, cy, r1, a2)
  const e1 = polarToXY(cx, cy, r2, a2)
  const e2 = polarToXY(cx, cy, r2, a1)
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${r1} ${r1} 0 ${large} 1 ${s2.x} ${s2.y}`,
    `L ${e1.x} ${e1.y}`,
    `A ${r2} ${r2} 0 ${large} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LabelDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0 }}
    />
  )
}

interface SelectOption { value: string; label: string; color?: string }

function CustomSelect({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:border-gray-400"
      >
        {selected?.color && <LabelDot color={selected.color} size={8} />}
        <span className={`flex-1 truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {selected?.label ?? placeholder ?? 'Select…'}
        </span>
        <svg viewBox="0 0 16 16" className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="3,6 8,10 13,6" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl py-1 overflow-y-auto max-h-48"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
          {options.map(o => (
            <button
              key={o.value} type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                o.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.color && <LabelDot color={o.color} size={8} />}
              <span className="flex-1 truncate">{o.label}</span>
              {o.value === value && (
                <svg viewBox="0 0 12 12" className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LabelChip({ label }: { label: Label }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: label.color, color: label.textColor }}
    >
      {label.name}
    </span>
  )
}

// ─── Drag handle icon ────────────────────────────────────────────────────────

function GrabHandle() {
  return (
    <svg viewBox="0 0 8 13" width="8" height="13" fill="currentColor">
      {[0, 4].flatMap(x => [1, 5, 9].map(y => (
        <circle key={`${x}-${y}`} cx={x + 2} cy={y + 2} r={1.5} />
      )))}
    </svg>
  )
}

// ─── Drop indicator line ──────────────────────────────────────────────────────

function DropLine({ depth }: { depth: number }) {
  return (
    <div
      className="drop-line pointer-events-none h-0.5 rounded-full mx-2"
      style={{ marginLeft: depth === 0 ? 12 : 28, background: '#3b82f6' }}
    />
  )
}

// ─── Label Tree ──────────────────────────────────────────────────────────────

interface DragOverState { id: string; pos: 'before' | 'after' | 'inside' }

interface TreeDragHandlers {
  onItemDragStart: (id: string) => void
  onItemDragOver: (id: string, pos: DragOverState['pos']) => void
  onItemDrop: (targetId: string) => void
  onItemDragEnd: () => void
}

function LabelTreeItem({
  label, depth = 0, onToggle, onEdit, editingId,
  selectedIds, onSelectToggle, onClearSelection,
  draggingId, dragOver,
  onItemDragStart, onItemDragOver, onItemDrop, onItemDragEnd,
}: {
  label: Label
  depth?: number
  onToggle: (id: string) => void
  onEdit?: (id: string) => void
  editingId?: string | null
  selectedIds?: Set<string>
  onSelectToggle?: (id: string) => void
  onClearSelection?: () => void
  draggingId: string | null
  dragOver: DragOverState | null
} & TreeDragHandlers) {
  const rowRef = useRef<HTMLDivElement>(null)
  const hasChildren = (label.children?.length ?? 0) > 0
  const isDragging = draggingId === label.id
  const isOver = dragOver?.id === label.id
  const isEditing = editingId === label.id
  const isSelected = selectedIds?.has(label.id) ?? false

  const handlers: TreeDragHandlers = { onItemDragStart, onItemDragOver, onItemDrop, onItemDragEnd }

  return (
    <>
      {isOver && dragOver?.pos === 'before' && <DropLine depth={depth} />}
      <div
        ref={rowRef}
        draggable
        onDragStart={e => { e.stopPropagation(); onItemDragStart(label.id) }}
        onDragOver={e => {
          e.preventDefault(); e.stopPropagation()
          const rect = rowRef.current!.getBoundingClientRect()
          const pct = (e.clientY - rect.top) / rect.height
          onItemDragOver(label.id, pct < 0.3 ? 'before' : pct > 0.7 ? 'after' : 'inside')
        }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); onItemDrop(label.id) }}
        onDragEnd={onItemDragEnd}
        onClick={e => {
          e.stopPropagation()
          if (e.shiftKey && onSelectToggle) { onSelectToggle(label.id); return }
          if ((selectedIds?.size ?? 0) > 0 && onClearSelection) { onClearSelection(); return }
          if (onEdit) onEdit(label.id)
        }}
        className={`flex items-center gap-1.5 py-1.5 rounded-md select-none group/row transition-colors cursor-pointer ${
          isDragging ? 'opacity-30' : ''
        } ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : isEditing ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : isOver && dragOver?.pos === 'inside' ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-gray-50'}`}
        style={{ paddingLeft: depth === 0 ? 8 : 20, paddingRight: 12 }}
      >
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); onToggle(label.id) }}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 flex-shrink-0 transition-colors"
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
              {label.expanded ? <polyline points="3,6 8,11 13,6" /> : <polyline points="6,3 11,8 6,13" />}
            </svg>
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <LabelDot color={label.color} />
        <span className={`flex-1 text-sm ${depth === 0 ? 'font-medium text-gray-800' : 'text-gray-700'}`}>
          {label.name}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">{label.count}</span>
      </div>
      {isOver && dragOver?.pos === 'after' && <DropLine depth={depth} />}

      {hasChildren && label.expanded && !isDragging && label.children!.map(child => (
        <LabelTreeItem
          key={child.id} label={child} depth={depth + 1} onToggle={onToggle} onEdit={onEdit} editingId={editingId}
          selectedIds={selectedIds} onSelectToggle={onSelectToggle} onClearSelection={onClearSelection}
          draggingId={draggingId} dragOver={dragOver}
          {...handlers}
        />
      ))}
    </>
  )
}

// ─── Color Picker ────────────────────────────────────────────────────────────

const CP_ROW1 = GMAIL_COLORS.slice(0, 14)
const CP_ROW2 = GMAIL_COLORS.slice(14, 28)

function ColorSwatch({ c, selected, onSelect }: { c: typeof GMAIL_COLORS[0]; selected: string; onSelect: (c: typeof GMAIL_COLORS[0]) => void }) {
  const isSelected = selected === c.bg
  return (
    <button
      title={c.name}
      onClick={() => onSelect(c)}
      className="w-7 h-7 rounded-full flex items-center justify-center focus:outline-none flex-shrink-0 hover:scale-110 transition-transform"
      style={{ backgroundColor: c.bg }}
    >
      {isSelected ? (
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke={c.text} strokeWidth={2.5}>
          <polyline points="2,6 5,9 10,3" />
        </svg>
      ) : (
        <span style={{ color: c.text, fontSize: 12, fontWeight: 500, lineHeight: 1, fontFamily: 'Inter, sans-serif' }}>a</span>
      )}
    </button>
  )
}

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (color: typeof GMAIL_COLORS[0]) => void }) {
  const displayedName = GMAIL_COLORS.find(c => c.bg === selected)?.name ?? ''
  const handleSelect = (c: typeof GMAIL_COLORS[0]) => onSelect(c)

  return (
    <div className="flex flex-col gap-2">
      {/* swatches + custom "+" centered between the two rows */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">{CP_ROW1.map(c => <ColorSwatch key={c.name} c={c} selected={selected} onSelect={handleSelect} />)}</div>
          <div className="flex gap-1.5">{CP_ROW2.map(c => <ColorSwatch key={c.name} c={c} selected={selected} onSelect={handleSelect} />)}</div>
        </div>
        <button
          title="Custom color"
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ border: '1.5px dashed #bbb', background: 'transparent', color: '#aaa' }}
        >
          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="6" y1="1" x2="6" y2="11" />
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </button>
      </div>

      {/* Preview chip — below the grid */}
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors duration-150 whitespace-nowrap w-fit"
        style={{ backgroundColor: selected, color: GMAIL_COLORS.find(c => c.bg === selected)?.text ?? '#fff' }}
      >
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor">
          <path d="M1 6.5 6.5 1H11v4.5L5.5 11 1 6.5ZM8.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" />
        </svg>
        {displayedName}
      </span>
    </div>
  )
}

// ─── Labels View ─────────────────────────────────────────────────────────────

function LabelsView({ labels, onLabelsChange }: { labels: Label[]; onLabelsChange: (l: Label[]) => void }) {
  const [mode, setMode] = useState<LabelMode>('single')
  // Single label form
  const [labelName, setLabelName] = useState('')
  const [selectedColor, setSelectedColor] = useState(GMAIL_COLORS[0])
  const [parentId, setParentId] = useState('none')
  // Batch form
  const [batchParent, setBatchParent] = useState('')
  const [batchChildren, setBatchChildren] = useState('Phase 1\nPhase 2\nInvoices\nArchive')
  const [batchParentId, setBatchParentId] = useState('none')
  const [batchColor, setBatchColor] = useState(GMAIL_COLORS[0])

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<DragOverState | null>(null)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(GMAIL_COLORS[0])
  const [editChildren, setEditChildren] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchSelColor, setBatchSelColor] = useState(GMAIL_COLORS[0])

  const toggleExpanded = useCallback((id: string) => {
    const toggle = (items: Label[]): Label[] =>
      items.map(l => l.id === id ? { ...l, expanded: !l.expanded } : { ...l, children: l.children ? toggle(l.children) : undefined })
    onLabelsChange(toggle(labels))
  }, [labels, onLabelsChange])

  const handleDragStart = useCallback((id: string) => setDraggingId(id), [])
  const handleDragOver = useCallback((id: string, pos: DragOverState['pos']) => {
    setDragOver(prev => prev?.id === id && prev?.pos === pos ? prev : { id, pos })
  }, [])
  const handleDragEnd = useCallback(() => { setDraggingId(null); setDragOver(null) }, [])

  const handleDrop = useCallback((targetId: string) => {
    if (!draggingId || draggingId === targetId) { handleDragEnd(); return }
    if (dragOver?.pos === 'inside' && isDescendant(labels, draggingId, targetId)) { handleDragEnd(); return }
    const [without, item] = removeFromTree(labels, draggingId)
    if (!item) { handleDragEnd(); return }
    onLabelsChange(insertInTree(without, targetId, item, dragOver?.pos ?? 'after'))
    handleDragEnd()
  }, [draggingId, dragOver, labels, onLabelsChange, handleDragEnd])

  const allFlat = flattenLabels(labels)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const applyBatchColor = () => {
    const applyInTree = (items: Label[]): Label[] =>
      items.map(l => ({
        ...l,
        ...(selectedIds.has(l.id) ? { color: batchSelColor.bg, textColor: batchSelColor.text } : {}),
        children: l.children ? applyInTree(l.children) : undefined,
      }))
    onLabelsChange(applyInTree(labels))
    setSelectedIds(new Set())
  }

  function handleCreateSingle() {
    if (!labelName.trim()) return
    const newLabel: Label = {
      id: Date.now().toString(),
      name: labelName.trim(),
      color: selectedColor.bg,
      textColor: selectedColor.text,
      count: 0,
    }
    if (parentId === 'none') {
      onLabelsChange([...labels, newLabel])
    } else {
      const addChild = (items: Label[]): Label[] =>
        items.map(l => l.id === parentId ? { ...l, expanded: true, children: [...(l.children || []), newLabel] } : { ...l, children: l.children ? addChild(l.children) : undefined })
      onLabelsChange(addChild(labels))
    }
    setLabelName('')
  }

  function handleBatchCreate() {
    const names = batchChildren.split('\n').map(s => s.trim()).filter(Boolean)
    if (!names.length) return
    const children: Label[] = names.map(name => ({
      id: Date.now().toString() + Math.random(),
      name, color: batchColor.bg, textColor: batchColor.text, count: 0,
    }))
    if (batchParentId !== 'none') {
      const addChildren = (items: Label[]): Label[] =>
        items.map(l => l.id === batchParentId ? { ...l, expanded: true, children: [...(l.children || []), ...children] } : { ...l, children: l.children ? addChildren(l.children) : undefined })
      onLabelsChange(addChildren(labels))
    } else if (batchParent.trim()) {
      const parent: Label = {
        id: Date.now().toString(),
        name: batchParent.trim(),
        color: batchColor.bg,
        textColor: batchColor.text,
        count: 0,
        expanded: true,
        children,
      }
      onLabelsChange([...labels, parent])
    } else {
      onLabelsChange([...labels, ...children])
    }
    setBatchParent('')
    setBatchChildren('')
  }

  function startEdit(id: string) {
    const found = getLabelById(labels, id)
    if (!found) return
    setEditingLabelId(id)
    setEditName(found.name)
    setEditColor(GMAIL_COLORS.find(c => c.bg === found.color) ?? GMAIL_COLORS[0])
    setEditChildren('')
  }

  function cancelEdit() {
    setEditingLabelId(null)
    setEditChildren('')
  }

  function handleSaveEdit() {
    if (!editingLabelId) return
    const newChildren: Label[] = editChildren.split('\n').map(s => s.trim()).filter(Boolean).map(name => ({
      id: Date.now().toString() + Math.random(), name,
      color: editColor.bg, textColor: editColor.text, count: 0,
    }))
    const updateInTree = (items: Label[]): Label[] =>
      items.map(l => l.id === editingLabelId
        ? {
            ...l,
            name: editName.trim() || l.name,
            color: editColor.bg,
            textColor: editColor.text,
            children: newChildren.length ? [...(l.children ?? []), ...newChildren] : l.children,
            expanded: newChildren.length ? true : l.expanded,
          }
        : { ...l, children: l.children ? updateInTree(l.children) : undefined }
      )
    onLabelsChange(updateInTree(labels))
    cancelEdit()
  }

  const totalLabels = allFlat.length

  return (
    <div className="flex flex-1 gap-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden" onClick={() => cancelEdit()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Labels</span>
          <span className="text-xs text-gray-400">drag to rearrange</span>
        </div>
        <div
          className="flex-1 overflow-y-auto py-2 px-2"
          onDragOver={e => e.preventDefault()}
        >
          {labels.map(label => (
            <LabelTreeItem
              key={label.id} label={label} onToggle={toggleExpanded} onEdit={startEdit} editingId={editingLabelId}
              selectedIds={selectedIds} onSelectToggle={toggleSelect} onClearSelection={() => setSelectedIds(new Set())}
              draggingId={draggingId} dragOver={dragOver}
              onItemDragStart={handleDragStart} onItemDragOver={handleDragOver}
              onItemDrop={handleDrop} onItemDragEnd={handleDragEnd}
            />
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">{selectedIds.size > 0 ? `${selectedIds.size} selected — shift+click to add` : `${totalLabels} labels total`}</div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-8" onClick={() => { cancelEdit(); setSelectedIds(new Set()) }}>
        <div className="max-w-2xl" onClick={e => e.stopPropagation()}>
          {selectedIds.size > 0 ? (
            <div key="batch" className="panel-in">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Change Color</h2>
              <p className="text-sm text-gray-500 mb-6">{selectedIds.size} label{selectedIds.size > 1 ? 's' : ''} selected — shift+click to add or remove.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pick a color</label>
                  <ColorPicker selected={batchSelColor.bg} onSelect={setBatchSelColor} />
                </div>
                <div className="flex gap-3">
                  <button onClick={applyBatchColor} className="btn-primary px-5 py-2 text-sm font-medium rounded-lg">
                    Apply to {selectedIds.size} label{selectedIds.size > 1 ? 's' : ''}
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="btn-secondary px-5 py-2 text-sm font-medium rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : editingLabelId ? (
            <div key="edit" className="panel-in">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={cancelEdit} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="10,3 5,8 10,13" />
                  </svg>
                </button>
                <h2 className="text-2xl font-semibold text-gray-900">Edit Label</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">Update the name, color, or child labels.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Label name</label>
                  <input
                    autoFocus type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') cancelEdit() }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Label color</label>
                  <ColorPicker selected={editColor.bg} onSelect={setEditColor} />
                  {editName && <div className="mt-3"><LabelChip label={{ id: 'p', name: editName, color: editColor.bg, textColor: editColor.text, count: 0 }} /></div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Add child labels <span className="text-gray-400 font-normal">optional · one per line</span>
                  </label>
                  <textarea
                    value={editChildren} onChange={e => setEditChildren(e.target.value)}
                    placeholder={"Sub-label A\nSub-label B"} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveEdit} className="btn-primary px-5 py-2 text-sm font-medium rounded-lg">Save changes</button>
                  <button onClick={cancelEdit} className="btn-secondary px-5 py-2 text-sm font-medium rounded-lg">Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <div key="create" className="panel-in">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Create & Batch Labels</h2>
              <p className="text-sm text-gray-500 mb-6">Organize your inbox quickly with single or hierarchical batch labels.</p>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-8">
                {(['single', 'batch'] as LabelMode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {m === 'single' ? (
                      <><svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="currentColor"><path d="M1 6.5 6.5 1H11v4.5L5.5 11 1 6.5ZM8.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" /></svg> Single Label</>
                    ) : (
                      <><svg viewBox="0 0 14 12" className="w-3.5 h-3.5" fill="currentColor"><path d="M1 6.5 6.5 1H11v4.5L5.5 11 1 6.5ZM8.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" opacity="0.4" transform="translate(2,0)" /><path d="M1 6.5 6.5 1H11v4.5L5.5 11 1 6.5ZM8.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" /></svg> Batch Parent &amp; Children</>
                    )}
                  </button>
                ))}
              </div>
              {mode === 'single' ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Label name</label>
                <input type="text" value={labelName} onChange={e => setLabelName(e.target.value)}
                  placeholder="e.g. Newsletters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && handleCreateSingle()} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Label color</label>
                <ColorPicker selected={selectedColor.bg} onSelect={setSelectedColor} />
                {labelName && <div className="mt-3"><LabelChip label={{ id: 'p', name: labelName, color: selectedColor.bg, textColor: selectedColor.text, count: 0 }} /></div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nest under <span className="text-gray-400 font-normal">optional</span></label>
                <CustomSelect
                  value={parentId} onChange={setParentId}
                  options={[{ value: 'none', label: 'No parent label' }, ...allFlat.map(l => ({ value: l.id, label: l.name, color: l.color }))]}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateSingle} className="btn-primary px-5 py-2 text-sm font-medium rounded-lg">Create label</button>
                <button onClick={() => { handleCreateSingle(); setLabelName('') }} className="btn-secondary px-5 py-2 text-sm font-medium rounded-lg">+ Add another</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 items-stretch">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">1. Parent Label Name</label>
                  <input
                    type="text"
                    value={batchParent}
                    onChange={e => setBatchParent(e.target.value)}
                    placeholder="New Parent (e.g. Projects)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="my-3 flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">or select existing</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="flex-1">
                    <CustomSelect
                      value={batchParentId} onChange={setBatchParentId}
                      options={[{ value: 'none', label: 'None (top-level)' }, ...labels.map(l => ({ value: l.id, label: l.name, color: l.color }))]}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">2. Sub-Labels <span className="text-gray-400 font-normal">(1 per line)</span></label>
                  <p className="text-xs text-gray-400 mb-1.5">Each line will be created as a sub-label under the parent.</p>
                  <textarea
                    value={batchChildren}
                    onChange={e => setBatchChildren(e.target.value)}
                    className="w-full flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">3. Color Preset for Batch</label>
                <ColorPicker selected={batchColor.bg} onSelect={setBatchColor} />
              </div>
              <button
                onClick={handleBatchCreate}
                className="btn-batch flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg"
              >
                <svg viewBox="0 0 14 12" className="w-4 h-4" fill="currentColor"><path d="M1 6.5 6.5 1H11v4.5L5.5 11 1 6.5ZM8.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" opacity="0.4" transform="translate(2,0)" /><path d="M1 6.5 6.5 1H11v4.5L5.5 11 1 6.5ZM8.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" /></svg>
                Batch Create Parent &amp; Children
              </button>
            </div>
          )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Label suggestion heuristics ─────────────────────────────────────────────

function suggestLabels(email: Email, labels: Label[]): Label[] {
  const text = (email.subject + ' ' + email.from + ' ' + email.preview).toLowerCase()
  const all = flattenLabels(labels)
  const rules: [RegExp, string[]][] = [
    [/invoice|receipt|order|shipped|payment|\$\d/, ['invoices', 'receipts', 'finance']],
    [/flight|booking|trip|hotel|airbnb|travel|itinerar/, ['bookings', 'itineraries', 'travel']],
    [/bank|transaction|charge|statement|account/, ['bank', 'finance']],
    [/tax|irs|return|transcript/, ['taxes', 'finance']],
    [/newsletter|digest|weekly|substack|duolingo|spotify|linkedin/, ['newsletters']],
    [/contract|agreement|clause|legal/, ['contracts', 'work']],
    [/meeting|standup|recap|agenda|calendar/, ['meetings', 'work']],
    [/family|mom|dad|holiday|thanksgiving/, ['family', 'personal']],
    [/dinner|friend|nobu|lunch/, ['friends', 'personal']],
  ]
  const hits = new Set<string>()
  for (const [re, ids] of rules) {
    if (re.test(text)) ids.forEach(id => hits.add(id))
  }
  return all.filter(l => hits.has(l.id)).slice(0, 4)
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface CtxMenu { emailId: string; x: number; y: number }

function DraggableLabelChip({ label, onRemove, onDragStart, onDragEnterChip, onDragLeaveChip, onDrop, onDragEnd, isDragging, isOver }: {
  label: Label; onRemove: () => void
  onDragStart: () => void; onDragEnterChip: () => void; onDragLeaveChip: () => void; onDrop: () => void; onDragEnd: () => void
  isDragging: boolean; isOver: boolean
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { e.preventDefault(); onDragEnterChip() } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragLeaveChip() }}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop} onDragEnd={onDragEnd}
      className={`group/chip relative inline-flex items-center cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-30' : ''} ${isOver ? 'ring-2 ring-blue-400 ring-offset-1 rounded-full' : ''}`}
      style={{ transition: 'opacity 0.15s, box-shadow 0.1s' }}
    >
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: label.color, color: label.textColor, paddingRight: 22 }}
      >
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor">
          <path d="M1 6.5 6.5 1H11v4.5L5.5 11 1 6.5ZM8.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" />
        </svg>
        {label.name}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/chip:opacity-100 transition-opacity w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/20"
        style={{ color: label.textColor }}
      >
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>
    </div>
  )
}

function EmailContextMenu({
  menu, emailId, emailLabelIds, labels, onClose, onToggleLabel, onReorderEmailLabels, onReorderGlobalLabels,
}: {
  menu: CtxMenu
  emailId: string
  emailLabelIds: string[]
  labels: Label[]
  onClose: () => void
  onToggleLabel: (emailId: string, labelId: string) => void
  onReorderEmailLabels: (emailId: string, newOrder: string[]) => void
  onReorderGlobalLabels: (newLabels: Label[]) => void
}) {
  const [search, setSearch] = useState('')
  const [chipDragId, setChipDragId] = useState<string | null>(null)
  const [chipDragOver, setChipDragOver] = useState<string | null>(null)
  const [rowDragId, setRowDragId] = useState<string | null>(null)
  const [rowDragOver, setRowDragOver] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const assignedLabels = emailLabelIds.map(id => getLabelById(labels, id)).filter(Boolean) as Label[]
  const mockEmail = { id: emailId, from: '', subject: '', preview: '', date: '', unread: false, labelId: emailLabelIds[0] }
  const suggestions = suggestLabels(mockEmail, labels).filter(l => !emailLabelIds.includes(l.id))

  type TreeRow = { label: Label; depth: number }
  const treeRows: TreeRow[] = []
  for (const l of labels) {
    treeRows.push({ label: l, depth: 0 })
    for (const c of l.children ?? []) treeRows.push({ label: c, depth: 1 })
  }
  const filtered = search
    ? treeRows.filter(r => r.label.name.toLowerCase().includes(search.toLowerCase()))
    : treeRows

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('mousedown', handleClick) }
  }, [onClose])

  const handleChipDrop = (targetId: string) => {
    if (!chipDragId || chipDragId === targetId) return
    const order = [...emailLabelIds]
    const from = order.indexOf(chipDragId)
    const to = order.indexOf(targetId)
    if (from === -1 || to === -1) return
    order.splice(from, 1)
    order.splice(to, 0, chipDragId)
    onReorderEmailLabels(emailId, order)
  }

  const handleRowDrop = (targetId: string) => {
    if (!rowDragId || rowDragId === targetId) return
    const [without, item] = removeFromTree(labels, rowDragId)
    if (!item) return
    onReorderGlobalLabels(insertInTree(without, targetId, item, 'before'))
  }

  const left = Math.min(menu.x, window.innerWidth - 320)
  const top = Math.min(menu.y, window.innerHeight - 520)

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-2xl overflow-hidden"
      style={{ left, top, width: 300, boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.07)' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Assigned labels — draggable chips with hover-X */}
      {assignedLabels.length > 0 && (
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Assigned labels <span className="font-normal normal-case text-gray-300">· drag to reorder</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {assignedLabels.map(l => (
              <DraggableLabelChip
                key={l.id} label={l}
                onRemove={() => onToggleLabel(emailId, l.id)}
                onDragStart={() => setChipDragId(l.id)}
                onDragEnterChip={() => setChipDragOver(l.id)}
                onDragLeaveChip={() => setChipDragOver(prev => prev === l.id ? null : prev)}
                onDrop={() => { handleChipDrop(l.id); setChipDragId(null); setChipDragOver(null) }}
                onDragEnd={() => { setChipDragId(null); setChipDragOver(null) }}
                isDragging={chipDragId === l.id}
                isOver={chipDragOver === l.id && chipDragId !== l.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 pt-3 pb-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggested</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(l => (
              <button key={l.id} onClick={e => { onToggleLabel(emailId, l.id); if (!e.shiftKey) onClose() }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                style={{ backgroundColor: l.color, color: l.textColor }}>
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="currentColor">
                  <path d="M1 6.5 6.5 1H11v4.5L5.5 11 1 6.5ZM8.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" />
                </svg>
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + hierarchical label list */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add label</p>
        <div className="relative mb-2">
          <svg viewBox="0 0 16 16" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="6.5" cy="6.5" r="4" /><line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search labels…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="max-h-48 overflow-y-auto -mx-1">
          {filtered.map(({ label: l, depth }) => {
            const assigned = emailLabelIds.includes(l.id)
            const isRowOver = rowDragOver === l.id
            const isRowDragging = rowDragId === l.id
            return (
              <div
                key={l.id}
                draggable={!search}
                onDragStart={() => setRowDragId(l.id)}
                onDragOver={e => { e.preventDefault(); setRowDragOver(l.id) }}
                onDrop={() => { handleRowDrop(l.id); setRowDragId(null); setRowDragOver(null) }}
                onDragEnd={() => { setRowDragId(null); setRowDragOver(null) }}
                onClick={e => { onToggleLabel(emailId, l.id); if (!e.shiftKey) onClose() }}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer select-none
                  ${assigned ? 'bg-blue-50' : isRowOver ? 'bg-gray-100' : 'hover:bg-gray-50'}
                  ${isRowDragging ? 'opacity-40' : ''}`}
                style={{ paddingLeft: depth === 1 ? 20 : 8 }}
              >
                {depth === 1 && <span className="w-3 text-gray-300 text-xs flex-shrink-0">↳</span>}
                <LabelDot color={l.color} />
                <span className={`flex-1 ${depth === 0 ? 'font-medium text-gray-800' : 'text-gray-600'}`}>{l.name}</span>
                {assigned && (
                  <svg viewBox="0 0 12 12" className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="h-2" />
    </div>
  )
}

// ─── Inbox View ───────────────────────────────────────────────────────────────

function InboxView({ labels, onReorderLabels }: { labels: Label[]; onReorderLabels: (l: Label[]) => void }) {
  const [tab, setTab] = useState<'all' | 'untagged'>('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [emailLabels, setEmailLabels] = useState<Record<string, string[]>>(
    () => Object.fromEntries(ALL_EMAILS.map(e => [e.id, e.labelId ? [e.labelId] : []]))
  )
  const PER_PAGE = 20

  const untagged = ALL_EMAILS.filter(e => !emailLabels[e.id]?.length)
  const displayed = tab === 'all' ? ALL_EMAILS : untagged
  const totalPages = Math.ceil(displayed.length / PER_PAGE)
  const pageEmails = displayed.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleContextMenu = (e: React.MouseEvent, emailId: string) => {
    e.preventDefault()
    setCtxMenu({ emailId, x: e.clientX, y: e.clientY })
  }

  const ctxEmailId = ctxMenu?.emailId ?? null

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white" onClick={() => setCtxMenu(null)}>
      {/* Sub-tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'All mail' },
            { key: 'untagged', label: `Unlabeled (${untagged.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key as 'all' | 'untagged'); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="tabular-nums">{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, displayed.length)} of {displayed.length}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="10,3 5,8 10,13" /></svg>
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6,3 11,8 6,13" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2 border-b border-gray-100"
        style={{ gridTemplateColumns: '160px 1fr 160px 64px' }}>
        <span>From</span>
        <span>Subject</span>
        <span className="pl-3">Label</span>
        <span className="text-right">Date</span>
      </div>

      {/* Email rows */}
      <div className="flex-1 overflow-y-scroll divide-y divide-gray-100">
        {pageEmails.map(email => {
          const labelIds = emailLabels[email.id] ?? []
          const assignedLabels = labelIds.map(id => getLabelById(labels, id)).filter(Boolean) as Label[]
          const expanded = expandedId === email.id
          return (
            <div
              key={email.id}
              onContextMenu={e => handleContextMenu(e, email.id)}
              onClick={e => { e.stopPropagation(); setExpandedId(expanded ? null : email.id); setCtxMenu(null) }}
              className={`px-4 cursor-default select-none ${expanded ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
              style={{ transition: 'background-color 0.2s ease' }}
            >
              <div className="grid items-center py-2.5" style={{ gridTemplateColumns: '160px 1fr 160px 64px' }}>
                <div className="flex items-center gap-2 min-w-0">
                  {email.unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  <span className={`truncate text-sm ${email.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {email.from}
                  </span>
                </div>
                <div className="truncate text-sm min-w-0 pr-4">
                  <span className={email.unread ? 'font-semibold text-gray-900' : 'text-gray-800'}>{email.subject}</span>
                  {!expanded && <span className="text-gray-400 font-normal"> — {email.preview}</span>}
                </div>
                <div className="flex gap-1 flex-wrap px-3">
                  {assignedLabels.map(l => <LabelChip key={l.id} label={l} />)}
                </div>
                <div className="text-xs text-gray-400 text-right tabular-nums">{email.date}</div>
              </div>
              <div className={`email-expand${expanded ? ' open' : ''}`}>
                <div>
                  <div className="pb-3 pl-4 text-sm text-gray-600 leading-relaxed border-t border-blue-100 pt-2">
                    {email.preview}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Context menu */}
      {ctxMenu && ctxEmailId && (
        <EmailContextMenu
          menu={ctxMenu}
          emailId={ctxEmailId}
          emailLabelIds={emailLabels[ctxEmailId] ?? []}
          labels={labels}
          onClose={() => setCtxMenu(null)}
          onToggleLabel={(id, labelId) => setEmailLabels(prev => {
            const cur = prev[id] ?? []
            return { ...prev, [id]: cur.includes(labelId) ? cur.filter(x => x !== labelId) : [...cur, labelId] }
          })}
          onReorderEmailLabels={(id, newOrder) => setEmailLabels(prev => ({ ...prev, [id]: newOrder }))}
          onReorderGlobalLabels={onReorderLabels}
        />
      )}
    </div>
  )
}

// ─── Visualization View ───────────────────────────────────────────────────────

interface SunburstSegment {
  id: string
  name: string
  value: number
  color: string
  parentId?: string
  senders?: { name: string; count: number }[]
}

const SUNBURST_DATA: SunburstSegment[] = [
  { id: 'newsletters', name: 'Newsletters', value: 58, color: '#AB47BC', senders: [{ name: 'Substack', count: 26 }, { name: 'LinkedIn', count: 14 }, { name: 'Duolingo', count: 10 }, { name: 'Spotify', count: 8 }] },
  { id: 'work',        name: 'Work',        value: 42, color: '#3C78D8', senders: [{ name: 'Lena Fischer', count: 11 }, { name: 'Figma', count: 13 }, { name: 'GitHub', count: 10 }, { name: 'Tom Bradley', count: 8 }] },
  { id: 'finance',     name: 'Finance',     value: 31, color: '#6AA84F', senders: [{ name: 'Chase Bank', count: 12 }, { name: 'Shopify', count: 8 }, { name: 'IRS', count: 7 }, { name: 'Venmo', count: 4 }] },
  { id: 'receipts',    name: 'Receipts',    value: 19, color: '#E69138', senders: [{ name: 'Amazon', count: 11 }, { name: 'OpenTable', count: 8 }] },
  { id: 'personal',    name: 'Personal',    value: 17, color: '#E06666', senders: [{ name: 'Mom', count: 9 }, { name: 'Marco Rossi', count: 8 }] },
  { id: 'untagged',    name: 'Untagged',    value: 13, color: '#9CA3AF', senders: [{ name: 'Dr. Patel', count: 3 }, { name: 'Dropbox', count: 5 }, { name: 'Slack', count: 5 }] },
  { id: 'travel',      name: 'Travel',      value: 5,  color: '#45B7AA', senders: [{ name: 'Delta Airlines', count: 3 }, { name: 'Airbnb', count: 2 }] },
]

function VisualizationView() {
  const [hoveredInner, setHoveredInner] = useState<string | null>(null)
  const [hoveredOuter, setHoveredOuter] = useState<{ segId: string; senderName: string } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const cx = 260, cy = 260
  const r0 = 70  // center hole
  const r1 = 145 // inner ring outer
  const r2 = 235 // outer ring outer
  const total = SUNBURST_DATA.reduce((s, d) => s + d.value, 0)
  const GAP = 0.012 // radians gap between segments

  // Compute angles
  let cursor = 0
  const innerSegments = SUNBURST_DATA.map(d => {
    const sweep = (d.value / total) * Math.PI * 2 - GAP
    const start = cursor + GAP / 2
    const end = start + sweep
    cursor += (d.value / total) * Math.PI * 2
    return { ...d, start, end }
  })

  const activeInner = selected || hoveredInner
  const activeSeg = innerSegments.find(s => s.id === activeInner)
  const activeOuter = hoveredOuter

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Email Space</h2>
        <p className="text-sm text-gray-500 mb-8">Visual breakdown of your inbox by label and sender — inspired by DaisyDisk.</p>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col lg:flex-row gap-8">
          {/* SVG Sunburst */}
          <div className="flex-shrink-0 relative">
            <svg width={520} height={520} style={{ overflow: 'visible' }}>
              {/* Outer ring — senders */}
              {innerSegments.map(seg => {
                const senders = seg.senders || []
                const segRange = seg.end - seg.start
                let sCursor = seg.start
                return senders.map(sender => {
                  const sweep = (sender.count / seg.value) * segRange - GAP * 0.3
                  const sStart = sCursor + GAP * 0.15
                  const sEnd = sStart + sweep
                  sCursor += (sender.count / seg.value) * segRange
                  const isHovered = activeOuter?.segId === seg.id && activeOuter?.senderName === sender.name
                  const dimmed = activeInner && activeInner !== seg.id
                  return (
                    <path
                      key={`${seg.id}-${sender.name}`}
                      d={arcPath(cx, cy, r1 + 4, r2, sStart, sEnd)}
                      fill={seg.color}
                      opacity={dimmed ? 0.2 : isHovered ? 1 : 0.7}
                      stroke="white"
                      strokeWidth={1}
                      style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                      onMouseEnter={() => setHoveredOuter({ segId: seg.id, senderName: sender.name })}
                      onMouseLeave={() => setHoveredOuter(null)}
                    />
                  )
                })
              })}

              {/* Inner ring — labels */}
              {innerSegments.map(seg => {
                const isActive = activeInner === seg.id
                const dimmed = activeInner && !isActive
                const outerR = isActive ? r1 + 6 : r1
                return (
                  <path
                    key={seg.id}
                    d={arcPath(cx, cy, r0, outerR, seg.start, seg.end)}
                    fill={seg.color}
                    opacity={dimmed ? 0.25 : 1}
                    stroke="white"
                    strokeWidth={2}
                    style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={() => setHoveredInner(seg.id)}
                    onMouseLeave={() => setHoveredInner(null)}
                    onClick={() => setSelected(selected === seg.id ? null : seg.id)}
                  />
                )
              })}

              {/* Inner ring labels (text on arc) */}
              {innerSegments.map(seg => {
                const mid = (seg.start + seg.end) / 2
                const rMid = (r0 + r1) / 2
                const pos = polarToXY(cx, cy, rMid, mid)
                const pct = ((seg.value / total) * 100)
                if (pct < 5) return null
                return (
                  <text
                    key={seg.id + '-label'}
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={pct > 12 ? 12 : 10}
                    fontWeight={600}
                    fontFamily="Inter, sans-serif"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {pct > 9 ? seg.name : seg.name.slice(0, 3)}
                  </text>
                )
              })}

              {/* Center hole info */}
              <circle cx={cx} cy={cy} r={r0 - 2} fill="white" />
              {activeSeg ? (
                <>
                  <circle cx={cx} cy={cy} r={r0 - 2} fill={activeSeg.color} fillOpacity={0.08} />
                  <text x={cx} y={cy - 14} textAnchor="middle" fontSize={26} fontWeight={700} fontFamily="Inter, sans-serif" fill={activeSeg.color}>{activeSeg.value}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" fontSize={11} fontFamily="Inter, sans-serif" fill="#6B7280">emails</text>
                  <text x={cx} y={cy + 27} textAnchor="middle" fontSize={11} fontWeight={500} fontFamily="Inter, sans-serif" fill="#374151">{activeSeg.name}</text>
                </>
              ) : (
                <>
                  <text x={cx} y={cy - 10} textAnchor="middle" fontSize={30} fontWeight={700} fontFamily="Inter, sans-serif" fill="#1f2328">{total}</text>
                  <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fontFamily="Inter, sans-serif" fill="#6B7280">total emails</text>
                </>
              )}
            </svg>

            {/* Legend ring labels */}
            <div className="mt-2 flex flex-wrap gap-1 max-w-[520px]">
              {SUNBURST_DATA.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelected(selected === d.id ? null : d.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                    selected === d.id ? 'border-gray-400 bg-gray-50' : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name}
                  <span className="text-gray-400 font-normal">{d.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0">
            {activeSeg ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeSeg.color }} />
                  <h3 className="text-lg font-semibold text-gray-900">{activeSeg.name}</h3>
                  <span className="text-sm text-gray-400">{((activeSeg.value / total) * 100).toFixed(1)}%</span>
                </div>
                <div className="space-y-2">
                  {(activeSeg.senders || []).map(sender => {
                    const pct = sender.count / activeSeg.value
                    const isHov = activeOuter?.senderName === sender.name
                    return (
                      <div key={sender.name}
                        className={`p-3 rounded-lg border transition-colors ${isHov ? 'border-gray-300 bg-gray-50' : 'border-gray-100'}`}
                        onMouseEnter={() => setHoveredOuter({ segId: activeSeg.id, senderName: sender.name })}
                        onMouseLeave={() => setHoveredOuter(null)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-800">{sender.name}</span>
                          <span className="text-sm font-semibold tabular-nums" style={{ color: activeSeg.color }}>{sender.count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: activeSeg.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-4">All categories</h3>
                <div className="space-y-2">
                  {[...SUNBURST_DATA].sort((a, b) => b.value - a.value).map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelected(d.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="flex-1 text-sm font-medium text-gray-800">{d.name}</span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }} />
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-gray-600 w-8 text-right">{d.value}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">Click a segment or category to drill down into senders.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('labels')
  const [labels, setLabels] = useState<Label[]>(INITIAL_LABELS)

  const totalLabels = flattenLabels(labels).length

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top nav */}
      <header className="flex items-center gap-6 px-5 py-0 bg-white border-b border-gray-200 flex-shrink-0 h-12">
        <div className="flex items-center gap-2.5">
          {/* Gmail envelope icon */}
          <svg viewBox="0 0 22 18" className="w-5 h-5" fill="none">
            <rect x="1" y="1" width="20" height="16" rx="2" stroke="#EA4335" strokeWidth="1.5" fill="none" />
            <polyline points="1,2 11,10 21,2" stroke="#EA4335" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="text-sm font-bold text-gray-900">Gmail Label Manager</span>
        </div>

        <nav className="flex gap-1 ml-2">
          {([
            { key: 'labels',    label: 'Labels'    },
            { key: 'inbox',     label: 'Inbox'     },
            { key: 'visualize', label: 'Visualize' },
          ] as { key: View; label: string }[]).map(item => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                view === item.key
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

      </header>

      {/* Content */}
      <main className="flex flex-1 overflow-hidden">
        {view === 'labels' && <LabelsView labels={labels} onLabelsChange={setLabels} />}
        {view === 'inbox'  && <InboxView labels={labels} onReorderLabels={setLabels} />}
        {view === 'visualize' && <VisualizationView />}
      </main>
    </div>
  )
}
