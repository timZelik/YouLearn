interface StreakWidgetProps {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function StreakWidget({ currentStreak, longestStreak, lastActivityDate }: StreakWidgetProps) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = DAY_LABELS[d.getDay()]

    const isToday = dateStr === todayStr
    const isActive =
      lastActivityDate !== null &&
      dateStr <= lastActivityDate &&
      dateStr >=
        new Date(new Date(lastActivityDate).getTime() - (currentStreak - 1) * 86400000)
          .toISOString()
          .split('T')[0]

    return { dateStr, dayLabel, isToday, isActive }
  })

  const isActiveToday = lastActivityDate === todayStr

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Daily Streak</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl">🔥</span>
          <span className="text-2xl font-extrabold text-orange-500 dark:text-orange-400 tabular-nums">
            {currentStreak}
          </span>
        </div>
      </div>

      {/* 7-day heatmap */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {days.map(({ dateStr, dayLabel, isToday, isActive }) => {
            let bg = 'bg-muted'
            if (isToday && isActiveToday) bg = 'bg-orange-500 dark:bg-orange-500'
            else if (isActive) bg = 'bg-orange-300 dark:bg-orange-700'
            else if (isToday) bg = 'bg-muted ring-1 ring-orange-400'

            return (
              <div key={dateStr} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-7 w-full rounded-md transition-colors ${bg}`} title={dateStr} />
                <span className="text-[9px] text-muted-foreground font-medium">{dayLabel}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between border-t border-border pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Current</span>
          <span className="text-sm font-semibold">{currentStreak} days</span>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-xs text-muted-foreground">Best</span>
          <span className="text-sm font-semibold">{longestStreak} days</span>
        </div>
      </div>
    </div>
  )
}
