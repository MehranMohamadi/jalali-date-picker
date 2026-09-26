// Register independently of Vue so a later release can recover broken app startup.
if ('serviceWorker' in navigator && location.protocol === 'https:' && location.hostname !== 'localhost') {
  window.budgetyarWorker = navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
  window.budgetyarWorker.catch(() => {})
  const check = () => window.budgetyarWorker.then(registration => registration.update()).catch(() => {})
  setInterval(check, 180000)
  addEventListener('pageshow', check)
  addEventListener('online', check)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check() })
}
