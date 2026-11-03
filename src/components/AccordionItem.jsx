// src/components/AccordionItem.jsx
import { useState } from 'react'

function AccordionItem({ icon, title, subtitle, children, defaultOpen = false, danger = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`accordion-item ${danger ? 'danger' : ''}`}>
      <button type="button" className="accordion-header" onClick={() => setOpen(!open)}>
        <div className="accordion-header-right">
          <span className="accordion-icon">{icon}</span>
          <div className="accordion-titles">
            <span className="accordion-title">{title}</span>
            {subtitle && <span className="accordion-subtitle">{subtitle}</span>}
          </div>
        </div>
        <span className={`accordion-chevron ${open ? 'open' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      <div className={`accordion-body ${open ? 'open' : ''}`}>
        <div className="accordion-body-inner">{children}</div>
      </div>
    </div>
  )
}

export default AccordionItem