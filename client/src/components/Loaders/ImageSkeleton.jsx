import React from "react";
import "../../../public/css/skeleton.css";

export default function ImageSkeleton({
  height = 300,
  radius = 16,
}) {
  return (
    <div
      className="skeleton skeleton-img"
      style={{
        height,
        borderRadius: radius,
        width: "100%",
      }}
    />
  );
}
