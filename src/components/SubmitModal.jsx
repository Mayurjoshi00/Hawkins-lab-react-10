import React from 'react';
import './SubmitModal.css';

export default function SubmitModal({ unanswered, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay open">
      <div className="modal">
        <h3>Close the Gate?</h3>
        <p>
          {unanswered > 0
            ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. They'll be marked as skipped. Proceed?`
            : 'All 60 questions answered. Ready to close the gate?'}
        </p>
        <div className="modal-btns">
          <button className="modal-cancel" onClick={onCancel}>Review Again</button>
          <button className="modal-confirm" onClick={onConfirm}>Submit ⬡</button>
        </div>
      </div>
    </div>
  );
}
