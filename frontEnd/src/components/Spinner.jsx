export default function Spinner({ fullScreen = false, size = 32 }) {
  const ring = (
    <div
      className="spin rounded-full border-4 border-slate-700 border-t-blue-500"
      style={{ width: size, height: size }}
    />
  );
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020617] z-50">
        {ring}
      </div>
    );
  }
  return <div className="flex items-center justify-center p-6">{ring}</div>;
}
