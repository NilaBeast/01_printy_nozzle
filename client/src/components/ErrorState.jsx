import React from "react";

export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load the data. Please try again.",
  icon = "😕",
  actionText = "Try Again",
  onAction,
}) {
  return (
    <div className="container py-5">
      <div className="error-card mx-auto text-center">
        <div className="error-icon">{icon}</div>

        <h4 className="mt-3">{title}</h4>

        <p className="error-text">{message}</p>

        {onAction && (
          <button
            className="btn btn-warning text-white mt-3"
            onClick={onAction}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}
