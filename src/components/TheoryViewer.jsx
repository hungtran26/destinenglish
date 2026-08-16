/**
 * TheoryViewer — renders structured theory content.
 *
 * Handles: headings, paragraphs, formatted text (bold/italic),
 * tables, lists, tips, examples, dividers.
 */

// ─────────────────────────────────────────
// Render bold/italic/strikethrough markers in text
// ─────────────────────────────────────────

function renderFormattedText(text) {
  if (!text) return null

  // Split on bold (**...**), italic (*...*), strikethrough (~~...~~)
  // Process in order: bold first, then italic, then strikethrough
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Find the next marker
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
    const strikeMatch = remaining.match(/~~(.+?)~~/)

    // Find earliest match
    let earliest = null
    let earliestType = null
    let earliestIndex = remaining.length

    if (boldMatch && boldMatch.index < earliestIndex) {
      earliest = boldMatch
      earliestType = "bold"
      earliestIndex = boldMatch.index
    }
    if (italicMatch && italicMatch.index < earliestIndex) {
      earliest = italicMatch
      earliestType = "italic"
      earliestIndex = italicMatch.index
    }
    if (strikeMatch && strikeMatch.index < earliestIndex) {
      earliest = strikeMatch
      earliestType = "strike"
      earliestIndex = strikeMatch.index
    }

    if (!earliest) {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }

    // Text before the marker
    if (earliest.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, earliest.index)}</span>)
    }

    // The marked text
    const inner = earliest[1]
    if (earliestType === "bold") {
      parts.push(<strong key={key++}>{inner}</strong>)
    } else if (earliestType === "italic") {
      parts.push(<em key={key++}>{inner}</em>)
    } else if (earliestType === "strike") {
      parts.push(<del key={key++}>{inner}</del>)
    }

    remaining = remaining.slice(earliest.index + earliest[0].length)
  }

  return parts
}

// ─────────────────────────────────────────
// Block Renderers
// ─────────────────────────────────────────

function HeadingBlock({ block }) {
  const level = block.level || 2
  const Tag = `h${level}`
  return <Tag className={`theory-heading theory-h${level}`}>{block.text}</Tag>
}

function ParagraphBlock({ block }) {
  return <p className="theory-paragraph">{block.text}</p>
}

function FormattedParagraphBlock({ block }) {
  return <p className="theory-paragraph">{renderFormattedText(block.text)}</p>
}

function TableBlock({ block }) {
  const headers = block.headers || []
  const rows = block.rows || []
  return (
    <div className="theory-table-wrapper">
      <table className="theory-table">
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{renderFormattedText(h)}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{renderFormattedText(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListBlock({ block }) {
  const Tag = block.ordered ? "ol" : "ul"
  return (
    <Tag className={`theory-list ${block.ordered ? "theory-list-ordered" : "theory-list-unordered"}`}>
      {(block.items || []).map((item, i) => (
        <li key={i}>{renderFormattedText(item)}</li>
      ))}
    </Tag>
  )
}

function TipBlock({ block }) {
  const style = block.style || "info"
  const icons = { info: "💡", warning: "⚠️", note: "📝" }
  return (
    <div className={`theory-tip theory-tip-${style}`}>
      <span className="theory-tip-icon">{icons[style]}</span>
      <span className="theory-tip-text">{renderFormattedText(block.text)}</span>
    </div>
  )
}

function ExampleBlock({ block }) {
  const isCorrect = block.correct !== false
  return (
    <div className={`theory-example ${isCorrect ? "theory-example-correct" : "theory-example-wrong"}`}>
      <span className="theory-example-icon">{isCorrect ? "✓" : "✗"}</span>
      <span className="theory-example-text">{renderFormattedText(block.text)}</span>
    </div>
  )
}

function DividerBlock() {
  return <hr className="theory-divider" />
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────

function TheoryBlock({ block }) {
  switch (block.type) {
    case "heading": return <HeadingBlock block={block} />
    case "paragraph": return <ParagraphBlock block={block} />
    case "formatted_paragraph": return <FormattedParagraphBlock block={block} />
    case "table": return <TableBlock block={block} />
    case "list": return <ListBlock block={block} />
    case "tip": return <TipBlock block={block} />
    case "example": return <ExampleBlock block={block} />
    case "divider": return <DividerBlock />
    default: return null
  }
}

export default function TheoryViewer({ theory, compact = false }) {
  if (!theory || !theory.theory) return null

  const { title, subtitle, sections } = theory.theory

  return (
    <div className={`theory-viewer ${compact ? "theory-viewer-compact" : ""}`}>
      <div className="theory-header">
        {title && <h2 className="theory-title">{title}</h2>}
        {subtitle && <p className="theory-subtitle">{subtitle}</p>}
      </div>

      {(sections || []).map((section, sIdx) => (
        <div key={sIdx} className="theory-section">
          {section.title && (
            <h3 className="theory-section-title">{section.title}</h3>
          )}
          <div className="theory-section-content">
            {(section.blocks || []).map((block, bIdx) => (
              <TheoryBlock key={bIdx} block={block} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
