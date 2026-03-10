interface StreakWidgetProps {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
}

export default function StreakWidget({ currentStreak, longestStreak, lastActivityDate }: StreakWidgetProps) {
  // Build 7-day activity grid
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const today = new Date().toISOString().split('T')[0]
  const isActiveToday = lastActivityDate === today

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Daily Streak</h3>
        <span className="text-3xl font-extrabold text-orange-500">{currentStreak}</span>
      </div>

      {/* 7-day mini heatmap */}
      <div className="flex gap-1.5">
        {days.map((day) => {
          const isToday = day === today
          const isActive = lastActivityDate !== null && day <= lastActivityDate && day >= (
            // Rough active days estimate based on streak
            new Date(new Date(lastActivityDate).getTime() - (currentStreak - 1) * 86400000)
              .toISOString()
              .split('T')[0]
          )

          return (
            <div
              key={day}
              title={day}
              className={`flex-1 h-6 rounded-sm transition-colors ${
                isToday && isActiveToday
                  ? 'bg-orange-500'
                  : isActive
                  ? 'bg-orange-300'
                  : isToday
                  ? 'bg-gray-100 ring-1 ring-orange-300'
                  : 'bg-gray-100'
              }`}
            />
          )
        })}
      </div>

      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Current: <span className="font-medium text-foreground">{currentStreak} days</span></span>
        <span>Best: <span className="font-medium text-foreground">{longestStreak} days</span></span>
      </div>
    </div>
  )
}
