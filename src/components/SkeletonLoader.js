import React from "react"
import "./SkeletonLoader.css"

function SkeletonLoader() {
  return (
    <div className="skeleton-loader">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-input" />
      <div className="skeleton skeleton-input" />
      <div className="skeleton skeleton-button" />
    </div>
  )
}

export default SkeletonLoader
