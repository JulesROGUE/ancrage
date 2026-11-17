/** One dot per passage of the method: filled when done. */
export default function StepDots({ done, total, small }) {
  return (
    <span className={`step-dots${small ? ' is-small' : ''}`} role="img" aria-label={`${Math.min(done, total)} passage(s) sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < done ? 'is-done' : i === done ? 'is-next' : ''} />
      ))}
    </span>
  );
}
