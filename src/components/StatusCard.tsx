// One counter tile on the department home page (e.g. "รออนุมัติ 3").
// Keeps the original markup (span / strong / b) so the existing CSS applies unchanged,
// and makes every tile keyboard-accessible (previously only one of seven was).
interface StatusCardProps {
  tone: string;          // CSS modifier: waiting, not-approved, repairing, ...
  icon: string;
  label: string;
  count: number;
  onOpen: () => void;
}

export default function StatusCard({ tone, icon, label, count, onOpen }: StatusCardProps) {
  return (
    <div
      className={`status-card ${tone}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <span>{icon}</span>
      <strong>{label}</strong>
      <b>{count}</b>
    </div>
  );
}
