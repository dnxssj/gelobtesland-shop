import React from 'react'
import { Link } from 'react-router-dom'

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Gelobtes Land – Honig aus dem Odenwald">
      <img
        className="brand__logo"
        src="/images/gelobtes-land-logo.svg"
        alt="Gelobtes Land – Miel del Odenwald"
      />
    </Link>
  )
}
