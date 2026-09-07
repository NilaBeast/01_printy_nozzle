import React from "react";
import "../../../public/css/skeleton.css";

export default function SkeletonCard({
  image = true,
  imageHeight = 180,
  avatar = false,
  lines = 2,
  rounded = 16,
}) {
  return (
    <div className="skeleton-card">
      {/* IMAGE */}
      {image && (
        <div
          className="skeleton skeleton-media"
          style={{ height: imageHeight, borderRadius: rounded }}
        />
      )}

      {/* BODY */}
      <div className="skeleton-body">
        {avatar && (
          <div className="skeleton skeleton-avatar" />
        )}

        <div className="skeleton skeleton-title" />

        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton skeleton-text" />
        ))}
      </div>
    </div>
  );
}
